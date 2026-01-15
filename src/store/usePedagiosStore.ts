// src/store/usePedagiosStore.ts
// ============================================
// ROTAFRETE - Store de Pedágios (Zustand)
// ============================================
// Usa SDK Aether 100% nativo - SDK v3.2.0+
// Usa getDb() para obter client com token do Provider
// ============================================

import { create } from 'zustand';
import { getDb } from '@aether-baas/react-native';
import type { Pedagio, PedagioInput } from '@/types';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const COLLECTION_NAME = 'pedagios';

interface PedagiosStore {
  // Estado
  pedagios: Pedagio[];
  pedagiosDoMes: Pedagio[];
  isLoading: boolean;
  error: string | null;

  // Ações
  fetchPedagios: (motoristaId: string) => Promise<void>;
  fetchPedagiosDoMes: (motoristaId: string, data: Date) => Promise<void>;
  criarPedagio: (motoristaId: string, input: PedagioInput) => Promise<Pedagio | null>;
  atualizarPedagio: (id: string, input: Partial<PedagioInput>) => Promise<boolean>;
  deletarPedagio: (id: string) => Promise<boolean>;
  getTotalMes: () => number;
  clearError: () => void;
}

export const usePedagiosStore = create<PedagiosStore>((set, get) => ({
  // Estado inicial
  pedagios: [],
  pedagiosDoMes: [],
  isLoading: false,
  error: null,

  // Busca todos os pedágios do motorista
  fetchPedagios: async (motoristaId) => {
    set({ isLoading: true, error: null });

    try {
      const pedagios = await getDb().collection<Pedagio>(COLLECTION_NAME).list({
        filter: { motoristaId },
        sort: { field: 'data', order: 'DESC' },
        limit: 100,
      });

      set({ pedagios, isLoading: false });
    } catch (error: any) {
      const message = error.message || 'Erro ao buscar pedágios';
      set({ error: message, isLoading: false });
    }
  },

  // Busca pedágios do mês (TODOS os dados para evitar problema de timezone)
  fetchPedagiosDoMes: async (motoristaId, data) => {
    set({ isLoading: true, error: null });

    try {
      // [FIX] Busca TODOS os pedágios sem filtros
      console.log('[Pedagios] Buscando TODOS os dados...');
      const pedagios = await getDb().collection<Pedagio>(COLLECTION_NAME).list({
        sort: { field: 'data', order: 'DESC' },
        limit: 100,
      });

      console.log('[Pedagios] Total encontrado:', pedagios.length);

      // [FIX] Usa todos os dados sem filtro de mês
      set({ pedagiosDoMes: pedagios, pedagios, isLoading: false });
    } catch (error: any) {
      console.error('[Pedagios] ERRO:', error);
      const message = error.message || 'Erro ao buscar pedágios';
      set({ error: message, isLoading: false });
    }
  },

  // Cria um novo pedágio
  criarPedagio: async (motoristaId, input) => {
    set({ isLoading: true, error: null });

    try {
      const pedagioData: Partial<Pedagio> = {
        motoristaId,
        data: input.data,
        valor: input.valor,
        rodovia: input.rodovia,
        praca: input.praca,
        rotaId: input.rotaId,
      };

      console.log('[Pedagio] Criando:', pedagioData);

      const novo = await getDb().collection<Pedagio>(COLLECTION_NAME).create(pedagioData);

      console.log('[Pedagio] Criado com sucesso:', novo?.id);

      // Atualiza lista local
      set(state => ({
        pedagios: [novo, ...state.pedagios],
        pedagiosDoMes: [novo, ...state.pedagiosDoMes],
        isLoading: false,
      }));

      return novo;
    } catch (error: any) {
      console.error('[Pedagio] ERRO ao criar:', error);
      const message = error?.response?.data?.error || error.message || 'Erro ao criar pedágio';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  // Atualiza um pedágio
  atualizarPedagio: async (id, input) => {
    set({ isLoading: true, error: null });

    try {
      await getDb().collection<Pedagio>(COLLECTION_NAME).update(id, input);

      // Atualiza lista local
      set(state => ({
        pedagios: state.pedagios.map(p => p.id === id ? { ...p, ...input } : p),
        pedagiosDoMes: state.pedagiosDoMes.map(p => p.id === id ? { ...p, ...input } : p),
        isLoading: false,
      }));

      return true;
    } catch (error: any) {
      const message = error.message || 'Erro ao atualizar pedágio';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // Deleta um pedágio
  deletarPedagio: async (id) => {
    set({ isLoading: true, error: null });

    try {
      await getDb().collection<Pedagio>(COLLECTION_NAME).delete(id);

      // Remove da lista local
      set(state => ({
        pedagios: state.pedagios.filter(p => p.id !== id),
        pedagiosDoMes: state.pedagiosDoMes.filter(p => p.id !== id),
        isLoading: false,
      }));

      return true;
    } catch (error: any) {
      const message = error.message || 'Erro ao deletar pedágio';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // Calcula total do mês
  getTotalMes: () => {
    const { pedagiosDoMes } = get();
    return pedagiosDoMes.reduce((sum, p) => sum + p.valor, 0);
  },

  // Limpa erro
  clearError: () => set({ error: null }),
}));

export default usePedagiosStore;
