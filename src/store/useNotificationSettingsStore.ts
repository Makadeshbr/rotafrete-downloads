// src/store/useNotificationSettingsStore.ts
// ============================================
// ROTAFRETE - Store de Configurações de Notificações
// ============================================
// Gerencia preferências de notificações push do usuário.
// Usa SDK Aether para persistir no backend.
// ============================================

import { create } from 'zustand';
import { getDb } from '@aether-baas/react-native';

// ============================================
// TIPOS
// ============================================

/**
 * Configurações de notificação do usuário.
 * Persistido na collection 'notification_settings'.
 */
export interface NotificationSettings {
    /** ID do documento */
    id?: string;
    /** ID do motorista (usado para regras de segurança) */
    motoristaId: string;
    /** Master switch - desativa todas as notificações */
    notificacoesAtivas: boolean;
    /** Data/hora até quando está silenciado (ISO string) */
    silenciadoAte: string | null;
    /** Ativar lembrete diário para registrar rotas */
    lembreteRotaDiario: boolean;
    /** Horário do lembrete de rotas (HH:mm) */
    horaLembreteRota: string;
    /** Notificar quando admin avaliar inspeção */
    notificarAvaliacao: boolean;
    /** Notificar itens críticos imediatamente */
    notificarItensCriticos: boolean;
    /** Lembrete de inspeção semanal */
    lembreteInspecao: boolean;
    /** Dia do lembrete de inspeção (0-6, 0=Domingo) */
    diaLembreteInspecao: number;
    /** Hora do lembrete de inspeção (HH:mm) */
    horaLembreteInspecao: string;
    /** Timestamps */
    createdAt?: string;
    updatedAt?: string;
}

/**
 * Input para atualização parcial das configurações.
 */
export type UpdateNotificationSettingsInput = Partial<Omit<NotificationSettings, 'id' | 'motoristaId' | 'createdAt' | 'updatedAt'>>;

/**
 * Opções de silenciamento temporário.
 */
export type SilenciarOpcao = '1h' | '4h' | '8h' | 'amanha';

interface NotificationSettingsStore {
    // Estado
    settings: NotificationSettings | null;
    isLoading: boolean;
    error: string | null;

    // Ações
    fetchSettings: (motoristaId: string) => Promise<void>;
    updateSettings: (input: UpdateNotificationSettingsInput) => Promise<void>;
    silenciarPor: (opcao: SilenciarOpcao) => Promise<void>;
    ativarNotificacoes: () => Promise<void>;
    clearError: () => void;

    // Computed (helpers)
    isNotificacoesAtivas: () => boolean;
    isSilenciado: () => boolean;
    getTempoRestanteSilenciamento: () => string | null;
}

// ============================================
// CONSTANTES
// ============================================

const COLLECTION_NAME = 'notification_settings';

/**
 * Configurações padrão para novos usuários.
 */
const DEFAULT_SETTINGS: Omit<NotificationSettings, 'id' | 'motoristaId' | 'createdAt' | 'updatedAt'> = {
    notificacoesAtivas: true,
    silenciadoAte: null,
    lembreteRotaDiario: true,
    horaLembreteRota: '19:00',
    notificarAvaliacao: true,
    notificarItensCriticos: true,
    lembreteInspecao: true,
    diaLembreteInspecao: 4, // Quinta-feira
    horaLembreteInspecao: '08:00',
};

// ============================================
// HELPERS
// ============================================

/**
 * Calcula a data/hora de fim do silenciamento.
 */
function calcularFimSilenciamento(opcao: SilenciarOpcao): string {
    const agora = new Date();

    switch (opcao) {
        case '1h':
            agora.setHours(agora.getHours() + 1);
            break;
        case '4h':
            agora.setHours(agora.getHours() + 4);
            break;
        case '8h':
            agora.setHours(agora.getHours() + 8);
            break;
        case 'amanha':
            // Amanhã às 8h
            agora.setDate(agora.getDate() + 1);
            agora.setHours(8, 0, 0, 0);
            break;
    }

    return agora.toISOString();
}

/**
 * Formata tempo restante de silenciamento.
 */
function formatarTempoRestante(dataFim: string): string | null {
    const fim = new Date(dataFim);
    const agora = new Date();

    if (fim <= agora) {
        return null; // Já expirou
    }

    const diffMs = fim.getTime() - agora.getTime();
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHoras > 0) {
        return `${diffHoras}h ${diffMinutos}min`;
    }
    return `${diffMinutos} min`;
}

// ============================================
// STORE
// ============================================

