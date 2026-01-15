// functions/lembrete-registrar-rota.ts
// ============================================
// ROTAFRETE - Função Serverless: Lembrete de Rotas
// ============================================
// Executada via CRON a cada hora para enviar
// lembretes aos motoristas que não registraram
// rotas no dia.
// ============================================
// Configurar no Aether: CRON "0 * * * *" (a cada hora)
// ============================================

import { AetherFunction, getDb, getPush } from '@aether-baas/functions';

// ============================================
// TIPOS
// ============================================

interface NotificationSettings {
    id: string;
    motoristaId: string;
    notificacoesAtivas: boolean;
    silenciadoAte: string | null;
    lembreteRotaDiario: boolean;
    horaLembreteRota: string;
}

interface LembreteResult {
    enviados: number;
    falhas: number;
    ignorados: number;
    usuarios: string[];
}

// ============================================
// CONSTANTES
// ============================================

const COLLECTION_SETTINGS = 'notification_settings';
const COLLECTION_ROTAS = 'rotas';
const COLLECTION_USERS = 'tenant_users';

// ============================================
// HELPERS
// ============================================

/**
 * Verifica se a hora atual bate com o horário configurado.
 * Usa uma janela de tolerância de 5 minutos.
 */
function isHoraLembrete(horaConfig: string, horaAtual: number, minutoAtual: number): boolean {
    const [horaLembrete, minutoLembrete] = horaConfig.split(':').map(Number);

    // Verifica se está na mesma hora e dentro dos primeiros 5 minutos
    if (horaAtual === horaLembrete && minutoAtual >= 0 && minutoAtual < 5) {
        return true;
    }

    return false;
}

/**
 * Verifica se o usuário está silenciado.
 */
function isSilenciado(settings: NotificationSettings): boolean {
    if (!settings.silenciadoAte) return false;

    const silenciadoAte = new Date(settings.silenciadoAte);
    return silenciadoAte > new Date();
}

/**
 * Retorna o início do dia (meia-noite) para uma data.
 */
function getInicioDodia(data: Date): Date {
    const inicio = new Date(data);
    inicio.setHours(0, 0, 0, 0);
    return inicio;
}

/**
 * Retorna o fim do dia (23:59:59) para uma data.
 */
function getFimDoDia(data: Date): Date {
    const fim = new Date(data);
    fim.setHours(23, 59, 59, 999);
    return fim;
}

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================

export const lembreteRegistrarRota: AetherFunction = async (context) => {
    const db = getDb();
    const push = getPush();
    const agora = new Date();

    // Ajusta para horário de Brasília (UTC-3)
    const horaAtual = (agora.getUTCHours() - 3 + 24) % 24;
    const minutoAtual = agora.getMinutes();

    console.log(`[LembreteRota] Iniciando - ${agora.toISOString()}`);
    console.log(`[LembreteRota] Hora local (BRT): ${horaAtual}:${minutoAtual.toString().padStart(2, '0')}`);

    const resultado: LembreteResult = {
        enviados: 0,
        falhas: 0,
        ignorados: 0,
        usuarios: [],
    };

    try {
        // 1. Busca todos os usuários com lembrete ativo
        const settingsResult = await db.collection(COLLECTION_SETTINGS).list({
            filter: {
                notificacoesAtivas: true,
                lembreteRotaDiario: true,
            },
            limit: 500,
        });

        const settingsList = (settingsResult.data || []) as NotificationSettings[];
        console.log(`[LembreteRota] Usuários com lembrete ativo: ${settingsList.length}`);

        if (settingsList.length === 0) {
            return { success: true, message: 'Nenhum usuário com lembrete ativo', resultado };
        }

        // 2. Filtra apenas os que devem receber lembrete na hora atual
        const usuariosParaNotificar = settingsList.filter((settings: NotificationSettings) => {
            // Verifica se é a hora do lembrete
            const horaLembrete = settings.horaLembreteRota || '19:00';
            if (!isHoraLembrete(horaLembrete, horaAtual, minutoAtual)) {
                return false;
            }

            // Verifica se não está silenciado
            if (isSilenciado(settings)) {
                console.log(`[LembreteRota] Motorista ${settings.motoristaId} silenciado`);
                return false;
            }

            return true;
        });

        console.log(`[LembreteRota] Usuários para notificar agora: ${usuariosParaNotificar.length}`);

        if (usuariosParaNotificar.length === 0) {
            return { success: true, message: 'Nenhum usuário na hora do lembrete', resultado };
        }

        // 3. Para cada usuário, verifica se já registrou rota hoje
        const inicioDia = getInicioDodia(agora);
        const fimDia = getFimDoDia(agora);

        for (const settings of usuariosParaNotificar) {
            try {
                // Verifica se já registrou rota hoje
                const rotasHoje = await db.collection(COLLECTION_ROTAS).list({
                    filter: {
                        motoristaId: settings.motoristaId,
                        createdAt: {
                            $gte: inicioDia.toISOString(),
                            $lte: fimDia.toISOString(),
                        },
                    },
                    limit: 1,
                });

                if (rotasHoje.data && rotasHoje.data.length > 0) {
                    console.log(`[LembreteRota] Motorista ${settings.motoristaId} já registrou rota hoje`);
                    resultado.ignorados++;
                    continue;
                }

                // Busca nome do motorista para log
                let nomeMotorista = settings.motoristaId;
                try {
                    const userResult = await db.collection(COLLECTION_USERS).get(settings.motoristaId);
                    if (userResult && (userResult as any).name) {
                        nomeMotorista = (userResult as any).name;
                    }
                } catch (e) {
                    // Ignora erro ao buscar nome
                }

                // Envia push notification
                await push.send({
                    userId: settings.motoristaId,
                    title: '📝 Registre sua rota!',
                    body: 'Não esqueça de registrar os km rodados hoje. Mantenha seu histórico atualizado!',
                    data: {
                        type: 'lembrete_rota',
                        action: 'registrar_rota',
                    },
                });

                resultado.enviados++;
                resultado.usuarios.push(nomeMotorista);
                console.log(`[LembreteRota] ✅ Enviado para: ${nomeMotorista}`);

            } catch (error) {
                console.error(`[LembreteRota] ❌ Erro para motorista ${settings.motoristaId}:`, error);
                resultado.falhas++;
            }
        }

        console.log(`[LembreteRota] Finalizado - Enviados: ${resultado.enviados}, Ignorados: ${resultado.ignorados}, Falhas: ${resultado.falhas}`);

        return { success: true, resultado };

    } catch (error) {
        console.error('[LembreteRota] Erro geral:', error);
        return { success: false, error: String(error) };
    }
};

// ============================================
// CONFIGURAÇÃO
// ============================================

export const config = {
    type: 'cron',
    schedule: '0 * * * *', // A cada hora, no minuto 0
};

export default lembreteRegistrarRota;
