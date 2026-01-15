// functions/notificar-prazo-manutencao.ts
// ============================================
// ROTAFRETE - Função Serverless: Prazo de Manutenção
// ============================================
// Executada diariamente para notificar motoristas
// sobre itens críticos com prazo próximo de vencer.
// ============================================
// Configurar no Aether: CRON "0 7 * * *" (07:00 diariamente)
// ============================================

import { AetherFunction, getDb, getPush } from '@aether-baas/functions';
import type { ItemInspecao, InspecaoVeicular } from '../src/types/inspection';

// ============================================
// TIPOS
// ============================================

interface PrazoResult {
  notificados: number;
  vencidos: number;
  proximosVencer: number;
  detalhes: Array<{
    motorista: string;
    item: string;
    diasRestantes: number;
  }>;
}

// ============================================
// CONSTANTES
// ============================================

const COLLECTION_ITENS = 'itens_inspecao';
const COLLECTION_INSPECOES = 'inspecoes_veiculares';
const COLLECTION_CONFIG_MOTORISTA = 'config_inspecao_motorista';

// ============================================
// HELPERS
// ============================================

/**
 * Calcula dias restantes até uma data.
 */
function diasAte(dataAlvo: Date | string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const alvo = new Date(dataAlvo);
  alvo.setHours(0, 0, 0, 0);

  const diffMs = alvo.getTime() - hoje.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================

export const notificarPrazoManutencao: AetherFunction = async (context) => {
  const db = getDb();
  const push = getPush();
  const hoje = new Date();

  console.log(`[PrazoManutencao] Iniciando verificação - ${hoje.toISOString()}`);

  const resultado: PrazoResult = {
    notificados: 0,
    vencidos: 0,
    proximosVencer: 0,
    detalhes: [],
  };

  try {
    // 1. Busca itens com prazo de manutenção definido
    const itensResult = await db.collection(COLLECTION_ITENS).list({
      filter: {
        prazoManutencao: { $exists: true },
        statusAvaliacao: { $in: ['CRITICO', 'ATENCAO'] },
        requerReenvio: true,
      },
      limit: 500,
    });

    const itensComPrazo = (itensResult.data || []) as ItemInspecao[];
    console.log(`[PrazoManutencao] Itens com prazo: ${itensComPrazo.length}`);

    if (itensComPrazo.length === 0) {
      return { success: true, message: 'Nenhum item com prazo pendente', resultado };
    }

    // 2. Agrupa itens por inspeção para buscar dados do motorista
    const itensPorInspecao: Record<string, ItemInspecao[]> = {};
    for (const item of itensComPrazo) {
      if (!itensPorInspecao[item.inspecaoId]) {
        itensPorInspecao[item.inspecaoId] = [];
      }
      itensPorInspecao[item.inspecaoId].push(item);
    }

    // 3. Processa cada inspeção
    for (const [inspecaoId, itens] of Object.entries(itensPorInspecao)) {
      try {
        // Busca dados da inspeção
        const inspecao = (await db
          .collection(COLLECTION_INSPECOES)
          .get(inspecaoId)) as InspecaoVeicular | null;

        if (!inspecao) continue;

        // Verifica config do motorista
        const configResult = await db
          .collection(COLLECTION_CONFIG_MOTORISTA)
          .list({
            filter: { motoristaId: inspecao.motoristaId },
            limit: 1,
          });

        const config = configResult.data?.[0];
        if (config && !config.notificarCriticos) {
          console.log(
            `[PrazoManutencao] Notificações de críticos desativadas: ${inspecao.motoristaId}`
          );
          continue;
        }

        // Analisa os prazos dos itens
        const itensVencidos: ItemInspecao[] = [];
        const itensVencendoHoje: ItemInspecao[] = [];
        const itensVencendo3Dias: ItemInspecao[] = [];

        for (const item of itens) {
          if (!item.prazoManutencao) continue;

          const diasRestantes = diasAte(item.prazoManutencao);

          if (diasRestantes < 0) {
            itensVencidos.push(item);
            resultado.vencidos++;
          } else if (diasRestantes === 0) {
            itensVencendoHoje.push(item);
            resultado.proximosVencer++;
          } else if (diasRestantes <= 3) {
            itensVencendo3Dias.push(item);
            resultado.proximosVencer++;
          }

          resultado.detalhes.push({
            motorista: inspecao.motorista.nome,
            item: item.nomeExibicao,
            diasRestantes,
          });
        }

        // Envia notificação se necessário
        let titulo = '';
        let corpo = '';
        let prioridade = 'default';

        if (itensVencidos.length > 0) {
          titulo = '🚨 Prazo de Manutenção VENCIDO!';
          corpo = `${itensVencidos.length} item(s) com prazo vencido. Regularize imediatamente!`;
          prioridade = 'high';
        } else if (itensVencendoHoje.length > 0) {
          titulo = '⏰ Prazo de Manutenção HOJE!';
          corpo = `${itensVencendoHoje.length} item(s) com prazo vencendo hoje. Não deixe para depois!`;
          prioridade = 'high';
        } else if (itensVencendo3Dias.length > 0) {
          titulo = '⚠️ Prazo de Manutenção Próximo';
          corpo = `${itensVencendo3Dias.length} item(s) com prazo nos próximos 3 dias.`;
        }

        if (titulo) {
          await push.send({
            userId: inspecao.motoristaId,
            title: titulo,
            body: corpo,
            data: {
              type: 'prazo_manutencao',
              inspecaoId,
              itensVencidos: itensVencidos.length,
              itensVencendoHoje: itensVencendoHoje.length,
              itensVencendo3Dias: itensVencendo3Dias.length,
            },
            android: {
              channelId: 'manutencao',
              priority: prioridade as 'high' | 'default',
            },
            ios: {
              sound: prioridade === 'high' ? 'critical.wav' : 'default',
            },
          });

          resultado.notificados++;
          console.log(
            `[PrazoManutencao] Notificado: ${inspecao.motorista.nome} - ${titulo}`
          );
        }
      } catch (error) {
        console.error(
          `[PrazoManutencao] Erro ao processar inspeção ${inspecaoId}:`,
          error
        );
      }
    }

    console.log(
      `[PrazoManutencao] Finalizado - Notificados: ${resultado.notificados}, Vencidos: ${resultado.vencidos}`
    );

    return { success: true, resultado };
  } catch (error) {
    console.error('[PrazoManutencao] Erro geral:', error);
    return { success: false, error: String(error) };
  }
};

export default notificarPrazoManutencao;
