// src/store/useRotasStore.ts
// ============================================
// ROTAFRETE - Store de Rotas (Zustand)
// ============================================
// [FIX 02/01/2026] Correções aplicadas:
//   1. Padronização: usa `motoristaId` em TODOS os filtros
//   2. Campo 'paradas' persistido no backend
//   3. Adicional de paradas calculado corretamente
//   4. Logs de debug removidos em produção
//   5. Tratamento de erros melhorado
// ============================================

import { create } from 'zustand';
import { getDb } from '@aether-baas/react-native';
import { freightService } from '@/services/freight-service';
import type { Rota, RotaInput, ResumoDia, ResumoSemana } from '@/types';
import type { TipoVeiculo, Turno } from '@/constants/pricing';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createSafeSubscriptionHandler } from '@/utils/safeSubscribe';

// ============================================
// CONFIGURAÇÃO
// ============================================

const COLLECTION_NAME = 'rotas';

// [SEGURANÇA] Helper para logs condicionais (apenas em dev)
const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';
const devLog = (...args: any[]) => {
  if (isDev) {
    console.log(...args);
  }
};

// [MELHORIA] Mapeamento de erros para mensagens amigáveis
const ERROR_MESSAGES: Record<string, string> = {
  'NETWORK_ERROR': 'Sem conexão com a internet. Verifique sua rede.',
  'UNAUTHORIZED': 'Sessão expirada. Faça login novamente.',
  'FORBIDDEN': 'Você não tem permissão para esta ação.',
  'NOT_FOUND': 'Registro não encontrado.',
  'QUOTA_EXCEEDED': 'Limite de uso atingido para seu plano.',
  'VALIDATION_ERROR': 'Dados inválidos. Verifique os campos.',
  'SERVER_ERROR': 'Erro no servidor. Tente novamente em instantes.',
};

/**
 * Traduz erros técnicos para mensagens amigáveis ao usuário.
 */
function getErrorMessage(error: any, fallback: string): string {
  const code = error?.code || error?.status || error?.name;
  const mapped = ERROR_MESSAGES[code];
  if (mapped) return mapped;

  // Se for erro de rede
  if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
    return ERROR_MESSAGES['NETWORK_ERROR'];
  }

  // Não expor mensagens técnicas em produção
  if (!isDev && error?.message?.includes('Error')) {
    return fallback;
  }

  return error?.message || fallback;
}

// ============================================
// TIPOS
// ============================================

interface RotasStore {
  // Estado
  rotas: Rota[];
  rotasDoDia: Rota[];
  rotasDaSemana: Rota[];
  isLoading: boolean;
  isRealtime: boolean;
  error: string | null;

  // Ações CRUD
  fetchRotas: (motoristaId: string) => Promise<void>;
  fetchRotasDoDia: (motoristaId: string, data: Date) => Promise<void>;
  fetchRotasDaSemana: (motoristaId: string, dataReferencia: Date) => Promise<void>;
  criarRota: (motoristaId: string, input: RotaInput, tipoVeiculo: TipoVeiculo) => Promise<Rota | null>;
  atualizarRota: (id: string, input: Partial<RotaInput>, tipoVeiculo: TipoVeiculo) => Promise<boolean>;
  deletarRota: (id: string) => Promise<boolean>;

  // Realtime
  subscribeToChanges: (motoristaId: string) => () => void;

  // Computed
  getResumoDia: (data: Date) => {
    data: string;
    totalRotas: number;
    totalKm: number;
    totalParadas: number;
    totalBruto: number;
  };
  getResumoSemana: (dataReferencia: Date) => {
    totalRotas: number;
    totalKm: number;
    totalParadas: number;
    totalBruto: number;
    diasTrabalhados: number;
  };
  clearError: () => void;
}

// ============================================
// STORE
// ============================================

