// functions/index.ts
// ============================================
// ROTAFRETE - Índice de Funções Serverless
// ============================================
// Exporta todas as funções para deploy no Aether.
// ============================================

// Core Operations
export { default as deleteData } from './delete-data';
export { generateInspectionManual } from './generate-inspection-manual';
export { default as calculateFreight } from './calculate-freight';
export { createWeeklyInspection } from './create-weekly-inspection'; // [NOVO] CRON semanal

// Notifications & Reminders
export { enviarLembreteInspecao } from './enviar-lembrete-inspecao';
export { notificarAvaliacao } from './notificar-avaliacao';
export { notificarPrazoManutencao } from './notificar-prazo-manutencao';
export { notificarItemCritico } from './notificar-item-critico';
export { lembreteRegistrarRota } from './lembrete-registrar-rota';

// ============================================
// CONFIGURAÇÃO DE TRIGGERS
// ============================================
// Para configurar no painel do Aether:
//
// 1. enviarLembreteInspecao
//    - Tipo: CRON
//    - Expressão: "0 8 * * *" (08:00 diariamente)
//    - Descrição: Envia lembretes de inspeção pendente
//
// 2. notificarAvaliacao
//    - Tipo: Webhook
//    - Endpoint: /api/functions/notificar-avaliacao
//    - Método: POST
//    - Payload: { inspecaoId, motoristaId, avaliadoPor, avaliadoPorNome }
//    - Descrição: Chamado após admin finalizar avaliação
//
// 3. notificarPrazoManutencao
//    - Tipo: CRON
//    - Expressão: "0 7 * * *" (07:00 diariamente)
//    - Descrição: Verifica prazos de manutenção vencendo
//
// 4. lembreteRegistrarRota [NOVO]
//    - Tipo: CRON
//    - Expressão: "0 * * * *" (a cada hora)
//    - Descrição: Envia lembrete para motoristas que não registraram rotas
//
// 5. createWeeklyInspection [NOVO]
//    - Tipo: CRON
//    - Expressão: "0 8 * * 1" (Segunda-feira às 08:00)
//    - Timezone: America/Sao_Paulo
//    - Descrição: Cria inspeções semanais para todos os motoristas ativos
// ============================================
