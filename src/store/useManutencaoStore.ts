// src/store/useManutencaoStore.ts
// ============================================
// ROTAFRETE - Store de Manutenção (Zustand)
// ============================================
// Usa SDK Aether 100% nativo - SDK v3.2.0+
// Usa getDb() para obter client com token do Provider
// ============================================

import { create } from 'zustand';
import { getDb } from '@aether-baas/react-native';
import type { Manutencao, ManutencaoInput } from '@/types';
import type { ParteVeiculo, StatusManutencao } from '@/constants';
import { PARTES_VEICULO } from '@/constants';

const COLLECTION_NAME = 'manutencoes';
const STATUS_COLLECTION = 'status_veiculo';

// Interface para status de cada parte do veículo
interface StatusVeiculo {
  id?: string;
  motoristaId: string;
  parteVeiculo: ParteVeiculo;
  status: StatusManutencao;
  ultimaAtualizacao: string;
}

interface ManutencaoStore {
  // Estado
  manutencoes: Manutencao[];
  statusVeiculo: Record<ParteVeiculo, StatusManutencao>;
  isLoading: boolean;
  error: string | null;

  // Ações
  fetchManutencoes: (motoristaId: string) => Promise<void>;
  fetchStatusVeiculo: (motoristaId: string) => Promise<void>;
  criarManutencao: (motoristaId: string, input: ManutencaoInput) => Promise<Manutencao | null>;
  atualizarStatusParte: (motoristaId: string, parte: ParteVeiculo, status: StatusManutencao) => Promise<boolean>;
  resolverManutencao: (id: string, custoReal: number) => Promise<boolean>;
  deletarManutencao: (id: string) => Promise<boolean>;
  getContadorStatus: () => Record<StatusManutencao, number>;
  getPartesUrgentes: () => ParteVeiculo[];
  getPartesAtencao: () => ParteVeiculo[];
  subscribeToChanges: (motoristaId: string) => () => void;
  clearError: () => void;
}

// Status inicial (tudo OK)
const STATUS_INICIAL: Record<ParteVeiculo, StatusManutencao> = {
  MOTOR: 'OK',
  OLEO: 'OK',
  FILTROS: 'OK',
  BATERIA: 'OK',
  CORREIA: 'OK',
  FREIOS: 'OK',
  PNEU_DIANTEIRO_E: 'OK',
  PNEU_DIANTEIRO_D: 'OK',
  PNEU_TRASEIRO_E: 'OK',
  PNEU_TRASEIRO_D: 'OK',
  SUSPENSAO: 'OK',
  EMBREAGEM: 'OK',
  FAROL: 'OK',
  LANTERNA: 'OK',
};

