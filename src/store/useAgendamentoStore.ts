// src/store/useAgendamentoStore.ts
// ============================================
// ROTAFRETE - Store de Agendamento de Manutenção
// ============================================
// Gerencia agendamentos de manutenção com push notifications
// Usa SDK Aether v3.3.0
// ============================================

import { create } from 'zustand';
import { getDb } from '@aether-baas/react-native';
import type { AgendamentoManutencao, AgendamentoInput } from '@/types';
import type { StatusAgendamento } from '@/constants';

const COLLECTION_NAME = 'agendamentos_manutencao';

interface AgendamentoStore {
    // Estado
    agendamentos: AgendamentoManutencao[];
    isLoading: boolean;
    error: string | null;

    // Ações
    fetchAgendamentos: (motoristaId: string) => Promise<void>;
    agendarManutencao: (motoristaId: string, input: AgendamentoInput) => Promise<AgendamentoManutencao | null>;
    atualizarStatus: (id: string, status: StatusAgendamento, custoReal?: number) => Promise<boolean>;
    cancelarAgendamento: (id: string) => Promise<boolean>;
    deletarAgendamento: (id: string) => Promise<boolean>;

    // Getters
    getAgendamentosPendentes: () => AgendamentoManutencao[];
    getAgendamentosProximos: (dias: number) => AgendamentoManutencao[];

    clearError: () => void;
}

export const useAgendamentoStore = create<AgendamentoStore>((set, get) => ({
    // Estado inicial
    agendamentos: [],
    isLoading: false,
    error: null,

    // Busca todos os agendamentos do motorista
    fetchAgendamentos: async (motoristaId) => {
        set({ isLoading: true, error: null });

        try {
            const agendamentos = await getDb().collection<AgendamentoManutencao>(COLLECTION_NAME).list({
                filter: { motoristaId },
                sort: { field: 'dataAgendada', order: 'ASC' },
                limit: 50,
            });

            set({ agendamentos, isLoading: false });
        } catch (error) {
            console.error('[Agendamento] Erro ao buscar:', error);
            set({
                error: error instanceof Error ? error.message : 'Erro ao buscar agendamentos',
                isLoading: false,
            });
        }
    },

    // Agenda nova manutenção (dispara push notification!)
    agendarManutencao: async (motoristaId, input) => {
        set({ isLoading: true, error: null });

        try {
            const novoAgendamento = {
                ...input,
                motoristaId,
                status: 'AGENDADA' as StatusAgendamento,
                createdAt: new Date().toISOString(),
            };

            const created = await getDb().collection<AgendamentoManutencao>(COLLECTION_NAME).create(novoAgendamento);

            if (created) {
                set((state) => ({
                    agendamentos: [...state.agendamentos, created].sort(
                        (a, b) => new Date(a.dataAgendada).getTime() - new Date(b.dataAgendada).getTime()
                    ),
                    isLoading: false,
                }));
                console.log('[Agendamento] ✅ Manutenção agendada (push deve disparar!)');
                return created;
            }

            set({ isLoading: false });
            return null;
        } catch (error) {
            console.error('[Agendamento] Erro ao agendar:', error);
            set({
                error: error instanceof Error ? error.message : 'Erro ao agendar manutenção',
                isLoading: false,
            });
            return null;
        }
    },

    // Atualiza status do agendamento
    atualizarStatus: async (id, status, custoReal) => {
        set({ isLoading: true, error: null });

        try {
            const update: Partial<AgendamentoManutencao> = {
                status,
                updatedAt: new Date().toISOString(),
            };

            if (status === 'CONCLUIDA') {
                update.dataRealizacao = new Date().toISOString();
                if (custoReal !== undefined) {
                    update.custoReal = custoReal;
                }
            }

            const updated = await getDb().collection<AgendamentoManutencao>(COLLECTION_NAME).update(id, update);

            if (updated) {
                set((state) => ({
                    agendamentos: state.agendamentos.map((a) =>
                        a.id === id ? { ...a, ...update } : a
                    ),
                    isLoading: false,
                }));
                return true;
            }

            set({ isLoading: false });
            return false;
        } catch (error) {
            console.error('[Agendamento] Erro ao atualizar:', error);
            set({
                error: error instanceof Error ? error.message : 'Erro ao atualizar agendamento',
                isLoading: false,
            });
            return false;
        }
    },

    // Cancela agendamento (muda status para CANCELADA)
    cancelarAgendamento: async (id) => {
        return get().atualizarStatus(id, 'CANCELADA');
    },

    // Deleta permanentemente um agendamento
    deletarAgendamento: async (id) => {
        set({ isLoading: true, error: null });

        try {
            // [ENTERPRISE] Use Cloud Function for robust deletion bypassing RLS
            const { getFunctions } = await import('@aether-baas/react-native');
            const functions = getFunctions();
            const deleteFn = functions.httpsCallable('delete-data');

            await deleteFn({ collection: COLLECTION_NAME, id });

            set((state) => ({
                agendamentos: state.agendamentos.filter((a) => a.id !== id),
                isLoading: false,
            }));

            console.log('[Agendamento] ✅ Agendamento deletado:', id);
            return true;
        } catch (error) {
            console.error('[Agendamento] Erro ao deletar:', error);
            set({
                error: error instanceof Error ? error.message : 'Erro ao deletar agendamento',
                isLoading: false,
            });
            return false;
        }
    },

    // Retorna agendamentos pendentes (AGENDADA ou EM_ANDAMENTO)
    getAgendamentosPendentes: () => {
        return get().agendamentos.filter(
            (a) => a.status === 'AGENDADA' || a.status === 'EM_ANDAMENTO'
        );
    },

    // Retorna agendamentos nos próximos X dias
    getAgendamentosProximos: (dias) => {
        const hoje = new Date();
        const limite = new Date(hoje);
        limite.setDate(limite.getDate() + dias);

        return get().agendamentos.filter((a) => {
            if (a.status !== 'AGENDADA') return false;
            const dataAgendada = new Date(a.dataAgendada);
            return dataAgendada >= hoje && dataAgendada <= limite;
        });
    },

    clearError: () => set({ error: null }),
}));

export default useAgendamentoStore;
