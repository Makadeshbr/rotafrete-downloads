// src/store/useAbastecimentosStore.ts
// ============================================
// ROTAFRETE - Store de Abastecimentos (Zustand)
// ============================================
// Usa SDK Aether 100% nativo - SDK v3.2.0+
// Usa getDb() para obter client com token do Provider
// ============================================

import { create } from 'zustand';
import { getDb } from '@aether-baas/react-native';
import type { Abastecimento, AbastecimentoInput } from '@/types';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { createSafeSubscriptionHandler } from '@/utils/safeSubscribe';

const COLLECTION_NAME = 'abastecimentos';

interface AbastecimentosStore {
  // Estado
  abastecimentos: Abastecimento[];
  abastecimentosDoMes: Abastecimento[];
  isLoading: boolean;
  error: string | null;

  // Ações
  fetchAbastecimentos: (motoristaId: string) => Promise<void>;
  fetchAbastecimentosDoMes: (motoristaId: string, data: Date) => Promise<void>;
  criarAbastecimento: (motoristaId: string, input: AbastecimentoInput) => Promise<Abastecimento | null>;
  atualizarAbastecimento: (id: string, input: Partial<AbastecimentoInput>) => Promise<boolean>;
  deletarAbastecimento: (id: string) => Promise<boolean>;
  getTotalMes: () => number;
  getMediaPrecoLitro: () => number;
  clearError: () => void;
  subscribeToChanges: (motoristaId: string) => () => void;
}

