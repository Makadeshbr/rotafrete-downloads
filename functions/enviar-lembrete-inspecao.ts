// functions/enviar-lembrete-inspecao.ts
// ============================================
// ROTAFRETE - Função Serverless: Lembrete de Inspeção
// ============================================
// Executada via CRON diariamente para enviar
// lembretes aos motoristas sobre inspeções pendentes.
// ============================================
// Configurar no Aether: CRON "0 8 * * *" (08:00 diariamente)
// ============================================

import { AetherFunction, getDb, getPush } from '@aether-baas/functions';
import type {
  InspecaoVeicular,
  ConfigInspecaoMotorista,
  ConfigInspecaoGlobal,
} from '../src/types/inspection';

// ============================================
// TIPOS
// ============================================

interface LembreteResult {
  enviados: number;
  falhas: number;
  motoristas: string[];
}

// ============================================
// CONSTANTES
// ============================================

const COLLECTION_INSPECOES = 'inspecoes_veiculares';
const COLLECTION_CONFIG_MOTORISTA = 'config_inspecao_motorista';
const COLLECTION_CONFIG_GLOBAL = 'config_inspecao_global';

// Mapeamento de dia da semana (0 = Domingo, 1 = Segunda, etc.)
const DIAS_SEMANA_MAP: Record<number, number> = {
  0: 0, // Domingo
  1: 1, // Segunda
  2: 2, // Terça
  3: 3, // Quarta
  4: 4, // Quinta
  5: 5, // Sexta
  6: 6, // Sábado
};

// ============================================
// HELPERS
// ============================================

/**
 * Retorna a semana ISO atual no formato YYYY-Www
 */
