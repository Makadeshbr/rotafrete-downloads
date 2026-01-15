// rotafrete/functions/maintenance-reminder.ts
// ============================================
// ROTAFRETE - Aether Cron Function: Lembrete de Manutenção
// ============================================
// Roda diariamente às 8h da manhã (horário de Brasília)
// Busca manutenções agendadas para o dia e envia push
// ============================================
// Deploy: aether deploy (detecta automaticamente config.type = 'cron')
// ============================================

// ============================================
// TIPOS
// ============================================

interface AgendamentoManutencao {
    id: string;
    motoristaId: string;
    veiculoId: string;
    parteVeiculo: string;
    dataAgendada: string;
    status: 'AGENDADA' | 'CONCLUIDA' | 'CANCELADA';
    observacoes?: string;
}

interface Motorista {
    id: string;
    nome: string;
    telefone?: string;
}

interface Veiculo {
    id: string;
    placa: string;
    modelo: string;
}

interface CronResponse {
    success: boolean;
    message: string;
    notificationsSent: number;
    agendamentosHoje: number;
    errors?: string[];
    executionTimeMs: number;
}

/**
 * Contexto fornecido pelo Aether runtime para funções serverless.
 * Contém acesso ao banco de dados, push notifications, e metadados.
 */
interface AetherContext {
    /** ID do projeto */
    projectId: string;

    /** Operações de banco de dados */
    db: {
        collection<T>(name: string): {
            find(filter?: Record<string, any>): Promise<T[]>;
            findById(id: string): Promise<T | null>;
            findOne(filter: Record<string, any>): Promise<T | null>;
            create(data: Partial<T>): Promise<T>;
            update(id: string, data: Partial<T>): Promise<T>;
            delete(id: string): Promise<boolean>;
        };
    };

    /** Push notifications */
    push: {
        send(options: {
            userId: string;
            title: string;
            body: string;
            data?: Record<string, any>;
        }): Promise<{ success: boolean; messageId?: string }>;

        sendToMany(options: {
            userIds: string[];
            title: string;
            body: string;
            data?: Record<string, any>;
        }): Promise<{ success: number; failed: number }>;
    };

    /** Logging estruturado */
    log: {
        info(message: string, data?: Record<string, any>): void;
        warn(message: string, data?: Record<string, any>): void;
        error(message: string, data?: Record<string, any>): void;
    };

    /** Variáveis de ambiente do projeto */
    env: Record<string, string | undefined>;
}

// ============================================
// UTILITÁRIOS
// ============================================

/**
 * Retorna a data atual no timezone especificado (formato YYYY-MM-DD)
 */
function getDateInTimezone(timezone: string = 'America/Sao_Paulo'): string {
    try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
        return formatter.format(now);
    } catch {
        // Fallback para cálculo manual (UTC-3)
        const now = new Date();
        now.setHours(now.getHours() - 3);
        return now.toISOString().split('T')[0];
    }
}

/**
 * Formata parte do veículo para exibição amigável
 */
function formatParteVeiculo(parte: string): string {
    const partes: Record<string, string> = {
        'OLEO_MOTOR': 'troca de óleo',
        'PNEUS': 'verificação dos pneus',
        'FREIOS': 'manutenção dos freios',
        'SUSPENSAO': 'verificação da suspensão',
        'FILTROS': 'troca de filtros',
        'CORREIA': 'verificação da correia',
        'BATERIA': 'verificação da bateria',
    };
    return partes[parte] || parte.toLowerCase().replace(/_/g, ' ');
}

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================

/**
 * Função Cron que roda às 8h da manhã (timezone configurável)
 * 
 * 1. Busca todos os agendamentos para hoje com status AGENDADA
 * 2. Para cada agendamento, busca dados do motorista e veículo
 * 3. Envia push notification personalizada
 * 4. Retorna relatório de execução
 */