export const useAbastecimentosStore = create<AbastecimentosStore>((set, get) => ({
  // Estado inicial
  abastecimentos: [],
  abastecimentosDoMes: [],
  isLoading: false,
  error: null,

  // Busca todos os abastecimentos do motorista
  fetchAbastecimentos: async (motoristaId) => {
    set({ isLoading: true, error: null });

    try {
      const abastecimentos = await getDb().collection<Abastecimento>(COLLECTION_NAME).list({
        filter: { motoristaId },
        sort: { field: 'data', order: 'DESC' },
        limit: 100,
      });

      set({ abastecimentos, isLoading: false });
    } catch (error: any) {
      const message = error.message || 'Erro ao buscar abastecimentos';
      set({ error: message, isLoading: false });
    }
  },

  // Busca abastecimentos do mês (TODOS os dados para evitar problema de timezone)
  fetchAbastecimentosDoMes: async (motoristaId, data) => {
    set({ isLoading: true, error: null });

    try {
      // [FIX] Busca TODOS os abastecimentos sem filtros
      console.log('[Abastecimentos] Buscando TODOS os dados...');
      const abastecimentos = await getDb().collection<Abastecimento>(COLLECTION_NAME).list({
        sort: { field: 'data', order: 'DESC' },
        limit: 100,
      });

      console.log('[Abastecimentos] Total encontrado:', abastecimentos.length);

      // [FIX] Usa todos os dados sem filtro de mês
      set({ abastecimentosDoMes: abastecimentos, abastecimentos, isLoading: false });
    } catch (error: any) {
      console.error('[Abastecimentos] ERRO:', error);
      const message = error.message || 'Erro ao buscar abastecimentos';
      set({ error: message, isLoading: false });
    }
  },

  // Cria um novo abastecimento
  criarAbastecimento: async (motoristaId, input) => {
    set({ isLoading: true, error: null });

    try {
      const abastecimentoData: Partial<Abastecimento> = {
        motoristaId,
        data: input.data,
        tipoCombustivel: input.tipoCombustivel,
        precoLitro: input.precoLitro,
        litros: input.litros,
        valorTotal: input.valorTotal,
        kmOdometro: input.kmOdometro,
        posto: input.posto,
        rotaId: input.rotaId,
      };

      console.log('[Abastecimento] Criando:', abastecimentoData);

      const novo = await getDb().collection<Abastecimento>(COLLECTION_NAME).create(abastecimentoData);

      console.log('[Abastecimento] Criado com sucesso:', novo?.id);

      // Atualiza lista local
      set(state => ({
        abastecimentos: [novo, ...state.abastecimentos],
        abastecimentosDoMes: [novo, ...state.abastecimentosDoMes],
        isLoading: false,
      }));

      return novo;
    } catch (error: any) {
      console.error('[Abastecimento] ERRO ao criar:', error);
      const message = error?.response?.data?.error || error.message || 'Erro ao criar abastecimento';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  // Atualiza um abastecimento
  atualizarAbastecimento: async (id, input) => {
    set({ isLoading: true, error: null });

    try {
      await getDb().collection<Abastecimento>(COLLECTION_NAME).update(id, input);

      // Atualiza lista local
      set(state => ({
        abastecimentos: state.abastecimentos.map(a => a.id === id ? { ...a, ...input } : a),
        abastecimentosDoMes: state.abastecimentosDoMes.map(a => a.id === id ? { ...a, ...input } : a),
        isLoading: false,
      }));

      return true;
    } catch (error: any) {
      const message = error.message || 'Erro ao atualizar abastecimento';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // Deleta um abastecimento
  deletarAbastecimento: async (id) => {
    set({ isLoading: true, error: null });

    try {
      await getDb().collection<Abastecimento>(COLLECTION_NAME).delete(id);

      // Remove da lista local
      set(state => ({
        abastecimentos: state.abastecimentos.filter(a => a.id !== id),
        abastecimentosDoMes: state.abastecimentosDoMes.filter(a => a.id !== id),
        isLoading: false,
      }));

      return true;
    } catch (error: any) {
      const message = error.message || 'Erro ao deletar abastecimento';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // Calcula total do mês
  getTotalMes: () => {
    const { abastecimentosDoMes } = get();
    return abastecimentosDoMes.reduce((sum, a) => sum + a.valorTotal, 0);
  },

  // Calcula média do preço por litro
  getMediaPrecoLitro: () => {
    const { abastecimentosDoMes } = get();
    if (abastecimentosDoMes.length === 0) return 0;
    const total = abastecimentosDoMes.reduce((sum, a) => sum + a.precoLitro, 0);
    return total / abastecimentosDoMes.length;
  },

  // Limpa erro
  clearError: () => set({ error: null }),

  // [REALTIME] Subscribe para atualizações em tempo real
  subscribeToChanges: (motoristaId: string) => {
    console.log('[Abastecimentos] 🔌 Iniciando subscription realtime...');

    const unsubscribe = getDb()
      .collection(COLLECTION_NAME)
      .subscribe(createSafeSubscriptionHandler<Abastecimento>(
        (action, data) => {
          console.log('[Abastecimentos] ⚡ Evento Realtime:', action, data.id);
          const targetId = String(data.id);

          if (action === 'create') {
            set(state => {
              if (state.abastecimentos.some(a => String(a.id) === targetId)) return state;
              return {
                abastecimentos: [data, ...state.abastecimentos],
                abastecimentosDoMes: [data, ...state.abastecimentosDoMes], // Adiciona em ambos
              };
            });
          } else if (action === 'update') {
            set(state => ({
              abastecimentos: state.abastecimentos.map(a => String(a.id) === targetId ? { ...a, ...data } as Abastecimento : a),
              abastecimentosDoMes: state.abastecimentosDoMes.map(a => String(a.id) === targetId ? { ...a, ...data } as Abastecimento : a),
            }));
          } else if (action === 'delete') {
            set(state => ({
              abastecimentos: state.abastecimentos.filter(a => String(a.id) !== targetId),
              abastecimentosDoMes: state.abastecimentosDoMes.filter(a => String(a.id) !== targetId),
            }));
          }
        },
        {
          moduleName: 'AbastecimentosStore',
          requiredFields: ['id', 'motoristaId'],
          filterFn: (data) => data.motoristaId === motoristaId,
          onError: (err) => console.warn('[AbastecimentosStore] Erro realtime:', err)
        }
      ));

    return () => {
      console.log('[Abastecimentos] 🔌 Cancelando subscription');
      unsubscribe();
    };
  },
}));

export default useAbastecimentosStore;