function getSemanaISO(data: Date = new Date()): string {
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = Math.round(
    ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
  ) + 1;
  return `${d.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
}

/**
 * Verifica se é o dia de enviar lembrete para o motorista.
 */
function deveEnviarLembrete(
  configMotorista: ConfigInspecaoMotorista | null,
  configGlobal: ConfigInspecaoGlobal,
  hojeData: Date
): { deveLembrete: boolean; tipo: 'principal' | 'antecipado' } {
  const diaSemanaHoje = hojeData.getDay(); // 0-6
  const horaAtual = hojeData.getHours();
  const minutoAtual = hojeData.getMinutes();

  // Usa config do motorista ou global
  const diaLembrete = configMotorista?.diaLembretePrincipal ?? configGlobal.diaLembretePadrao;
  const horaLembrete = configMotorista?.horaLembretePrincipal ?? configGlobal.horaLembretePadrao;
  const lembreteAntecipado = configMotorista?.lembreteAntecipado ?? true;
  const horaAntecipado = configMotorista?.horaLembreteAntecipado ?? '08:00';

  // Parse da hora
  const [horaLembreteNum, minutoLembreteNum] = horaLembrete.split(':').map(Number);
  const [horaAntecipadoNum, minutoAntecipadoNum] = horaAntecipado.split(':').map(Number);

  // Verifica lembrete principal
  if (
    diaSemanaHoje === diaLembrete &&
    horaAtual === horaLembreteNum &&
    minutoAtual >= minutoLembreteNum &&
    minutoAtual < minutoLembreteNum + 5 // Janela de 5 minutos
  ) {
    return { deveLembrete: true, tipo: 'principal' };
  }

  // Verifica lembrete antecipado (1 dia antes do prazo)
  if (lembreteAntecipado) {
    const diaPrazo = configGlobal.diaPrazoEnvio;
    const diaAntes = diaPrazo === 0 ? 6 : diaPrazo - 1; // Dia anterior ao prazo

    if (
      diaSemanaHoje === diaAntes &&
      horaAtual === horaAntecipadoNum &&
      minutoAtual >= minutoAntecipadoNum &&
      minutoAtual < minutoAntecipadoNum + 5
    ) {
      return { deveLembrete: true, tipo: 'antecipado' };
    }
  }

  return { deveLembrete: false, tipo: 'principal' };
}

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================

export const enviarLembreteInspecao: AetherFunction = async (context) => {
  const db = getDb();
  const push = getPush();
  const hojeData = new Date();
  const semanaAtual = getSemanaISO(hojeData);

  console.log(`[Lembrete] Iniciando verificação - ${hojeData.toISOString()}`);
  console.log(`[Lembrete] Semana atual: ${semanaAtual}`);

  const resultado: LembreteResult = {
    enviados: 0,
    falhas: 0,
    motoristas: [],
  };

  try {
    // 1. Busca configuração global
    const configGlobalResult = await db.collection(COLLECTION_CONFIG_GLOBAL).list({ limit: 1 });
    const configGlobal = configGlobalResult.data?.[0] as ConfigInspecaoGlobal | undefined;

    if (!configGlobal) {
      console.error('[Lembrete] Configuração global não encontrada');
      return { success: false, error: 'Configuração global não encontrada' };
    }

    // 2. Busca inspeções pendentes da semana atual
    const inspecoesResult = await db.collection(COLLECTION_INSPECOES).list({
      filter: {
        semanaReferencia: semanaAtual,
        status: { $in: ['PENDENTE', 'PARCIAL'] },
      },
      limit: 500,
    });

    const inspecoesPendentes = (inspecoesResult.data || []) as InspecaoVeicular[];
    console.log(`[Lembrete] Inspeções pendentes: ${inspecoesPendentes.length}`);

    if (inspecoesPendentes.length === 0) {
      return { success: true, message: 'Nenhuma inspeção pendente', resultado };
    }

    // 3. Para cada inspeção pendente, verifica se deve enviar lembrete
    for (const inspecao of inspecoesPendentes) {
      try {
        // Busca config do motorista
        const configMotoristaResult = await db
          .collection(COLLECTION_CONFIG_MOTORISTA)
          .list({
            filter: { motoristaId: inspecao.motoristaId },
            limit: 1,
          });

        const configMotorista = configMotoristaResult.data?.[0] as
          | ConfigInspecaoMotorista
          | undefined;

        // Verifica se notificações estão ativas
        if (configMotorista && !configMotorista.notificacoesAtivas) {
          console.log(
            `[Lembrete] Notificações desativadas para motorista: ${inspecao.motoristaId}`
          );
          continue;
        }

        // Verifica se é hora de enviar
        const { deveLembrete, tipo } = deveEnviarLembrete(
          configMotorista || null,
          configGlobal,
          hojeData
        );

        if (!deveLembrete) {
          continue;
        }

        // Monta a notificação
        const progresso = inspecao.totalItens > 0
          ? Math.round((inspecao.itensEnviados / inspecao.totalItens) * 100)
          : 0;

        const titulo =
          tipo === 'antecipado'
            ? '⏰ Inspeção vence amanhã!'
            : '📋 Lembrete de Inspeção';

        const corpo =
          tipo === 'antecipado'
            ? `Sua inspeção semanal vence amanhã. Progresso: ${progresso}%`
            : `Hora de enviar sua inspeção semanal! Progresso atual: ${progresso}%`;

        // Envia push notification
        await push.send({
          userId: inspecao.motoristaId,
          title: titulo,
          body: corpo,
          data: {
            type: 'lembrete_inspecao',
            inspecaoId: inspecao.id,
            semana: semanaAtual,
          },
        });

        resultado.enviados++;
        resultado.motoristas.push(inspecao.motorista.nome);

        console.log(
          `[Lembrete] Enviado para ${inspecao.motorista.nome} (${tipo})`
        );
      } catch (error) {
        console.error(
          `[Lembrete] Erro ao enviar para ${inspecao.motoristaId}:`,
          error
        );
        resultado.falhas++;
      }
    }

    console.log(
      `[Lembrete] Finalizado - Enviados: ${resultado.enviados}, Falhas: ${resultado.falhas}`
    );

    return { success: true, resultado };
  } catch (error) {
    console.error('[Lembrete] Erro geral:', error);
    return { success: false, error: String(error) };
  }
};

export default enviarLembreteInspecao;
