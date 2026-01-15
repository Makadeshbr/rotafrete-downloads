// src/store/useDespesasStore.ts
// ============================================
// ROTAFRETE - Store de Despesas Unificado
// ============================================
// [FIX 02/01/2026] Correções aplicadas:
//   1. Padronização: usa `motoristaId` em TODOS os filtros
//   2. Consolidado todas as despesas: manutenção, combustível, pedágios, outros
//   3. Tratamento de erros melhorado
// ============================================

import { create } from 'zustand';
import { getDb } from '@aether-baas/react-native';
import { startOfWeek, endOfWeek, format, parseISO } from 'date-fns';
import { createSafeSubscriptionHandler } from '@/utils/safeSubscribe';

// ============================================
// TIPOS
// ============================================

export type TipoDespesa = 'MANUTENCAO' | 'COMBUSTIVEL' | 'PEDAGIO' | 'OUTROS';

export interface Despesa {
    id?: string;
    motoristaId: string;
    tipo: TipoDespesa;
    valor: number;
    descricao: string;
    data: string; // ISO date

    // Campos Opcionais (Polimorfismo para suportar todos os tipos na mesma collection)
    parteVeiculo?: string; // Manutenção

    // Combustível
    litros?: number;
    precoLitro?: number;
    tipoCombustivel?: 'GASOLINA' | 'ETANOL' | 'DIESEL';
    kmOdometro?: number;
    posto?: string;

    // Pedágio
    rodovia?: string;
    praca?: string;

    semana?: string; // Ex: "2024-W01" para agrupar por semana
    ownerId?: string; // Mantido para compatibilidade, mas motoristaId é o campo principal
    createdAt?: string;
    updatedAt?: string;

    // Campos de migração (identificam registros vindos de collections antigas)
    legacyId?: string;
    legacyCollection?: string;
    dataRegistro?: string; // Data real quando `data` é stripped pelo backend
}

export interface ResumoDespesasSemana {
    inicioSemana: string;
    fimSemana: string;
    combustivel: number;
    pedagio: number;
    manutencao: number;
    outros: number;
    total: number;
    items: Despesa[];
}

interface DespesasStore {
    despesas: Despesa[];
    resumoSemanal: ResumoDespesasSemana | null;
    isLoading: boolean;
    error: string | null;
    lastUpdated: number; // [REALTIME] Timestamp para forçar re-render

    // Ações
    adicionarDespesa: (input: Omit<Despesa, 'id' | 'createdAt' | 'updatedAt' | 'semana'>) => Promise<Despesa | null>;
    fetchDespesasPorPeriodo: (motoristaId: string, inicio: Date, fim: Date) => Promise<void>;
    fetchDespesasSemana: (motoristaId: string, dataReferencia?: Date) => Promise<void>;
    getTotalPorCategoria: () => Record<TipoDespesa, number>;
    deletarDespesa: (id: string) => Promise<boolean>;
    migrarDadosLegados: (motoristaId: string) => Promise<number>;
    limparDadosMigrados: (motoristaId: string) => Promise<number>; // [NEW] Limpa registros migrados
    subscribeToChanges: (motoristaId: string) => () => void;
    clearError: () => void;
}

const COLLECTION_NAME = 'despesas';