export const useManutencaoStore = create<ManutencaoStore>((set, get) => ({
  // Estado inicial
  manutencoes: [],
  statusVeiculo: { ...STATUS_INICIAL },
  isLoading: false,
  error: null,

  // Busca histórico de manutenções
  fetchManutencoes: async (motoristaId) => {
    set({ isLoading: true, error: null });

    try {
      const manutencoes = await getDb().collection<Manutencao>(COLLECTION_NAME).list({
        filter: { motoristaId },
        sort: { field: 'data', order: 'DESC' },
        limit: 50,
      });

      set({ manutencoes, isLoading: false });
    } catch (error: any) {
      const message = error.message || 'Erro ao buscar manutenções';
      set({ error: message, isLoading: false });
    }
  },

  // Busca status atual de cada parte do veículo
  fetchStatusVeiculo: async (motoristaId) => {
    set({ isLoading: true, error: null });

    try {
      const data = await getDb().collection<StatusVeiculo>(STATUS_COLLECTION).list({
        filter: { motoristaId },
        limit: 20,
      });

      // Converte array para objeto
      const statusMap = { ...STATUS_INICIAL };
      data.forEach((item: StatusVeiculo) => {
        statusMap[item.parteVeiculo] = item.status;
      });

      set({ statusVeiculo: statusMap, isLoading: false });
    } catch (error: any) {
      // Se não encontrar, usa valores padrão
      console.log('[Manutencao] Usando status padrão');
      set({ statusVeiculo: { ...STATUS_INICIAL }, isLoading: false });
    }
  },

  // Cria um novo registro de manutenção
  criarManutencao: async (motoristaId, input) => {
    set({ isLoading: true, error: null });

    try {
      const manutencaoData: Partial<Manutencao> = {
        motoristaId,
        data: new Date().toISOString().split('T')[0],
        parteVeiculo: input.parteVeiculo,
        descricao: input.descricao,
        status: input.status,
        previsaoCusto: input.previsaoCusto,
      };

      const nova = await getDb().collection<Manutencao>(COLLECTION_NAME).create(manutencaoData);

      // Atualiza lista local
      set(state => ({
        manutencoes: [nova, ...state.manutencoes],
        isLoading: false,
      }));

      // Atualiza status da parte
      await get().atualizarStatusParte(motoristaId, input.parteVeiculo, input.status);

      return nova;
    } catch (error: any) {
      const message = error.message || 'Erro ao criar manutenção';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  // Atualiza status de uma parte do veículo
  atualizarStatusParte: async (motoristaId, parte, status) => {
    console.log('[Manutenção] atualizarStatusParte chamado:', { motoristaId, parte, status });
    set({ isLoading: true, error: null });

    try {
      // Busca se já existe registro para essa parte
      console.log('[Manutenção] Buscando registros existentes...');
      const existentes = await getDb().collection<StatusVeiculo>(STATUS_COLLECTION).list({
        filter: { motoristaId, parteVeiculo: parte },
        limit: 1,
      });
      console.log('[Manutenção] Registros encontrados:', existentes.length);

      if (existentes.length > 0) {
        // Atualiza existente
        console.log('[Manutenção] Atualizando registro existente:', existentes[0].id);
        await getDb().collection<StatusVeiculo>(STATUS_COLLECTION).update(existentes[0].id!, {
          status,
        });
        console.log('[Manutenção] Registro atualizado com sucesso');
      } else {
        // Cria novo
        console.log('[Manutenção] Criando novo registro...');
        await getDb().collection<StatusVeiculo>(STATUS_COLLECTION).create({
          motoristaId,
          parteVeiculo: parte,
          status,
        });
        console.log('[Manutenção] Registro criado com sucesso');
      }

      // Atualiza estado local
      set(state => ({
        statusVeiculo: {
          ...state.statusVeiculo,
          [parte]: status,
        },
        isLoading: false,
      }));
      console.log('[Manutenção] Estado local atualizado');

      return true;
    } catch (error: any) {
      console.error('[Manutenção] ERRO:', error);
      const message = error.message || 'Erro ao atualizar status';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // Marca manutenção como resolvida
  resolverManutencao: async (id, custoReal) => {
    set({ isLoading: true, error: null });

    try {
      await getDb().collection<Manutencao>(COLLECTION_NAME).update(id, {
        custoReal,
        dataResolucao: new Date().toISOString().split('T')[0],
        status: 'OK' as StatusManutencao,
      });

      // Atualiza lista local
      const manutencao = get().manutencoes.find(m => m.id === id);
      if (manutencao) {
        // Usa o motoristaId do próprio manutencao
        await get().atualizarStatusParte(manutencao.motoristaId, manutencao.parteVeiculo, 'OK');
      }

      set(state => ({
        manutencoes: state.manutencoes.map(m =>
          m.id === id
            ? { ...m, custoReal, dataResolucao: new Date().toISOString().split('T')[0], status: 'OK' as StatusManutencao }
            : m
        ),
        isLoading: false,
      }));

      return true;
    } catch (error: any) {
      const message = error.message || 'Erro ao resolver manutenção';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // Deleta uma manutenção
  deletarManutencao: async (id) => {
    set({ isLoading: true, error: null });

    try {
      await getDb().collection<Manutencao>(COLLECTION_NAME).delete(id);

      set(state => ({
        manutencoes: state.manutencoes.filter(m => m.id !== id),
        isLoading: false,
      }));

      return true;
    } catch (error: any) {
      const message = error.message || 'Erro ao deletar manutenção';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // Conta itens por status
  getContadorStatus: () => {
    const { statusVeiculo } = get();
    const contador: Record<StatusManutencao, number> = { OK: 0, ATENCAO: 0, URGENTE: 0 };

    Object.values(statusVeiculo).forEach(status => {
      contador[status]++;
    });

    return contador;
  },

  // Retorna partes com status URGENTE
  getPartesUrgentes: () => {
    const { statusVeiculo } = get();
    return (Object.keys(statusVeiculo) as ParteVeiculo[]).filter(
      parte => statusVeiculo[parte] === 'URGENTE'
    );
  },

  // Retorna partes com status ATENCAO
  getPartesAtencao: () => {
    const { statusVeiculo } = get();
    return (Object.keys(statusVeiculo) as ParteVeiculo[]).filter(
      parte => statusVeiculo[parte] === 'ATENCAO'
    );
  },

  // ========================================
  // REALTIME SUBSCRIPTION
  // ========================================
  subscribeToChanges: (motoristaId: string) => {
    // 1. Subscribe para Manutenções
    const unsubscribeManutencoes = getDb()
      .collection<Manutencao>(COLLECTION_NAME)
      .subscribe((action: string, rawData: any) => {
        // [FIX] Backend envia dados dentro de Payload, precisamos extrair
        const data = rawData?.Payload
          ? {
            id: rawData.id,
            projectId: rawData.projectId,
            userId: rawData.userId,
            createdAt: rawData.createdAt,
            ...rawData.Payload
          }
          : rawData;

        // [SEGURANÇA] Filtro client-side
        if (data && data.motoristaId !== motoristaId) return;

        // [FIX] SDK envia lowercase: 'create', 'update', 'delete'
        if (action === 'create' && data) {
          set(state => ({
            manutencoes: [data as Manutencao, ...state.manutencoes],
          }));
        } else if (action === 'update' && data) {
          set(state => ({
            manutencoes: state.manutencoes.map(m =>
              m.id === (data as Manutencao).id ? data as Manutencao : m
            ),
          }));
        } else if (action === 'delete' && data) {
          set(state => ({
            manutencoes: state.manutencoes.filter(m => m.id !== (data as Manutencao).id),
          }));
        }
      });

    // 2. Subscribe para Status do Veículo
    const unsubscribeStatus = getDb()
      .collection<StatusVeiculo>(STATUS_COLLECTION)
      .subscribe((action: string, rawData: any) => {
        // [FIX] Backend envia dados dentro de Payload, precisamos extrair
        const data = rawData?.Payload
          ? {
            id: rawData.id,
            projectId: rawData.projectId,
            userId: rawData.userId,
            createdAt: rawData.createdAt,
            ...rawData.Payload
          }
          : rawData;

        // [SEGURANÇA] Filtro client-side
        if (data && data.motoristaId !== motoristaId) return;

        // [FIX] SDK envia lowercase
        if ((action === 'create' || action === 'update') && data) {
          const item = data as StatusVeiculo;
          set(state => ({
            statusVeiculo: {
              ...state.statusVeiculo,
              [item.parteVeiculo]: item.status,
            },
          }));
        }
        // DELETE em status geralmente não acontece
      });

    return () => {
      unsubscribeManutencoes();
      unsubscribeStatus();
    };
  },

  // Limpa erro
  clearError: () => set({ error: null }),
}));

export default useManutencaoStore;
