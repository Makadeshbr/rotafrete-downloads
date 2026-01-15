// src/store/useResumoFinanceiroStore.ts
// ============================================
// ROTAFRETE - Store de Resumo Financeiro (Zustand)
// ============================================
// [NOVO] Calcula ganhos brutos e líquidos (semanal/mensal)
// Deduz automaticamente: manutenção, combustível, pedágios
// ============================================

import { create } from 'zustand';
import { getDb } from '@aether-baas/react-native';
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    parseISO,
    isWithinInterval,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ============================================
// TIPOS
// ============================================

/**
 * Resumo financeiro de uma semana de trabalho
 * Semana: Sexta (início) a Quinta (fim)
 */
export interface ResumoSemanal {
    // Período
    inicioSemana: string; // 'yyyy-MM-dd'
    fimSemana: string;    // 'yyyy-MM-dd'

    // Ganhos brutos (separados para transparência)
    totalBrutoKm: number;      // Valor dos KMs rodados
    totalBrutoParadas: number; // Valor do adicional de paradas
    totalBruto: number;        // totalBrutoKm + totalBrutoParadas

    // Despesas (deduzidas do bruto)
    totalCombustivel: number;
    totalPedagios: number;
    totalManutencao: number;
    totalDespesas: number; // Soma de todas as despesas

    // Líquido (o que sobra no bolso)
    totalLiquido: number; // totalBruto - totalDespesas

    // Estatísticas
    totalKm: number;
    totalParadas: number;
    totalRotas: number;
    diasTrabalhados: number;

    // Detalhamento por dia (para gráficos e drill-down)
    porDia: Array<{
        data: string;
        diaSemana: string;
        bruto: number;
        despesas: number;
        liquido: number;
        rotas: number;
        km: number;
        paradas: number;
    }>;
}

/**
 * Resumo financeiro de um mês completo
 */
export interface ResumoMensal {
    // Período
    mes: string;    // "Janeiro de 2025"
    mesNum: number; // 1-12
    ano: number;

    // Ganhos brutos
    totalBrutoKm: number;
    totalBrutoParadas: number;
    totalBruto: number;

    // Despesas
    totalCombustivel: number;
    totalPedagios: number;
    totalManutencao: number;
    totalDespesas: number;

    // Líquido
    totalLiquido: number;

    // Estatísticas
    totalKm: number;
    totalParadas: number;
    totalRotas: number;
    diasTrabalhados: number;
    mediaDiaria: number; // Média de ganho líquido por dia trabalhado

    // Detalhamento por semana (para drill-down)
    porSemana: ResumoSemanal[];
}

interface ResumoFinanceiroStore {
    // Estado
    resumoSemanal: ResumoSemanal | null;
    resumoMensal: ResumoMensal | null;
    isLoading: boolean;
    error: string | null;

    // Ações
    fetchResumoSemanal: (motoristaId: string, dataReferencia: Date) => Promise<void>;
    fetchResumoMensal: (motoristaId: string, dataReferencia: Date) => Promise<void>;
    subscribeToChanges: (motoristaId: string) => () => void;
    clearError: () => void;
}

// ============================================
// STORE
// ============================================