export const useNotificationSettingsStore = create<NotificationSettingsStore>((set, get) => ({
    // Estado inicial
    settings: null,
    isLoading: false,
    error: null,

    // ========================================
    // BUSCAR CONFIGURAÇÕES
    // ========================================
    fetchSettings: async (motoristaId: string) => {
        set({ isLoading: true, error: null });

        try {
            const db = getDb();

            // Busca configurações existentes do motorista
            const result = await db.collection<NotificationSettings>(COLLECTION_NAME).list({
                filter: { motoristaId },
                limit: 1,
            });

            if (result && result.length > 0) {
                // Configurações existem
                const existingSettings = result[0];

                // Verifica se silenciamento expirou
                if (existingSettings.silenciadoAte) {
                    const silenciadoAte = new Date(existingSettings.silenciadoAte);
                    if (silenciadoAte <= new Date()) {
                        // Silenciamento expirou, limpa
                        existingSettings.silenciadoAte = null;
                        // Atualiza no backend
                        if (existingSettings.id) {
                            await db.collection<NotificationSettings>(COLLECTION_NAME).update(
                                existingSettings.id,
                                { silenciadoAte: null }
                            );
                        }
                    }
                }

                set({ settings: existingSettings, isLoading: false });
            } else {
                // Cria configurações padrão para o motorista
                const newSettings: Omit<NotificationSettings, 'id'> = {
                    ...DEFAULT_SETTINGS,
                    motoristaId,
                };

                const created = await db.collection<NotificationSettings>(COLLECTION_NAME).create(newSettings);

                set({ settings: { ...newSettings, id: created.id } as NotificationSettings, isLoading: false });
            }
        } catch (error: any) {
            console.error('[NotificationSettings] Erro ao buscar:', error);
            set({
                error: error?.message || 'Erro ao carregar configurações',
                isLoading: false
            });
        }
    },

    // ========================================
    // ATUALIZAR CONFIGURAÇÕES
    // ========================================
    updateSettings: async (input: UpdateNotificationSettingsInput) => {
        const { settings } = get();
        if (!settings?.id) {
            console.error('[NotificationSettings] Sem settings para atualizar');
            return;
        }

        set({ isLoading: true, error: null });

        try {
            const db = getDb();

            await db.collection<NotificationSettings>(COLLECTION_NAME).update(
                settings.id,
                {
                    ...input,
                    updatedAt: new Date().toISOString(),
                }
            );

            set({
                settings: { ...settings, ...input },
                isLoading: false
            });

            console.log('[NotificationSettings] ✅ Atualizado:', input);
        } catch (error: any) {
            console.error('[NotificationSettings] Erro ao atualizar:', error);
            set({
                error: error?.message || 'Erro ao atualizar configurações',
                isLoading: false
            });
        }
    },

    // ========================================
    // SILENCIAR TEMPORARIAMENTE
    // ========================================
    silenciarPor: async (opcao: SilenciarOpcao) => {
        const silenciadoAte = calcularFimSilenciamento(opcao);
        await get().updateSettings({ silenciadoAte });
    },

    // ========================================
    // ATIVAR NOTIFICAÇÕES (Remove silenciamento)
    // ========================================
    ativarNotificacoes: async () => {
        await get().updateSettings({
            notificacoesAtivas: true,
            silenciadoAte: null
        });
    },

    // ========================================
    // LIMPAR ERRO
    // ========================================
    clearError: () => {
        set({ error: null });
    },

    // ========================================
    // COMPUTED HELPERS
    // ========================================

    /**
     * Verifica se notificações estão ativas.
     * Considera master switch E silenciamento temporário.
     */
    isNotificacoesAtivas: () => {
        const { settings } = get();
        if (!settings) return true; // Default ativo

        // Verifica master switch
        if (!settings.notificacoesAtivas) return false;

        // Verifica silenciamento temporário
        if (settings.silenciadoAte) {
            const silenciadoAte = new Date(settings.silenciadoAte);
            if (silenciadoAte > new Date()) {
                return false; // Ainda silenciado
            }
        }

        return true;
    },

    /**
     * Verifica se está em período de silenciamento.
     */
    isSilenciado: () => {
        const { settings } = get();
        if (!settings?.silenciadoAte) return false;

        const silenciadoAte = new Date(settings.silenciadoAte);
        return silenciadoAte > new Date();
    },

    /**
     * Retorna tempo restante de silenciamento formatado.
     */
    getTempoRestanteSilenciamento: () => {
        const { settings } = get();
        if (!settings?.silenciadoAte) return null;

        return formatarTempoRestante(settings.silenciadoAte);
    },
}));
