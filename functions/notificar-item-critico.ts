// functions/notificar-item-critico.ts
// ============================================
// ROTAFRETE - Função Serverless: Notificar Item Crítico
// ============================================
// Chamada imediatamente quando um item é marcado
// como crítico para alertar o motorista.
// ============================================
// Trigger: HTTP Invoke (Called by App)
// ============================================

export const config = {
  type: 'http',
  public: false, // Requires authentication
};

import { AetherFunction, getDb, getPush } from '@aether-baas/functions';
import type { ItemInspecao, InspecaoVeicular } from '../src/types/inspection';

// ============================================
// TIPOS
// ============================================

interface NotificacaoCriticoInput {
  itemId: string;
  inspecaoId: string;
  motoristaId: string;
  itemNome: string;
  observacao?: string;
  prazoManutencao?: string;
}

// ============================================
// CONSTANTES
// ============================================

const COLLECTION_ITENS = 'itens_inspecao';
const COLLECTION_INSPECOES = 'inspecoes_veiculares';
const COLLECTION_CONFIG_MOTORISTA = 'config_inspecao_motorista';

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================

export const notificarItemCritico: AetherFunction<NotificacaoCriticoInput> = async (
  context
) => {
  const {
    itemId,
    inspecaoId,
    motoristaId,
    itemNome,
    observacao,
    prazoManutencao,
  } = context.data;

  console.log(`[NotificarCritico] Item: ${itemNome} - Inspeção: ${inspecaoId}`);

  const db = getDb();
  const push = getPush();

  try {
    // 1. Verifica se motorista quer receber alertas críticos
    const configMotoristaResult = await db
      .collection(COLLECTION_CONFIG_MOTORISTA)
      .list({
        filter: { motoristaId },
        limit: 1,
      });

    const configMotorista = configMotoristaResult.data?.[0];

    // Alertas críticos são prioritários, mas respeitamos a preferência
    if (configMotorista && !configMotorista.notificarCriticos) {
      console.log('[NotificarCritico] Motorista desativou alertas críticos');
      return { enviado: false, mensagem: 'Alertas críticos desativados' };
    }

    // 2. Monta mensagem com prazo se disponível
    let corpo = `O item "${itemNome}" foi marcado como CRÍTICO e requer manutenção urgente.`;

    if (prazoManutencao) {
      const prazoDate = new Date(prazoManutencao);
      const prazoFormatado = prazoDate.toLocaleDateString('pt-BR');
      corpo += ` Prazo: ${prazoFormatado}`;
    }

    if (observacao) {
      corpo += `\n\nObservação: ${observacao}`;
    }

    // 3. Envia push notification com alta prioridade
    await push.send({
      userId: motoristaId,
      title: '🚨 ITEM CRÍTICO DETECTADO',
      body: corpo,
      data: {
        type: 'item_critico',
        itemId,
        inspecaoId,
        itemNome,
        prazoManutencao,
      },
      android: {
        channelId: 'criticos',
        priority: 'high',
        vibrationPattern: [0, 500, 200, 500],
      },
      ios: {
        sound: 'critical.wav',
        badge: 1,
        interruptionLevel: 'critical',
      },
    });

    console.log(`[NotificarCritico] Alerta enviado para motorista: ${motoristaId}`);

    return {
      enviado: true,
      mensagem: `Alerta crítico enviado: ${itemNome}`,
    };
  } catch (error) {
    console.error('[NotificarCritico] Erro:', error);
    return { enviado: false, mensagem: String(error) };
  }
};

export default notificarItemCritico;