// Helper para calcular código da semana
function getWeekCode(date: Date): string {
    const year = date.getFullYear();
    const weekStart = startOfWeek(date, { weekStartsOn: 5 }); // Sexta
    const weekNum = Math.ceil((weekStart.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
    return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

// ============================================
// STORE
// ============================================

export const useDespesasStore = create<DespesasStore>((set, get) => ({
    despesas: [],
    resumoSemanal: null,
    isLoading: false,
    error: null,
    lastUpdated: Date.now(), // [REALTIME] Inicializa com timestamp atual

    // ========================================
    // ADICIONAR DESPESA
    // ========================================
    adicionarDespesa: async (input) => {
        try {
            set({ isLoading: true, error: null });
            const db = getDb();

            console.log('[DESPESAS] Iniciando criação:', input);

            const dataDate = parseISO(input.data);
            const semana = getWeekCode(dataDate);

            // [FIX] motoristaId já vem do input via spread
            const novaDespesa: Omit<Despesa, 'id'> = {
                ...input,
                semana,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            console.log('[DESPESAS] Dados a salvar:', novaDespesa);

            const result = await db.collection(COLLECTION_NAME).create(novaDespesa);

            console.log('[DESPESAS] Resultado do create:', result);

            if (result) {
                const despesaCriada = { ...novaDespesa, id: result.id } as Despesa;
                set(state => {
                    // [FIX] Evita duplicatas se o Realtime já inseriu
                    if (state.despesas.some(d => d.id === result.id)) {
                        console.log('[DESPESAS] ⚠️ Item já existe na lista (Realtime foi mais rápido), ignorando add local.');
                        return state;
                    }
                    return {
                        despesas: [despesaCriada, ...state.despesas],
                        isLoading: false,
                    };
                });
                console.log('[DESPESAS] ✅ Despesa salva com sucesso! ID:', result.id);
                return despesaCriada;
            }

            console.log('[DESPESAS] ⚠️ Resultado sem ID');
            set({ isLoading: false });
            return null;
        } catch (error: any) {
            console.error('[DESPESAS] ❌ Erro ao criar:', error);
            set({ error: error.message, isLoading: false });
            return null;
        }
    },

    // ========================================
    // BUSCAR DESPESAS POR PERÍODO
    // [FIX] Corrigido: usa motoristaId ao invés de ownerId
    // ========================================
    fetchDespesasPorPeriodo: async (motoristaId, inicio, fim) => {
        try {
            set({ isLoading: true, error: null });
            const db = getDb();

            const inicioStr = format(inicio, 'yyyy-MM-dd');
            const fimStr = format(fim, 'yyyy-MM-dd');

            // [FIX 02/01/2026] Usa motoristaId no filtro para compatibilidade com Rules V1
            // ANTES (bugado): filter: { ownerId: motoristaId }
            // DEPOIS (correto): filter: { motoristaId }
            const results = await db.collection(COLLECTION_NAME).list({
                filter: { motoristaId },
                sort: { field: 'createdAt', order: 'DESC' },
                limit: 500,
            });

            // Filtra por período no cliente (mais flexível)
            const rawData = (results as any)?.data ?? results ?? [];
            const allDespesas = (Array.isArray(rawData) ? rawData : []) as Despesa[];
            const despesasFiltradas = allDespesas.filter((d) => {
                const dataOrigem = d.dataRegistro || d.data || d.createdAt || '';
                const dataStr = dataOrigem.split('T')[0];
                return dataStr >= inicioStr && dataStr <= fimStr;
            });

            set({ despesas: despesasFiltradas, isLoading: false, lastUpdated: Date.now() });
            console.log('[DESPESAS] Carregadas:', despesasFiltradas.length, 'de', inicioStr, 'a', fimStr);
        } catch (error: any) {
            console.error('[DESPESAS] Erro ao buscar:', error);
            set({ error: error.message, isLoading: false });
        }
    },

    // ========================================
    // BUSCAR DESPESAS DA SEMANA
    // [FIX] Corrigido: usa motoristaId ao invés de ownerId
    // ========================================
    fetchDespesasSemana: async (motoristaId, dataReferencia = new Date()) => {
        try {
            set({ isLoading: true, error: null });
            const db = getDb();

            // Semana de trabalho: Sexta a Quinta
            const weekStart = startOfWeek(dataReferencia, { weekStartsOn: 5 });
            const weekEnd = endOfWeek(dataReferencia, { weekStartsOn: 5 });

            const inicioStr = format(weekStart, 'yyyy-MM-dd');
            const fimStr = format(weekEnd, 'yyyy-MM-dd');

            console.log('[DESPESAS] 🔍 Buscando para motorista:', motoristaId);
            console.log('[DESPESAS] 🔍 Período:', inicioStr, 'a', fimStr);

            // [FIX 02/01/2026] Usa motoristaId no filtro para compatibilidade com Rules V1
            // ANTES (bugado): filter: { ownerId: motoristaId }
            // DEPOIS (correto): filter: { motoristaId }
            const results = await db.collection(COLLECTION_NAME).list({
                filter: { motoristaId },
                sort: { field: 'createdAt', order: 'DESC' },
                limit: 200,
            });

            console.log('[DESPESAS] 📦 Resultado bruto da API:', results);

            // Filtra por semana
            const rawData = (results as any)?.data ?? results ?? [];
            console.log('[DESPESAS] 📦 Raw data extraído:', rawData);

            const allDespesas = (Array.isArray(rawData) ? rawData : []) as Despesa[];
            console.log('[DESPESAS] 📋 Total de despesas encontradas:', allDespesas.length);

            if (allDespesas.length > 0) {
                console.log('[DESPESAS] 📋 Primeira despesa:', allDespesas[0]);
            }

            const despesasSemana = allDespesas.filter((d) => {
                const dataOrigem = d.dataRegistro || d.data || d.createdAt || '';
                const dataStr = dataOrigem.split('T')[0];
                const dentroSemana = dataStr >= inicioStr && dataStr <= fimStr;
                console.log('[DESPESAS] 🔎 Verificando:', d.tipo, dataStr, dentroSemana ? '✅' : '❌');
                return dentroSemana;
            });

            // Calcula totais por categoria
            const combustivel = despesasSemana
                .filter(d => d.tipo === 'COMBUSTIVEL')
                .reduce((sum, d) => sum + d.valor, 0);

            const pedagio = despesasSemana
                .filter(d => d.tipo === 'PEDAGIO')
                .reduce((sum, d) => sum + d.valor, 0);

            const manutencao = despesasSemana
                .filter(d => d.tipo === 'MANUTENCAO')
                .reduce((sum, d) => sum + d.valor, 0);

            const outros = despesasSemana
                .filter(d => d.tipo === 'OUTROS')
                .reduce((sum, d) => sum + d.valor, 0);

            const resumo: ResumoDespesasSemana = {
                inicioSemana: inicioStr,
                fimSemana: fimStr,
                combustivel,
                pedagio,
                manutencao,
                outros,
                total: combustivel + pedagio + manutencao + outros,
                items: despesasSemana,
            };

            set({
                despesas: despesasSemana,
                resumoSemanal: resumo,
                isLoading: false
            });

            console.log('[DESPESAS] Semana:', inicioStr, '-', fimStr);
            console.log('[DESPESAS] Resumo:', {
                combustivel,
                pedagio,
                manutencao,
                outros,
                total: resumo.total
            });

        } catch (error: any) {
            console.error('[DESPESAS] Erro ao buscar semana:', error);
            set({ error: error.message, isLoading: false });
        }
    },

    // ========================================
    // TOTAIS POR CATEGORIA
    // ========================================
    getTotalPorCategoria: () => {
        const { despesas } = get();
        return despesas.reduce((acc, d) => {
            acc[d.tipo] = (acc[d.tipo] || 0) + d.valor;
            return acc;
        }, {} as Record<TipoDespesa, number>);
    },

    // ========================================
    // DELETAR DESPESA
    // ========================================
    deletarDespesa: async (id) => {
        try {
            set({ isLoading: true, error: null });
            const db = getDb();

            // [FIX] Use direct DB call compatible with updated RLS rules
            await db.collection(COLLECTION_NAME).delete(id);

            set(state => ({
                despesas: state.despesas.filter(d => d.id !== id),
                isLoading: false,
            }));

            return true;
        } catch (error: any) {
            console.error('[DESPESAS] Erro ao deletar:', error);
            set({ error: error.message, isLoading: false });
            return false;
        }
    },

    // ========================================
    // LIMPAR DADOS MIGRADOS
    // Deleta todas as despesas que possuem legacyId (foram migradas)
    // Útil para re-executar migração após correções
    // ========================================
    limparDadosMigrados: async (motoristaId) => {
        console.log('[DESPESAS] 🗑️ Limpando dados migrados para:', motoristaId);

        try {
            set({ isLoading: true, error: null });
            const db = getDb();
            let totalRemovidos = 0;

            // Busca todas as despesas do usuário que têm legacyId
            const result = await db.collection(COLLECTION_NAME).list({
                filter: { motoristaId },
                limit: 1000,
            });
            const rawData = (result as any)?.data ?? result ?? [];
            const despesas = Array.isArray(rawData) ? rawData : [];

            // Filtra apenas as que foram migradas (possuem legacyId)
            const migradas = despesas.filter((d: any) => d.legacyId);
            console.log(`[DESPESAS] Encontradas ${migradas.length} despesas migradas para remover`);

            for (const despesa of migradas) {
                try {
                    // [FIX] Direct DB call
                    await db.collection(COLLECTION_NAME).delete(despesa.id);

                    totalRemovidos++;
                    console.log(`[DESPESAS] ✓ Removida despesa legacyId=${despesa.legacyId}`);
                } catch (err: any) {
                    console.warn(`[DESPESAS] Falha ao remover ${despesa.id}:`, err?.message);
                }
            }

            console.log(`[DESPESAS] ✅ Limpeza concluída! ${totalRemovidos} registros removidos.`);

            // Atualiza state local
            set(state => ({
                despesas: state.despesas.filter(d => !d.legacyId),
                isLoading: false,
            }));

            return totalRemovidos;
        } catch (error: any) {
            console.error('[DESPESAS] ❌ Erro na limpeza:', error);
            set({ error: error.message, isLoading: false });
            return 0;
        }
    },

    // ========================================
    // MIGRAR DADOS LEGADOS
    // Busca dados das collections antigas (abastecimentos, pedagios)
    // e copia para a collection unificada 'despesas'
    // ========================================
    migrarDadosLegados: async (motoristaId) => {
        console.log('[DESPESAS] 🔄 Iniciando migração de dados legados para:', motoristaId);

        try {
            set({ isLoading: true, error: null });
            const db = getDb();
            let totalMigrados = 0;

            // Helper para buscar de collection legada com tratamento de erro
            // [FIX] Tenta múltiplos campos de usuário já que collections antigas podem usar diferentes nomes
            const fetchLegacyCollection = async (collectionName: string): Promise<any[]> => {
                const userIdFields = ['motoristaId', 'userId', 'ownerId', 'user_id'];

                for (const field of userIdFields) {
                    try {
                        console.log(`[DESPESAS] Tentando buscar ${collectionName} com ${field}=${motoristaId}`);
                        const result = await db.collection(collectionName).list({
                            filter: { [field]: motoristaId },
                            limit: 500,
                        });
                        const data = (result as any)?.data ?? result ?? [];
                        const items = Array.isArray(data) ? data : [];

                        if (items.length > 0) {
                            console.log(`[DESPESAS] ✅ Encontrados ${items.length} registros em ${collectionName} usando campo ${field}`);
                            return items;
                        }
                    } catch (error: any) {
                        console.warn(`[DESPESAS] Falha ao buscar ${collectionName} com ${field}:`, error?.message);
                    }
                }

                // Se nenhum campo funcionou, tenta buscar TODOS e filtrar localmente
                try {
                    console.log(`[DESPESAS] Tentando buscar TODOS de ${collectionName} e filtrar localmente...`);
                    const result = await db.collection(collectionName).list({ limit: 500 });
                    const data = (result as any)?.data ?? result ?? [];
                    const items = Array.isArray(data) ? data : [];

                    // Filtra localmente por qualquer campo de usuário
                    const filtered = items.filter((item: any) =>
                        item.motoristaId === motoristaId ||
                        item.userId === motoristaId ||
                        item.ownerId === motoristaId ||
                        item.user_id === motoristaId
                    );

                    console.log(`[DESPESAS] Encontrados ${filtered.length} registros após filtro local de ${items.length} total`);
                    return filtered;
                } catch (error: any) {
                    console.warn(`[DESPESAS] Falha ao buscar todos de ${collectionName}:`, error?.message);
                    return [];
                }
            };

            // Busca IDs já migrados para evitar duplicatas
            const despesasExistentes = await db.collection(COLLECTION_NAME).list({
                filter: { motoristaId },
                limit: 1000,
            });
            const rawExistentes = (despesasExistentes as any)?.data ?? despesasExistentes ?? [];
            const idsExistentes = new Set((rawExistentes as any[]).map(d => d.legacyId).filter(Boolean));

            // ========================================
            // 1. MIGRAR ABASTECIMENTOS
            // ========================================
            // [FIX] Helper para extrair data corretamente de registros legados
            const extractDate = (record: any): string => {
                // Tenta vários campos possíveis de data
                const candidates = [
                    record.data,
                    record.date,
                    record.dataRegistro,
                    record.createdAt,
                    record.created_at,
                    record.timestamp,
                ];

                for (const candidate of candidates) {
                    if (!candidate) continue;

                    // Se já é uma string no formato yyyy-MM-dd
                    if (typeof candidate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(candidate)) {
                        return candidate.split('T')[0];
                    }

                    // Se é um timestamp ou Date object
                    if (candidate instanceof Date || typeof candidate === 'number') {
                        return format(new Date(candidate), 'yyyy-MM-dd');
                    }

                    // Se é uma string ISO
                    if (typeof candidate === 'string') {
                        try {
                            return format(new Date(candidate), 'yyyy-MM-dd');
                        } catch {
                            continue;
                        }
                    }
                }

                // Último fallback: data atual
                console.warn('[DESPESAS] ⚠️ Não encontrou data válida, usando data atual');
                return format(new Date(), 'yyyy-MM-dd');
            };

            const abastecimentos = await fetchLegacyCollection('abastecimentos');
            console.log(`[DESPESAS] 📦 Encontrados ${abastecimentos.length} abastecimentos legados`);

            for (const ab of abastecimentos) {
                // Pula se já foi migrado
                if (idsExistentes.has(ab.id)) continue;

                const dataOriginal = extractDate(ab);
                console.log(`[DESPESAS] Migrando abastecimento: id=${ab.id}, dataOriginal=${dataOriginal}, valor=${ab.valorTotal || ab.valor}`);

                try {
                    const payload = {
                        motoristaId,
                        tipo: 'COMBUSTIVEL' as const,
                        valor: ab.valorTotal || ab.valor || 0,
                        descricao: `Abastecimento - ${ab.tipoCombustivel || 'Combustível'}`,
                        data: dataOriginal, // Data original do registro
                        dataRegistro: dataOriginal, // Backup field
                        // Campos específicos de combustível
                        tipoCombustivel: ab.tipoCombustivel,
                        precoLitro: ab.precoLitro,
                        litros: ab.litros,
                        posto: ab.posto,
                        kmOdometro: ab.kmOdometro,
                        // Marcador de migração
                        legacyId: ab.id,
                        legacyCollection: 'abastecimentos',
                    };
                    console.log('[DESPESAS] 📤 Payload a ser salvo:', JSON.stringify(payload));
                    const result = await db.collection(COLLECTION_NAME).create(payload);
                    console.log('[DESPESAS] 📥 Resultado salvo:', JSON.stringify(result));
                    totalMigrados++;
                } catch (err: any) {
                    console.warn(`[DESPESAS] Falha ao migrar abastecimento ${ab.id}:`, err?.message);
                }
            }

            // ========================================
            // 2. MIGRAR PEDAGIOS
            // ========================================
            const pedagios = await fetchLegacyCollection('pedagios');
            console.log(`[DESPESAS] 📦 Encontrados ${pedagios.length} pedágios legados`);

            for (const ped of pedagios) {
                // Pula se já foi migrado
                if (idsExistentes.has(ped.id)) continue;

                const dataOriginal = extractDate(ped);
                console.log(`[DESPESAS] Migrando pedágio: id=${ped.id}, dataOriginal=${dataOriginal}, valor=${ped.valor}`);

                try {
                    const payload = {
                        motoristaId,
                        tipo: 'PEDAGIO' as const,
                        valor: ped.valor || 0,
                        descricao: `Pedágio ${ped.rodovia ? '- ' + ped.rodovia : ''}`,
                        data: dataOriginal, // Data original do registro
                        dataRegistro: dataOriginal, // Backup field
                        // Campos específicos de pedágio
                        rodovia: ped.rodovia,
                        praca: ped.praca,
                        // Marcador de migração
                        legacyId: ped.id,
                        legacyCollection: 'pedagios',
                    };
                    console.log('[DESPESAS] 📤 Payload pedágio:', JSON.stringify(payload));
                    const result = await db.collection(COLLECTION_NAME).create(payload);
                    console.log('[DESPESAS] 📥 Resultado pedágio:', JSON.stringify(result));
                    totalMigrados++;
                } catch (err: any) {
                    console.warn(`[DESPESAS] Falha ao migrar pedágio ${ped.id}:`, err?.message);
                }
            }

            console.log(`[DESPESAS] ✅ Migração concluída! ${totalMigrados} registros migrados.`);
            set({ isLoading: false });
            return totalMigrados;
        } catch (error: any) {
            console.error('[DESPESAS] ❌ Erro na migração:', error);
            set({ error: error.message, isLoading: false });
            return 0;
        }
    },

    // ========================================
    // REALTIME SUBSCRIPTION
    // [FIX] Usa motoristaId no filtro
    // ========================================
    subscribeToChanges: (motoristaId) => {
        console.log('[DESPESAS] 🔌 Iniciando subscription realtime para:', motoristaId);

        const unsubscribe = getDb()
            .collection(COLLECTION_NAME)
            .subscribe(
                createSafeSubscriptionHandler<Despesa>(
                    (action, data) => {
                        console.log(`[DESPESAS] Realtime: ${action}`, data.id);
                        const targetId = String(data.id);

                        if (action === 'create') {
                            console.log('[DESPESAS] 📥 CREATE - adicionando despesa');
                            set(state => {
                                // Evita duplicatas
                                if (state.despesas.some(d => String(d.id) === targetId)) return state;

                                // [FIX] Atualiza também resumoSemanal para refletir no Dashboard imediatamente
                                let newResumo = state.resumoSemanal;
                                if (newResumo) {
                                    const newItems = [data, ...newResumo.items];
                                    const totais = newItems.reduce((acc, d) => {
                                        acc.total += (d.valor || 0);
                                        if (d.tipo === 'COMBUSTIVEL') acc.combustivel += (d.valor || 0);
                                        else if (d.tipo === 'MANUTENCAO') acc.manutencao += (d.valor || 0);
                                        else if (d.tipo === 'PEDAGIO') acc.pedagio += (d.valor || 0);
                                        else acc.outros += (d.valor || 0);
                                        return acc;
                                    }, { total: 0, combustivel: 0, manutencao: 0, pedagio: 0, outros: 0 });
                                    newResumo = { ...newResumo, ...totais, items: newItems };
                                }

                                return {
                                    despesas: [data, ...state.despesas],
                                    resumoSemanal: newResumo,
                                    lastUpdated: Date.now(),
                                };
                            });
                        } else if (action === 'update') {
                            console.log('[DESPESAS] 📝 UPDATE - atualizando despesa:', targetId);
                            set(state => {
                                const newDespesas = state.despesas.map(d =>
                                    String(d.id) === targetId ? { ...d, ...data } as Despesa : d
                                );

                                let newResumo = state.resumoSemanal;
                                if (newResumo) {
                                    const newItems = newResumo.items.map(d =>
                                        String(d.id) === targetId ? { ...d, ...data } as Despesa : d
                                    );
                                    const totais = newItems.reduce((acc, d) => {
                                        acc.total += (d.valor || 0);
                                        if (d.tipo === 'COMBUSTIVEL') acc.combustivel += (d.valor || 0);
                                        else if (d.tipo === 'MANUTENCAO') acc.manutencao += (d.valor || 0);
                                        else if (d.tipo === 'PEDAGIO') acc.pedagio += (d.valor || 0);
                                        else acc.outros += (d.valor || 0);
                                        return acc;
                                    }, { total: 0, combustivel: 0, manutencao: 0, pedagio: 0, outros: 0 });
                                    newResumo = { ...newResumo, ...totais, items: newItems };
                                }

                                return {
                                    despesas: newDespesas,
                                    resumoSemanal: newResumo,
                                    lastUpdated: Date.now(),
                                };
                            });
                        } else if (action === 'delete') {
                            console.log('[DESPESAS] 🗑️ DELETE - removendo despesa');
                            set(state => {
                                const newDespesas = state.despesas.filter(d => String(d.id) !== targetId);
                                let newResumo = state.resumoSemanal;
                                if (newResumo) {
                                    const newItems = newResumo.items.filter(d => String(d.id) !== targetId);
                                    const totais = newItems.reduce((acc, d) => {
                                        acc.total += (d.valor || 0);
                                        if (d.tipo === 'COMBUSTIVEL') acc.combustivel += (d.valor || 0);
                                        else if (d.tipo === 'MANUTENCAO') acc.manutencao += (d.valor || 0);
                                        else if (d.tipo === 'PEDAGIO') acc.pedagio += (d.valor || 0);
                                        else acc.outros += (d.valor || 0);
                                        return acc;
                                    }, { total: 0, combustivel: 0, manutencao: 0, pedagio: 0, outros: 0 });
                                    newResumo = { ...newResumo, ...totais, items: newItems };
                                }

                                return {
                                    despesas: newDespesas,
                                    resumoSemanal: newResumo,
                                    lastUpdated: Date.now(),
                                };
                            });
                        }
                    },
                    {
                        moduleName: 'DespesasStore',
                        requiredFields: ['id', 'motoristaId'],
                        filterFn: (data) => data.motoristaId === motoristaId,
                        onError: (err) => console.warn('[DespesasStore] Erro realtime:', err)
                    }
                )
            );

        return () => {
            console.log('[DESPESAS] 🔌 Cancelando subscription');
            unsubscribe();
        };
    },

    // ========================================
    // LIMPAR ERRO
    // ========================================
    clearError: () => set({ error: null }),
}));