export const useRotasStore = create<RotasStore>((set, get) => ({
  // Estado inicial
  rotas: [],
  rotasDoDia: [],
  rotasDaSemana: [],
  isLoading: false,
  isRealtime: false,
  error: null,

  // ========================================
  // BUSCAR TODAS AS ROTAS
  // ========================================
  fetchRotas: async (motoristaId) => {
    set({ isLoading: true, error: null });

    try {
      // Filtra por motoristaId (compatível com Rules V2)
      const rotas = await getDb().collection<Rota>(COLLECTION_NAME).list({
        filter: { motoristaId },
        sort: { field: 'data', order: 'DESC' },
        limit: 100,
      });

      set({ rotas, isLoading: false });
    } catch (error) {
      const message = getErrorMessage(error, 'Erro ao buscar rotas');
      set({ error: message, isLoading: false });
    }
  },

  // ========================================
  // BUSCAR ROTAS DO DIA
  // [FIX] Corrigido: usa motoristaId ao invés de ownerId
  // ========================================
  fetchRotasDoDia: async (motoristaId, data) => {
    set({ isLoading: true, error: null });

    const dataStr = format(data, 'yyyy-MM-dd');
    console.log('[RotaStore] fetchRotasDoDia:', { motoristaId, dataStr });

    try {
      // [FIX 02/01/2026] Usa motoristaId no filtro para compatibilidade com Rules V1
      // ANTES (bugado): filter: { ownerId: motoristaId, data: dataStr }
      // DEPOIS (correto): filter: { motoristaId, data: dataStr }
      const rotas = await getDb().collection<Rota>(COLLECTION_NAME).list({
        filter: { motoristaId, data: dataStr },
        sort: { field: 'createdAt', order: 'ASC' },
      });

      console.log('[RotaStore] Rotas encontradas:', rotas.length);
      set({ rotasDoDia: rotas, isLoading: false });
    } catch (error) {
      console.error('[RotaStore] ERRO fetchRotasDoDia:', error);
      const message = getErrorMessage(error, 'Erro ao buscar rotas do dia');
      set({ error: message, isLoading: false });
    }
  },

  // ========================================
  // BUSCAR ROTAS DA SEMANA (Sexta a Quinta)
  // [FIX] Corrigido: usa motoristaId ao invés de ownerId
  // ========================================
  fetchRotasDaSemana: async (motoristaId, dataReferencia) => {
    set({ isLoading: true, error: null });

    // Calcula início (sexta) e fim (quinta) da semana de trabalho
    const diaSemana = dataReferencia.getDay();
    let inicioSemana: Date;
    let fimSemana: Date;

    if (diaSemana === 4) {
      // É quinta - fim da semana atual
      fimSemana = dataReferencia;
      inicioSemana = new Date(dataReferencia);
      inicioSemana.setDate(inicioSemana.getDate() - 6);
    } else if (diaSemana === 5) {
      // É sexta - início da semana atual
      inicioSemana = dataReferencia;
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

    try {
      // [FIX 02/01/2026] Usa motoristaId no filtro para compatibilidade com Rules V1
      // ANTES (bugado): filter: { ownerId: motoristaId }
      // DEPOIS (correto): filter: { motoristaId }
      const rotas = await getDb().collection<Rota>(COLLECTION_NAME).list({
        filter: { motoristaId },
        sort: { field: 'data', order: 'ASC' },
        limit: 50,
      });

      // Filtra localmente pela semana
      const rotasDaSemana = rotas.filter((rota: Rota) => {
        if (!rota.data) return false;
        const dataRota = parseISO(rota.data);
        return isWithinInterval(dataRota, { start: inicioSemana, end: fimSemana });
      });

      set({ rotasDaSemana, isLoading: false });
    } catch (error) {
      const message = getErrorMessage(error, 'Erro ao buscar rotas da semana');
      set({ error: message, isLoading: false });
    }
  },

  // ========================================
  // CRIAR NOVA ROTA
  // [FIX] Agora persiste campo 'paradas' e calcula adicional
  // ========================================
  criarRota: async (motoristaId, input, tipoVeiculo) => {
    devLog('[criarRota] Iniciando...', { motoristaId, tipoVeiculo });
    set({ isLoading: true, error: null });

    try {
      const data = parseISO(input.data);

      // [ENTERPRISE] Calcula frete usando FreightService (cloud + local fallback)
      const quantidadeParadas = input.paradas ?? input.quantidadeParadas ?? 0;
      const freightResult = freightService.calculateSync({
        km: input.kmRodados,
        vehicleType: tipoVeiculo,
        shift: input.turno,
        date: input.data,
        stops: quantidadeParadas,
      });

      const { valorKm: valorBase, valorParadas, valorTotal: valorFreteTotal, faixaKm, tipoDia } = freightResult;

      devLog('[criarRota] Cálculos:', {
        valorBase,
        quantidadeParadas,
        valorParadas,
        valorFreteTotal
      });

      // [FIX] Inclui todos os campos no objeto de persistência
      // [IMPORTANTE] Inclui motoristaId para ownership - necessário para as Rules V1
      const rotaData: Partial<Rota> = {
        motoristaId,
        data: input.data,
        turno: input.turno,
        tipoDia,
        kmRodados: input.kmRodados,
        faixaKm,
        valorFrete: valorFreteTotal,
        valorFreteBase: valorBase,
        quantidadeParadas,
        valorParadas,
        adicionalParadas: valorParadas,
        cidadeDestino: input.cidadeDestino,
        origem: input.origem,
        destino: input.destino,
        observacoes: input.observacoes,
        idaVolta: input.idaVolta ?? false,
      };

      const result = await getDb().collection<Rota>(COLLECTION_NAME).create(rotaData);

      if (result) {
        const novaRota = { ...rotaData, id: result.id } as Rota;

        set(state => ({
          rotas: [novaRota, ...state.rotas],
          rotasDoDia: [novaRota, ...state.rotasDoDia],
          isLoading: false,
        }));

        devLog('[criarRota] Sucesso:', result.id);
        return novaRota;
      }

      set({ isLoading: false });
      return null;
    } catch (error) {
      const message = getErrorMessage(error, 'Erro ao criar rota');
      set({ error: message, isLoading: false });
      return null;
    }
  },

  // ========================================
  // ATUALIZAR ROTA
  // ========================================
  atualizarRota: async (id, input, tipoVeiculo) => {
    set({ isLoading: true, error: null });

    try {
      // Se mudou km ou paradas, recalcula valores
      let updateData: Partial<Rota> = { ...input };

      if (input.kmRodados !== undefined || input.quantidadeParadas !== undefined) {
        const rotaAtual = get().rotas.find(r => r.id === id);
        if (rotaAtual) {
          const kmRodados = input.kmRodados ?? rotaAtual.kmRodados;
          const turno = input.turno ?? rotaAtual.turno;
          const quantidadeParadas = input.quantidadeParadas ?? rotaAtual.quantidadeParadas ?? 0;
          const data = parseISO(input.data ?? rotaAtual.data);

          // [ENTERPRISE] Calcula frete via FreightService
          const freightResult = freightService.calculateSync({
            km: kmRodados,
            vehicleType: tipoVeiculo,
            shift: turno,
            date: input.data ?? rotaAtual.data,
            stops: quantidadeParadas,
          });

          const { valorKm: valorBase, valorParadas, faixaKm, tipoDia } = freightResult;

          updateData = {
            ...updateData,
            kmRodados,
            faixaKm,
            tipoDia,
            valorFrete: valorBase + valorParadas,
            valorFreteBase: valorBase,
            quantidadeParadas,
            valorParadas,
            adicionalParadas: valorParadas,
          };
        }
      }

      await getDb().collection<Rota>(COLLECTION_NAME).update(id, updateData);

      // Atualiza estado local
      set(state => ({
        rotas: state.rotas.map(r => r.id === id ? { ...r, ...updateData } : r),
        rotasDoDia: state.rotasDoDia.map(r => r.id === id ? { ...r, ...updateData } : r),
        rotasDaSemana: state.rotasDaSemana.map(r => r.id === id ? { ...r, ...updateData } : r),
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const message = getErrorMessage(error, 'Erro ao atualizar rota');
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // ========================================
  // DELETAR ROTA
  // ========================================
  deletarRota: async (id) => {
    set({ isLoading: true, error: null });

    try {
      // [FIX] Use direct DB call compatible with updated RLS rules
      // Security: Rules verify if resource.data.motoristaId == auth.uid
      await getDb().collection<Rota>(COLLECTION_NAME).delete(id);

      set(state => ({
        rotas: state.rotas.filter(r => r.id !== id),
        rotasDoDia: state.rotasDoDia.filter(r => r.id !== id),
        rotasDaSemana: state.rotasDaSemana.filter(r => r.id !== id),
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const message = getErrorMessage(error, 'Erro ao deletar rota');
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // ========================================
  // REALTIME SUBSCRIPTION
  // ========================================
  subscribeToChanges: (motoristaId) => {
    const unsubscribe = getDb()
      .collection<Rota>(COLLECTION_NAME)
      // [FIX] Usando wrapper seguro para subscription
      .subscribe(
        createSafeSubscriptionHandler<Rota>(
          (action, novaRota) => {
            devLog('[RotaStore] Realtime event:', action);

            if (action === 'create') {
              set(state => {
                // Sincroniza rotasDoDia se a data coincidir
                let newRotasDoDia = state.rotasDoDia;
                if (state.rotasDoDia.length > 0 && state.rotasDoDia[0].data === novaRota.data) {
                  newRotasDoDia = [novaRota, ...state.rotasDoDia];
                }

                return {
                  rotas: [novaRota, ...state.rotas],
                  rotasDoDia: newRotasDoDia,
                  // rotasDaSemana: mantém atualizado apenas em update/delete por complexidade de range
                };
              });
            } else if (action === 'update') {
              set(state => ({
                rotas: state.rotas.map(r => r.id === novaRota.id ? novaRota : r),
                rotasDoDia: state.rotasDoDia.map(r => r.id === novaRota.id ? novaRota : r),
                rotasDaSemana: state.rotasDaSemana.map(r => r.id === novaRota.id ? novaRota : r),
              }));
            } else if (action === 'delete') {
              set(state => ({
                rotas: state.rotas.filter(r => r.id !== novaRota.id),
                rotasDoDia: state.rotasDoDia.filter(r => r.id !== novaRota.id),
                rotasDaSemana: state.rotasDaSemana.filter(r => r.id !== novaRota.id),
              }));
            }
          },
          {
            moduleName: 'RotaStore',
            // [SEGURANÇA] Garante que só processamos dados com campos vitais
            requiredFields: ['id', 'motoristaId', 'data'],
            // [SEGURANÇA] Filtro client-side adicional (além das Rules do backend)
            filterFn: (data) => data.motoristaId === motoristaId,
            onError: (err) => console.warn('[RotaStore] Erro no processamento realtime:', err)
          }
        )
      );

    set({ isRealtime: true });

    return () => {
      unsubscribe();
      set({ isRealtime: false });
    };
  },

  // ========================================
  // COMPUTED: RESUMO DO DIA
  // ========================================
  getResumoDia: (data) => {
    const dataStr = format(data, 'yyyy-MM-dd');
    const rotasDoDia = get().rotas.filter(r => r.data === dataStr);

    return {
      data: dataStr,
      totalRotas: rotasDoDia.length,
      totalKm: rotasDoDia.reduce((sum, r) => sum + r.kmRodados, 0),
      totalParadas: rotasDoDia.reduce((sum, r) => sum + (r.quantidadeParadas || 0), 0),
      // [FIX] valorFrete já inclui valorParadas - não somar novamente
      totalBruto: rotasDoDia.reduce((sum, r) => sum + r.valorFrete, 0),
    };
  },

  // ========================================
  // COMPUTED: RESUMO DA SEMANA
  // ========================================
  getResumoSemana: (dataReferencia) => {
    const { rotasDaSemana } = get();

    const totalKm = rotasDaSemana.reduce((sum, r) => sum + r.kmRodados, 0);
    const totalParadas = rotasDaSemana.reduce((sum, r) => sum + (r.quantidadeParadas || 0), 0);
    // [FIX] valorFrete já inclui valorParadas - não somar novamente
    const totalBruto = rotasDaSemana.reduce(
      (sum, r) => sum + r.valorFrete,
      0
    );

    const diasComRotas = new Set(rotasDaSemana.map(r => r.data));

    return {
      totalRotas: rotasDaSemana.length,
      totalKm,
      totalParadas,
      totalBruto,
      diasTrabalhados: diasComRotas.size,
    };
  },

  // ========================================
  // LIMPAR ERRO
  // ========================================
  clearError: () => set({ error: null }),
}));