export const useResumoFinanceiroStore = create<ResumoFinanceiroStore>((set, get) => ({
    // Estado inicial
    resumoSemanal: null,
    resumoMensal: null,
    isLoading: false,
    error: null,

    /**
     * Busca e calcula o resumo financeiro da semana
     * 
     * Semana de trabalho: Sexta (5) a Quinta (4)
     * Isso reflete a realidade de muitos motoristas autônomos
     * que recebem semanalmente às sextas.
     */
    fetchResumoSemanal: async (motoristaId, dataReferencia) => {
        console.log('[ResumoSemanal] Iniciando fetch para:', motoristaId, format(dataReferencia, 'yyyy-MM-dd'));
        set({ isLoading: true, error: null });

        try {
            // ============================================
            // Calcula início e fim da semana de trabalho
            // Sexta (5) a Quinta (4)
            // ============================================
            const diaSemana = dataReferencia.getDay();
            let inicioSemana: Date;
            let fimSemana: Date;

            if (diaSemana === 4) {
                // É quinta - fim da semana atual
                fimSemana = new Date(dataReferencia);
                inicioSemana = new Date(dataReferencia);
                inicioSemana.setDate(inicioSemana.getDate() - 6);
            } else if (diaSemana === 5) {
                // É sexta - início da semana atual
                inicioSemana = new Date(dataReferencia);
                fimSemana = new Date(dataReferencia);
                fimSemana.setDate(fimSemana.getDate() + 6);
            } else {
                // Outros dias - encontra a sexta anterior
                const diasParaSexta = diaSemana >= 5 ? diaSemana - 5 : diaSemana + 2;
                inicioSemana = new Date(dataReferencia);
                inicioSemana.setDate(inicioSemana.getDate() - diasParaSexta);
                fimSemana = new Date(inicioSemana);
                fimSemana.setDate(fimSemana.getDate() + 6);
            }

            // Normaliza as datas (início do dia)
            inicioSemana.setHours(0, 0, 0, 0);
            fimSemana.setHours(23, 59, 59, 999);

            // ============================================
            // Busca dados em paralelo para performance
            // [FIX] Cada chamada é tratada individualmente para não crashar
            // se uma collection não existir ou retornar erro
            // ============================================
            const safeListCollection = async (collection: string, filter: any, sort: any, limit: number) => {
                try {
                    return await getDb().collection(collection).list({ filter, sort, limit });
                } catch (error: any) {
                    console.warn(`[ResumoFinanceiro] Falha ao buscar ${collection}:`, error?.message || error);
                    return []; // Retorna array vazio em caso de erro
                }
            };

            // [FIX] Busca COM filtro de motoristaId para respeitar Rules V1
            console.log('[ResumoSemanal] Buscando rotas para motoristaId:', motoristaId);
            const [rotas, abastecimentos, pedagios, manutencoes] = await Promise.all([
                safeListCollection('rotas', { motoristaId }, { field: 'data', order: 'ASC' }, 100),
                safeListCollection('abastecimentos', { motoristaId }, { field: 'data', order: 'DESC' }, 50),
                safeListCollection('pedagios', { motoristaId }, { field: 'data', order: 'DESC' }, 50),
                safeListCollection('manutencoes', { motoristaId }, { field: 'data', order: 'DESC' }, 20),
            ]);

            // ============================================
            // Filtra registros pelo período da semana
            // Usa comparação de strings para evitar problemas de timezone
            // ============================================
            const inicioStr = format(inicioSemana, 'yyyy-MM-dd');
            const fimStr = format(fimSemana, 'yyyy-MM-dd');

            // Helper para filtrar por intervalo de data (comparação de strings)
            // [FIX] Usa createdAt como fallback se data for undefined
            const filtrarPorPeriodo = (items: any[], campoData: string = 'data'): any[] => {
                return (items || []).filter((item: any) => {
                    try {
                        // Tenta campo principal, fallback para createdAt
                        let dataStr = item[campoData];
                        if (!dataStr && item.createdAt) {
                            dataStr = item.createdAt;
                        }
                        if (!dataStr) return false;

                        // Extrai apenas a parte da data (yyyy-MM-dd)
                        const dataItem = typeof dataStr === 'string'
                            ? dataStr.split('T')[0]
                            : format(new Date(dataStr), 'yyyy-MM-dd');

                        // Comparação simples de strings (evita problemas de timezone)
                        return dataItem >= inicioStr && dataItem <= fimStr;
                    } catch (e) {
                        return false;
                    }
                });
            };

            // Filtra rotas pela semana
            const rotasSemana = filtrarPorPeriodo(rotas, 'data');

            // [DEBUG] Logs para verificar filtro
            console.log('[ResumoSemanal] Período:', {
                inicioStr,
                fimStr,
                rotasTotal: rotas?.length || 0,
                rotasFiltradas: rotasSemana.length,
                primeiraRotaData: rotas?.[0]?.data,
                primeiraRotaCreatedAt: rotas?.[0]?.createdAt,
            });

            // Filtra despesas pela mesma semana
            const abastecimentosSemana = filtrarPorPeriodo(abastecimentos, 'data');
            const pedagiosSemana = filtrarPorPeriodo(pedagios, 'data');
            const manutencoesSemana = filtrarPorPeriodo(manutencoes, 'data');


            // ============================================
            // Calcula totais
            // ============================================

            // Ganhos brutos (valorFrete já inclui valorParadas)
            const totalBruto = rotasSemana.reduce(
                (sum: number, r: any) => sum + (r.valorFrete || 0),
                0
            );
            // valorParadas é armazenado separado apenas para exibição
            const totalParadasValor = rotasSemana.reduce(
                (sum: number, r: any) => sum + (r.valorParadas || 0),
                0
            );

            // Despesas
            const totalCombustivel = abastecimentosSemana.reduce(
                (sum: number, a: any) => sum + (a.valorTotal || 0),
                0
            );
            const totalPedagios = pedagiosSemana.reduce(
                (sum: number, p: any) => sum + (p.valor || 0),
                0
            );
            const totalManutencao = manutencoesSemana.reduce(
                (sum: number, m: any) => sum + (m.custoReal || 0),
                0
            );
            const totalDespesas = totalCombustivel + totalPedagios + totalManutencao;

            // Líquido
            const totalLiquido = totalBruto - totalDespesas;

            // Estatísticas
            const totalKm = rotasSemana.reduce(
                (sum: number, r: any) => sum + (r.kmRodados || 0),
                0
            );
            const totalParadas = rotasSemana.reduce(
                (sum: number, r: any) => sum + (r.quantidadeParadas || 0),
                0
            );

            // Dias trabalhados (dias únicos com rotas)
            const diasComRotas = new Set(rotasSemana.map((r: any) => r.data));
            const diasTrabalhados = diasComRotas.size;

            // ============================================
            // Detalhamento por dia
            // ============================================
            const dias = eachDayOfInterval({ start: inicioSemana, end: fimSemana });
            const porDia = dias.map((dia) => {
                const dataStr = format(dia, 'yyyy-MM-dd');
                const rotasDia = rotasSemana.filter((r: any) => r.data === dataStr);
                const abDia = abastecimentosSemana.filter((a: any) => a.data === dataStr);
                const pedDia = pedagiosSemana.filter((p: any) => p.data === dataStr);
                const manDia = manutencoesSemana.filter((m: any) => m.data === dataStr);

                // [FIX] valorFrete já inclui valorParadas - não somar novamente
                const bruto = rotasDia.reduce(
                    (s: number, r: any) => s + (r.valorFrete || 0),
                    0
                );
                const despesas =
                    abDia.reduce((s: number, a: any) => s + (a.valorTotal || 0), 0) +
                    pedDia.reduce((s: number, p: any) => s + (p.valor || 0), 0) +
                    manDia.reduce((s: number, m: any) => s + (m.custoReal || 0), 0);

                return {
                    data: dataStr,
                    diaSemana: format(dia, 'EEEE', { locale: ptBR }),
                    bruto,
                    despesas,
                    liquido: bruto - despesas,
                    rotas: rotasDia.length,
                    km: rotasDia.reduce((s: number, r: any) => s + (r.kmRodados || 0), 0),
                    paradas: rotasDia.reduce(
                        (s: number, r: any) => s + (r.quantidadeParadas || 0),
                        0
                    ),
                };
            });

            // ============================================
            // Monta o resumo final
            // ============================================
            const resumo: ResumoSemanal = {
                inicioSemana: format(inicioSemana, 'yyyy-MM-dd'),
                fimSemana: format(fimSemana, 'yyyy-MM-dd'),
                totalBrutoKm: totalBruto, // valorFrete já inclui paradas
                totalBrutoParadas: totalParadasValor, // valor adicional de paradas (para exibição)
                totalBruto,
                totalCombustivel,
                totalPedagios,
                totalManutencao,
                totalDespesas,
                totalLiquido,
                totalKm,
                totalParadas,
                totalRotas: rotasSemana.length,
                diasTrabalhados,
                porDia,
            };

            set({ resumoSemanal: resumo, isLoading: false });
            console.log('[ResumoSemanal] Resumo setado:', { totalBruto: resumo.totalBruto, totalRotas: resumo.totalRotas });
        } catch (error: any) {
            console.error('[ResumoFinanceiro] Erro ao buscar resumo semanal:', error);
            set({
                error: error.message || 'Erro ao buscar resumo semanal',
                isLoading: false,
            });
        }
    },

    /**
     * Busca e calcula o resumo financeiro do mês
     */
    fetchResumoMensal: async (motoristaId, dataReferencia) => {
        set({ isLoading: true, error: null });

        try {
            const inicioMes = startOfMonth(dataReferencia);
            const fimMes = endOfMonth(dataReferencia);

            // ============================================
            // Busca dados em paralelo
            // [FIX] Cada chamada é tratada individualmente para não crashar
            // ============================================
            const safeListCollection = async (collection: string, filter: any, sort: any, limit: number) => {
                try {
                    return await getDb().collection(collection).list({ filter, sort, limit });
                } catch (error: any) {
                    console.warn(`[ResumoMensal] Falha ao buscar ${collection}:`, error?.message || error);
                    return []; // Retorna array vazio em caso de erro
                }
            };

            const [rotas, abastecimentos, pedagios, manutencoes] = await Promise.all([
                safeListCollection('rotas', { motoristaId }, { field: 'data', order: 'ASC' }, 200),
                safeListCollection('abastecimentos', { motoristaId }, { field: 'data', order: 'DESC' }, 100),
                safeListCollection('pedagios', { motoristaId }, { field: 'data', order: 'DESC' }, 100),
                safeListCollection('manutencoes', { motoristaId }, { field: 'data', order: 'DESC' }, 50),
            ]);

            // ============================================
            // Filtra por período do mês
            // ============================================
            const intervalo = { start: inicioMes, end: fimMes };

            const rotasMes = (rotas || []).filter((r: any) => {
                if (!r.data) return false;
                const dataRota = parseISO(r.data);
                return isWithinInterval(dataRota, intervalo);
            });

            const abastecimentosMes = (abastecimentos || []).filter((a: any) => {
                if (!a.data) return false;
                const dataAb = parseISO(a.data);
                return isWithinInterval(dataAb, intervalo);
            });

            const pedagiosMes = (pedagios || []).filter((p: any) => {
                if (!p.data) return false;
                const dataPed = parseISO(p.data);
                return isWithinInterval(dataPed, intervalo);
            });

            const manutencoesMes = (manutencoes || []).filter((m: any) => {
                if (!m.data) return false;
                const dataMan = parseISO(m.data);
                return isWithinInterval(dataMan, intervalo);
            });

            // ============================================
            // Calcula totais
            // ============================================
            const totalBrutoKm = rotasMes.reduce(
                (sum: number, r: any) => sum + (r.valorFrete || 0),
                0
            );
            const totalBrutoParadas = rotasMes.reduce(
                (sum: number, r: any) => sum + (r.valorParadas || 0),
                0
            );
            // [FIX] valorFrete já inclui valorParadas - totalBrutoParadas é apenas para exibição separada
            const totalBruto = totalBrutoKm;

            const totalCombustivel = abastecimentosMes.reduce(
                (sum: number, a: any) => sum + (a.valorTotal || 0),
                0
            );
            const totalPedagios = pedagiosMes.reduce(
                (sum: number, p: any) => sum + (p.valor || 0),
                0
            );
            const totalManutencao = manutencoesMes.reduce(
                (sum: number, m: any) => sum + (m.custoReal || 0),
                0
            );
            const totalDespesas = totalCombustivel + totalPedagios + totalManutencao;

            const totalLiquido = totalBruto - totalDespesas;

            const totalKm = rotasMes.reduce(
                (sum: number, r: any) => sum + (r.kmRodados || 0),
                0
            );
            const totalParadas = rotasMes.reduce(
                (sum: number, r: any) => sum + (r.quantidadeParadas || 0),
                0
            );

            const diasComRotas = new Set(rotasMes.map((r: any) => r.data));
            const diasTrabalhados = diasComRotas.size;

            const mediaDiaria = diasTrabalhados > 0 ? totalLiquido / diasTrabalhados : 0;

            // ============================================
            // Monta o resumo mensal
            // ============================================
            const resumo: ResumoMensal = {
                mes: format(dataReferencia, "MMMM 'de' yyyy", { locale: ptBR }),
                mesNum: dataReferencia.getMonth() + 1,
                ano: dataReferencia.getFullYear(),
                totalBrutoKm,
                totalBrutoParadas,
                totalBruto,
                totalCombustivel,
                totalPedagios,
                totalManutencao,
                totalDespesas,
                totalLiquido,
                totalKm,
                totalParadas,
                totalRotas: rotasMes.length,
                diasTrabalhados,
                mediaDiaria,
                porSemana: [], // Pode ser populado se necessário com chamadas adicionais
            };

            set({ resumoMensal: resumo, isLoading: false });
        } catch (error: any) {
            console.error('[ResumoFinanceiro] Erro ao buscar resumo mensal:', error);
            set({
                error: error.message || 'Erro ao buscar resumo mensal',
                isLoading: false,
            });
        }
    },

    /**
     * Inscreve para atualizações em tempo real em TODAS as coleções financeiras
     * Garante que o resumo esteja sempre atualizado
     */
    subscribeToChanges: (motoristaId: string) => {
        console.log('[ResumoFinanceiro] 🔌 Iniciando subscription realtime unificada');
        const db = getDb();

        const refreshAll = () => {
            console.log('[ResumoFinanceiro] 🔄 Detectada mudança, atualizando resumos...');
            // Recarrega dados mantendo as datas de referência atuais
            // (Assumindo que o componente vai chamar fetch se necessário, 
            // ou podemos forçar update aqui se tivermos o estado da data)
            // Como este store não guarda a data selecionada globalmente,
            // vamos expor o evento para quem estiver ouvindo.
            // Mas o Zustand não tem evento global fácil.
            // Workaround: Disparar refresh simples se tiver dados em cache
            const { resumoSemanal, resumoMensal } = get();
            if (resumoSemanal) {
                // Tenta recarregar semana atual
                const refDate = parseISO(resumoSemanal.inicioSemana); // Sexta
                // Adiciona 1 dia para garantir que caia dentro da semana
                refDate.setDate(refDate.getDate() + 1);
                get().fetchResumoSemanal(motoristaId, refDate);
            }
            if (resumoMensal) {
                const refDate = new Date(); // Mês atual por default
                // Se tiver mês salvo, usa ele
                if (resumoMensal.ano && resumoMensal.mesNum) {
                    refDate.setFullYear(resumoMensal.ano);
                    refDate.setMonth(resumoMensal.mesNum - 1);
                }
                get().fetchResumoMensal(motoristaId, refDate);
            }
        };

        // [FIX] Helper para extrair dados do Payload
        const extractData = (rawData: any) => rawData?.Payload
            ? {
                id: rawData.id,
                projectId: rawData.projectId,
                userId: rawData.userId,
                createdAt: rawData.createdAt,
                ...rawData.Payload
            }
            : rawData;

        const subs = [
            db.collection('rotas').subscribe((action: string, rawData: any) => {
                const data = extractData(rawData);
                console.log(`[ResumoFinanceiro] Rota event: ${action}`, data?.id);
                if (data?.motoristaId === motoristaId) refreshAll();
            }),
            db.collection('abastecimentos').subscribe((action: string, rawData: any) => {
                const data = extractData(rawData);
                console.log(`[ResumoFinanceiro] Abastecimento event: ${action}`, data?.id);
                if (data?.motoristaId === motoristaId) refreshAll();
            }),
            db.collection('pedagios').subscribe((action: string, rawData: any) => {
                const data = extractData(rawData);
                console.log(`[ResumoFinanceiro] Pedagio event: ${action}`, data?.id);
                if (data?.motoristaId === motoristaId) refreshAll();
            }),
            db.collection('manutencoes').subscribe((action: string, rawData: any) => {
                const data = extractData(rawData);
                console.log(`[ResumoFinanceiro] Manutencao event: ${action}`, data?.id);
                if (data?.motoristaId === motoristaId) refreshAll();
            }),
            db.collection('despesas').subscribe((action: string, rawData: any) => {
                const data = extractData(rawData);
                console.log(`[ResumoFinanceiro] Despesa event: ${action}`, data?.id);
                console.log(`[ResumoFinanceiro] Comparando IDs: ${data?.motoristaId} === ${motoristaId}`);
                if (data?.motoristaId === motoristaId) refreshAll();
            })
        ];

        return () => {
            console.log('[ResumoFinanceiro] 🔌 Cancelando subscriptions');
            subs.forEach(unsub => unsub());
        };
    },

    clearError: () => set({ error: null }),
}));

export default useResumoFinanceiroStore;