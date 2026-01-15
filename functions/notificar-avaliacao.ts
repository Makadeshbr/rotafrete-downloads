// functions/notificar-avaliacao.ts
// ============================================
// ROTAFRETE - Função Serverless: Notificar Avaliação
// ============================================
// Chamada quando uma inspeção é avaliada para
// notificar o motorista sobre o resultado.
// ============================================
// Trigger: HTTP Invoke (Called by App)
// ============================================

export const config = {
  type: 'http',
  public: false, // Requires authentication
};

import { AetherFunction, getDb, getPush } from '@aether-baas/functions';
import type { InspecaoVeicular, ItemInspecao } from '../src/types/inspection';

// ============================================
// TIPOS
// ============================================

interface NotificacaoAvaliacaoInput {
  inspecaoId: string;
  motoristaId: string;
  avaliadoPor: string;
  avaliadoPorNome: string;
}

interface NotificacaoResult {
  enviado: boolean;
  mensagem: string;
}

// ============================================
// CONSTANTES
// ============================================

const COLLECTION_INSPECOES = 'inspecoes_veiculares';
const COLLECTION_ITENS = 'itens_inspecao';
const COLLECTION_CONFIG_MOTORISTA = 'config_inspecao_motorista';

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================

export const notificarAvaliacao: AetherFunction<NotificacaoAvaliacaoInput> = async (
  context
) => {
  const { inspecaoId, motoristaId } = context.data;

  console.log(`[NotificarAvaliacao] Processando inspeção: ${inspecaoId}`);

  const db = getDb();
  const push = getPush();

  try {
    // 1. Busca a inspeção
    const inspecao = (await db
      .collection(COLLECTION_INSPECOES)
      .get(inspecaoId)) as InspecaoVeicular | null;

    if (!inspecao) {
      console.error('[NotificarAvaliacao] Inspeção não encontrada');
      return { enviado: false, mensagem: 'Inspeção não encontrada' };
    }

    // 2. Verifica se motorista quer receber notificações de avaliação
    const configMotoristaResult = await db
      .collection(COLLECTION_CONFIG_MOTORISTA)
      .list({
        filter: { motoristaId },
        limit: 1,
      });

    const configMotorista = configMotoristaResult.data?.[0];
    if (configMotorista && !configMotorista.notificarAvaliacao) {
      console.log(
        '[NotificarAvaliacao] Motorista desativou notificações de avaliação'
      );
      return { enviado: false, mensagem: 'Notificações de avaliação desativadas' };
    }

    // 3. Busca itens para contar problemas
    const itensResult = await db.collection(COLLECTION_ITENS).list({
      filter: { inspecaoId },
      limit: 50,
    });

    const itens = (itensResult.data || []) as ItemInspecao[];
    const itensCriticos = itens.filter((i) => i.statusAvaliacao === 'CRITICO').length;
    const itensAtencao = itens.filter((i) => i.statusAvaliacao === 'ATENCAO').length;
    const itensAprovados = itens.filter((i) => i.statusAvaliacao === 'BOM_ESTADO').length;

    // 4. Monta a notificação baseada no resultado
    let titulo: string;
    let corpo: string;
    let icone: string;

    if (inspecao.status === 'APROVADA') {
      titulo = '✅ Inspeção Aprovada!';
      corpo = `Sua inspeção foi aprovada. Todos os ${itensAprovados} itens estão OK!`;
      icone = 'checkmark-circle';
    } else if (itensCriticos > 0) {
      titulo = '🚨 Inspeção com Itens Críticos';
      corpo = `Sua inspeção tem ${itensCriticos} item(s) crítico(s) que requerem manutenção urgente.`;
      icone = 'alert-circle';
    } else if (itensAtencao > 0) {
      titulo = '⚠️ Inspeção com Atenção';
      corpo = `Sua inspeção foi avaliada com ${itensAtencao} item(s) que precisam de atenção.`;
      icone = 'warning';
    } else {
      titulo = '📋 Inspeção Avaliada';
      corpo = `Sua inspeção semanal foi avaliada. Verifique os detalhes no app.`;
      icone = 'clipboard';
    }

    // 5. Envia push notification
    await push.send({
      userId: motoristaId,
      title: titulo,
      body: corpo,
      data: {
        type: 'avaliacao_concluida',
        inspecaoId,
        status: inspecao.status,
        itensCriticos,
        itensAtencao,
      },
      android: {
        channelId: 'avaliacoes',
        priority: itensCriticos > 0 ? 'high' : 'default',
      },
      ios: {
        sound: itensCriticos > 0 ? 'critical.wav' : 'default',
      },
    });

    console.log(`[NotificarAvaliacao] Notificação enviada - Status: ${inspecao.status}`);

    return {
      enviado: true,
      mensagem: `Notificação enviada: ${titulo}`,
    };
  } catch (error) {
    console.error('[NotificarAvaliacao] Erro:', error);
    return { enviado: false, mensagem: String(error) };
  }
};

export default notificarAvaliacao;