export default async function maintenanceReminder(
    _payload: null,
    ctx: AetherContext
): Promise<CronResponse> {
    const startTime = Date.now();
    const errors: string[] = [];

    // Usa timezone do env ou default Brasil
    const timezone = ctx.env.TIMEZONE || 'America/Sao_Paulo';
    const hojeStr = getDateInTimezone(timezone);

    ctx.log.info(`⏰ Iniciando verificação de manutenções`, {
        data: hojeStr,
        timezone
    });

    try {
        // 1. Busca agendamentos do dia com status AGENDADA
        const agendamentosHoje = await ctx.db
            .collection<AgendamentoManutencao>('agendamentos_manutencao')
            .find({
                dataAgendada: hojeStr,
                status: 'AGENDADA'
            });

        ctx.log.info(`📋 Encontrados ${agendamentosHoje.length} agendamentos para hoje`);

        if (agendamentosHoje.length === 0) {
            return {
                success: true,
                message: 'Nenhuma manutenção agendada para hoje',
                notificationsSent: 0,
                agendamentosHoje: 0,
                executionTimeMs: Date.now() - startTime
            };
        }

        let notificationsSent = 0;

        // 2. Processa cada agendamento
        for (const agendamento of agendamentosHoje) {
            try {
                // Busca dados do motorista e veículo em paralelo para performance
                const [motorista, veiculo] = await Promise.all([
                    ctx.db.collection<Motorista>('motoristas').findById(agendamento.motoristaId),
                    ctx.db.collection<Veiculo>('veiculos').findById(agendamento.veiculoId)
                ]);

                const nomeMotorista = motorista?.nome || 'Motorista';
                const placaVeiculo = veiculo?.placa || 'veículo';
                const parteFormatada = formatParteVeiculo(agendamento.parteVeiculo);

                // 3. Envia push notification
                const result = await ctx.push.send({
                    userId: agendamento.motoristaId,
                    title: '🔧 Lembrete: Manutenção Hoje!',
                    body: `Olá ${nomeMotorista}! Sua ${parteFormatada} do veículo ${placaVeiculo} está agendada para hoje.`,
                    data: {
                        screen: '/(tabs)/maintenance',
                        agendamentoId: agendamento.id,
                        type: 'MAINTENANCE_REMINDER',
                        action: 'VIEW_MAINTENANCE'
                    }
                });

                if (result.success) {
                    ctx.log.info(`✅ Push enviado`, {
                        motoristaId: agendamento.motoristaId,
                        messageId: result.messageId
                    });
                    notificationsSent++;
                } else {
                    throw new Error('Push send returned success=false');
                }

            } catch (pushError: any) {
                const errorMsg = `Erro ao enviar para ${agendamento.motoristaId}: ${pushError.message}`;
                ctx.log.error(`❌ ${errorMsg}`);
                errors.push(errorMsg);
                // Continua para os próximos, não falha tudo
            }
        }

        ctx.log.info(`📤 Total: ${notificationsSent}/${agendamentosHoje.length} notificações enviadas`);

        return {
            success: errors.length === 0,
            message: errors.length === 0
                ? 'Todos os lembretes enviados com sucesso'
                : `${notificationsSent} enviados, ${errors.length} falhas`,
            notificationsSent,
            agendamentosHoje: agendamentosHoje.length,
            errors: errors.length > 0 ? errors : undefined,
            executionTimeMs: Date.now() - startTime
        };

    } catch (error: any) {
        ctx.log.error(`❌ Erro fatal ao processar lembretes`, { error: error.message });

        return {
            success: false,
            message: error.message || 'Erro desconhecido',
            notificationsSent: 0,
            agendamentosHoje: 0,
            errors: [error.message],
            executionTimeMs: Date.now() - startTime
        };
    }
}

// ============================================
// CONFIGURAÇÃO DA FUNÇÃO (detectada pelo CLI)
// ============================================

export const config = {
    type: 'cron',
    schedule: '0 8 * * *', // Todo dia às 8h da manhã
    timezone: 'America/Sao_Paulo',
    description: 'Envia lembretes de manutenção agendada para hoje às 8h da manhã'
};
