// src/store/index.ts
// ============================================
// ROTAFRETE - Exportação Central de Stores
// ============================================
// Facilita imports: import { useRotasStore, useResumoFinanceiroStore } from '@/store'
// ============================================

export { useRotasStore } from './useRotasStore';
export { useAbastecimentosStore } from './useAbastecimentosStore';
export { usePedagiosStore } from './usePedagiosStore';
export { useManutencaoStore } from './useManutencaoStore';

// [NOVO] Store de Despesas Unificado
export { useDespesasStore } from './useDespesasStore';
export type { TipoDespesa, Despesa, ResumoDespesasSemana } from './useDespesasStore';

// [NOVO] Store de Agendamento de Manutenção
export { useAgendamentoStore } from './useAgendamentoStore';

// Store de Resumo Financeiro
export { useResumoFinanceiroStore } from './useResumoFinanceiroStore';

// Re-exporta tipos do store de resumo financeiro
export type {
    ResumoMensal
} from './useResumoFinanceiroStore';

// [NOVO] Store de Metas e Gamificação
export { useMetasStore } from './useMetasStore';
export type { Meta, Conquista, DadosConquista } from './useMetasStore';

// [NOVO] Store de Configurações de Notificações
export { useNotificationSettingsStore } from './useNotificationSettingsStore';
export type {
    NotificationSettings,
    UpdateNotificationSettingsInput,
    SilenciarOpcao
} from './useNotificationSettingsStore';
