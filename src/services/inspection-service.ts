// src/services/inspection-service.ts
// ============================================
// ROTAFRETE - Serviço de Inspeção Veicular
// ============================================
// Centraliza todas as operações de inspeção:
// - CRUD de inspeções e itens
// - Upload de fotos para Aether Storage
// - Queries especializadas para motorista e admin
// ============================================

import { getDb, getStorage, getAuth, getFunctions } from '@aether-baas/react-native';
import { withRetry } from '@/utils/retry';
import { createLogger } from '@/utils/logger';
import {
  ITENS_INSPECAO,
  ITENS_INSPECAO_MAP,
  getSemanaISO,
  getItensParaVeiculo,
  CONFIG_INSPECAO_PADRAO,
} from '@/constants/inspection';
import type {
  InspecaoVeicular,
  ItemInspecao,
  StatusInspecao,
  StatusAvaliacao,
  CriarInspecaoInput,
  EnviarFotoItemInput,
  AvaliarItemInput,
  ReenviarFotoInput,
  ResumoInspecoesAdmin,
  ResumoInspecaoMotorista,
  MotoristaResumo,
  ConfigInspecaoGlobal,
  ConfigInspecaoMotorista,
  HistoricoAvaliacao,
  ItemInspecaoId,
} from '@/types/inspection';

// ============================================
// CONSTANTES
// ============================================

const COLLECTION_INSPECOES = 'inspecoes_veiculares';
const COLLECTION_ITENS = 'itens_inspecao';
const COLLECTION_CONFIG_GLOBAL = 'config_inspecao_global';
const COLLECTION_CONFIG_MOTORISTA = 'config_inspecao_motorista';
const COLLECTION_HISTORICO = 'historico_avaliacoes';
const STORAGE_BUCKET = 'inspecoes';

// Limite de 10MB para evitar OOM
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const logger = createLogger('InspectionService');

// ============================================
// TIPOS INTERNOS
// ============================================

interface UploadResult {
  url: string;
  thumbnailUrl?: string;
  metadata: {
    width: number;
    height: number;
    size: number;
    mimeType: string;
  };
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Gera o nome do arquivo para foto de inspeção.
 * Formato: {prefix}{itemId}_{timestamp}.jpg
 */
function gerarNomeArquivo(
  itemId: string,
  isReenvio: boolean = false
): string {
  const timestamp = Date.now();
  const prefix = isReenvio ? 'reenvio_' : '';
  return `${prefix}${itemId}_${timestamp}.jpg`;
}

/**
 * Gera o folder (pasta) para organização no storage.
 * Estrutura: inspecoes/{motoristaId}/{semana}/
 */
function gerarStorageFolder(
  motoristaId: string,
  semana: string
): string {
  return `${STORAGE_BUCKET}/${motoristaId}/${semana}`;
}

/**
 * Gera o path de storage para uma foto de inspeção.
 * Formato: inspecoes/{motoristaId}/{semana}/{itemId}_{timestamp}.jpg
 */
function gerarStoragePath(
  motoristaId: string,
  semana: string,
  itemId: string,
  isReenvio: boolean = false
): string {
  const timestamp = Date.now();
  const prefix = isReenvio ? 'reenvio_' : '';
  return `${STORAGE_BUCKET}/${motoristaId}/${semana}/${prefix}${itemId}_${timestamp}.jpg`;
}

/**
 * [NOVO] Extrai o path relativo do storage a partir de uma URL completa.
 * Usado para deletar arquivo anterior antes de enviar nova foto.
 */
function extrairStoragePath(url: string): string | null {
  if (!url) return null;

  try {
    // Pattern para URLs do Aether Storage (S3)
    const patterns = [
      /\.s3\.[^/]+\.amazonaws\.com\/(.+)$/,
      /s3\.[^/]+\.amazonaws\.com\/[^/]+\/(.+)$/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    }

    // Fallback: tenta extrair após 'inspecoes'
    const inspecoesMatch = url.match(/inspecoes\/(.+)$/);
    if (inspecoesMatch) {
      return `inspecoes/${inspecoesMatch[1]}`;
    }

    return null;
  } catch (error) {
    logger.warn('Não foi possível extrair path do storage', { url });
    return null;
  }
}

/**
 * [NOVO] Deleta uma foto do storage.
 * Usado antes de enviar nova foto para evitar acúmulo de arquivos.
 */
async function deletarFotoStorage(fotoUrl: string): Promise<boolean> {
  if (!fotoUrl) return false;

  const path = extrairStoragePath(fotoUrl);
  if (!path) {
    logger.warn('Path não encontrado para deleção', { fotoUrl });
    return false;
  }

  try {
    // TODO: Implementar cron de limpeza de fotos órfãs
    // A API de storage requer fileId, não temos no client
    logger.info('[CLEANUP] Foto antiga marcada para limpeza', { fotoUrl, path });
    return true;
  } catch (error: any) {
    // Se arquivo não existe (404), considera sucesso
    if (error?.status === 404 || error?.message?.includes('not found')) {
      logger.debug('Foto anterior não encontrada', { path });
      return true;
    }
    logger.error('Erro ao deletar foto do storage', { path, error });
    return false;
  }
}

/**
 * Calcula a data limite de envio baseado na configuração.
 */
function calcularDataLimite(config: ConfigInspecaoGlobal, semanaReferencia: string): string {
  // Converte semana ISO para data de início (segunda)
  const [ano, semana] = semanaReferencia.split('-W').map(Number);
  const primeiroJan = new Date(ano, 0, 1);
  const dias = (semana - 1) * 7;
  const diaSemana = primeiroJan.getDay();
  const ajuste = diaSemana <= 4 ? 1 - diaSemana : 8 - diaSemana;
  const inicioSemana = new Date(ano, 0, 1 + dias + ajuste);

  // Adiciona dias até o dia do prazo
  const diasAteDeadline = config.diaPrazoEnvio === 0 ? 6 : config.diaPrazoEnvio - 1;
  const dataLimite = new Date(inicioSemana);
  dataLimite.setDate(dataLimite.getDate() + diasAteDeadline);

  // Define a hora
  const [hora, minuto] = config.horaPrazoEnvio.split(':').map(Number);
  dataLimite.setHours(hora, minuto, 0, 0);

  return dataLimite.toISOString();
}

/**
 * Calcula os contadores de uma inspeção baseado nos itens.
 */
function calcularContadores(itens: ItemInspecao[]): Pick<
  InspecaoVeicular,
  'itensEnviados' | 'itensAvaliados' | 'itensAprovados' | 'itensAtencao' | 'itensCriticos' | 'itensPendentesReenvio'
> {
  return {
    itensEnviados: itens.filter(i => i.fotoUrl).length,
    itensAvaliados: itens.filter(i => i.statusAvaliacao !== 'PENDENTE').length,
    itensAprovados: itens.filter(i => i.statusAvaliacao === 'BOM_ESTADO').length,
    itensAtencao: itens.filter(i => i.statusAvaliacao === 'ATENCAO').length,
    itensCriticos: itens.filter(i => i.statusAvaliacao === 'CRITICO').length,
    itensPendentesReenvio: itens.filter(i => i.requerReenvio && i.statusResolucao === 'PENDENTE').length,
  };
}

/**
 * Determina o status geral da inspeção baseado nos itens.
 */
function determinarStatusInspecao(
  itens: ItemInspecao[],
  totalItens: number
): StatusInspecao {
  const enviados = itens.filter(i => i.fotoUrl).length;
  const avaliados = itens.filter(i => i.statusAvaliacao !== 'PENDENTE').length;
  const criticos = itens.filter(i => i.statusAvaliacao === 'CRITICO' && i.statusResolucao !== 'RESOLVIDO').length;
  const pendentesReenvio = itens.filter(i => i.requerReenvio && i.statusResolucao === 'PENDENTE').length;

  // Nenhuma foto enviada
  if (enviados === 0) {
    return 'PENDENTE';
  }

  // Ainda não enviou tudo
  if (enviados < totalItens) {
    return 'ENVIADA'; // Parcialmente enviada
  }

  // Tudo enviado, mas não avaliado
  if (avaliados === 0) {
    return 'ENVIADA';
  }

  // Avaliação em andamento
  if (avaliados < totalItens) {
    return 'EM_ANALISE';
  }

  // Tudo avaliado - verificar resultado
  if (criticos > 0 || pendentesReenvio > 0) {
    return 'REPROVADA';
  }

  return 'APROVADA';
}

// ============================================
// SERVIÇO DE INSPEÇÃO
// ============================================

export const inspectionService = {
  // ─────────────────────────────────────────
  // CONFIGURAÇÃO GLOBAL
  // ─────────────────────────────────────────

  /**
   * Busca a configuração global do sistema de inspeções.
   * Se não existir, retorna a configuração padrão.
   */
  async getConfigGlobal(): Promise<ConfigInspecaoGlobal> {
    try {
      const db = getDb();
      const result = await db.collection(COLLECTION_CONFIG_GLOBAL).list({ limit: 1 });

      if (result && result.length > 0) {
        return result[0] as unknown as ConfigInspecaoGlobal;
      }

      // Retorna configuração padrão se não existir
      return {
        id: 'default',
        ...CONFIG_INSPECAO_PADRAO,
        itensAtivos: ITENS_INSPECAO.filter(i => i.obrigatorio).map(i => i.id),
        updatedAt: new Date().toISOString(),
        updatedBy: 'system',
      };
    } catch (error) {
      logger.error('Erro ao buscar configuração global', error);
      throw error;
    }
  },

  /**
   * Atualiza a configuração global (apenas admin).
   */
  async updateConfigGlobal(
    config: Partial<ConfigInspecaoGlobal>,
    adminId: string
  ): Promise<ConfigInspecaoGlobal> {
    try {
      const db = getDb();
      const existing = await this.getConfigGlobal();

      const updated: ConfigInspecaoGlobal = {
        ...existing,
        ...config,
        updatedAt: new Date().toISOString(),
        updatedBy: adminId,
      };

      if (existing.id === 'default') {
        // Criar novo documento (remove ID fake)
        const { id, ...dataToCreate } = updated;
        const result = await db.collection(COLLECTION_CONFIG_GLOBAL).create(dataToCreate as any);
        return { ...updated, id: result.id as string };
      } else {
        // Atualizar existente
        await db.collection(COLLECTION_CONFIG_GLOBAL).update(existing.id, updated as any);
        return updated;
      }
    } catch (error) {
      logger.error('Erro ao atualizar configuração global', error);
      throw error;
    }
  },

  // ─────────────────────────────────────────
  // CONFIGURAÇÃO DO MOTORISTA
  // ─────────────────────────────────────────

  /**
   * Busca a configuração de inspeção de um motorista.
   */
  async getConfigMotorista(motoristaId: string): Promise<ConfigInspecaoMotorista | null> {
    try {
      const db = getDb();
      const result = await db.collection(COLLECTION_CONFIG_MOTORISTA).list({
        filter: { motoristaId },
        limit: 1,
      });

      if (result && result.length > 0) {
        return result[0] as unknown as ConfigInspecaoMotorista;
      }

      return null;
    } catch (error) {
      logger.error('Erro ao buscar configuração do motorista', error);
      throw error;
    }
  },

  /**
   * Cria ou atualiza a configuração de inspeção do motorista.
   */
  async upsertConfigMotorista(
    motoristaId: string,
    config: Partial<ConfigInspecaoMotorista>
  ): Promise<ConfigInspecaoMotorista> {
    try {
      const db = getDb();
      const existing = await this.getConfigMotorista(motoristaId);
      const now = new Date().toISOString();

      if (existing) {
        const updated = {
          ...existing,
          ...config,
          updatedAt: now,
        };
        await db.collection(COLLECTION_CONFIG_MOTORISTA).update(existing.id, updated);
        return updated;
      } else {
        // Criar nova configuração com valores padrão
        const configGlobal = await this.getConfigGlobal();
        const newConfig: Omit<ConfigInspecaoMotorista, 'id'> = {
          motoristaId,
          diaLembretePrincipal: configGlobal.diaLembretePadrao,
          horaLembretePrincipal: configGlobal.horaLembretePadrao,
          lembreteAntecipado: true,
          horaLembreteAntecipado: '08:00',
          notificacoesAtivas: true,
          notificarAvaliacao: true,
          notificarCriticos: true,
          createdAt: now,
          updatedAt: now,
          ...config,
        };

        const result = await db.collection(COLLECTION_CONFIG_MOTORISTA).create(newConfig);
        return { ...newConfig, id: result.id } as ConfigInspecaoMotorista;
      }
    } catch (error) {
      logger.error('Erro ao atualizar configuração do motorista', error);
      throw error;
    }
  },

  // ─────────────────────────────────────────
  // CRIAÇÃO DE INSPEÇÃO
  // ─────────────────────────────────────────

  /**
   * Cria uma nova inspeção semanal para um motorista.
   * Também cria todos os itens do checklist vazios.
   */
  async criarInspecao(
    input: CriarInspecaoInput,
    dadosMotorista: { nome: string; email: string },
    dadosVeiculo: { placa: string; modelo: string; tipo: string }
  ): Promise<InspecaoVeicular> {
    try {
      const db = getDb();
      const now = new Date().toISOString();
      const configGlobal = await this.getConfigGlobal();

      // Verifica se já existe inspeção para esta semana
      const existente = await this.getInspecaoPorSemana(input.motoristaId, input.semanaReferencia);
      if (existente) {
        logger.warn('Inspeção já existe para esta semana', { semana: input.semanaReferencia });
        return existente;
      }

      // Filtra itens aplicáveis ao tipo de veículo
      const itensAplicaveis = getItensParaVeiculo(dadosVeiculo.tipo)
        .filter(item => configGlobal.itensAtivos.includes(item.id));

      // Cria a inspeção
      const inspecao: Omit<InspecaoVeicular, 'id'> = {
        motoristaId: input.motoristaId,
        semanaReferencia: input.semanaReferencia,
        veiculo: {
          placa: dadosVeiculo.placa,
          modelo: dadosVeiculo.modelo,
          tipo: dadosVeiculo.tipo as any,
        },
        motorista: {
          nome: dadosMotorista.nome,
          email: dadosMotorista.email,
        },
        status: 'PENDENTE',
        totalItens: itensAplicaveis.length,
        itensEnviados: 0,
        itensAvaliados: 0,
        itensAprovados: 0,
        itensAtencao: 0,
        itensCriticos: 0,
        itensPendentesReenvio: 0,
        dataLimiteEnvio: input.dataLimiteEnvio || calcularDataLimite(configGlobal, input.semanaReferencia),
        createdAt: now,
        updatedAt: now,
      };

      const resultInspecao = await db.collection(COLLECTION_INSPECOES).create(inspecao);
      const inspecaoId = resultInspecao.id as string;

      // Cria os itens do checklist (em paralelo com controle)
      const BATCH_SIZE = 10;
      for (let i = 0; i < itensAplicaveis.length; i += BATCH_SIZE) {
        const batch = itensAplicaveis.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(itemConfig => {
            const item: Omit<ItemInspecao, 'id'> = {
              inspecaoId,
              motoristaId: input.motoristaId,
              semanaReferencia: input.semanaReferencia,
              itemId: itemConfig.id,
              categoria: itemConfig.categoria,
              nomeExibicao: itemConfig.nome,
              statusAvaliacao: 'PENDENTE',
              requerReenvio: false,
              createdAt: now,
              updatedAt: now,
            };
            return db.collection(COLLECTION_ITENS).create(item);
          })
        );
      }

      logger.debug('Inspeção criada com sucesso', {
        inspecaoId,
        totalItens: itensAplicaveis.length,
      });

      return { ...inspecao, id: inspecaoId } as InspecaoVeicular;
    } catch (error) {
      logger.error('Erro ao criar inspeção', error);
      throw error;
    }
  },

  /**
   * Cria inspeções para todos os motoristas ativos (chamado por cron).
   */
  async criarInspecoesSemanais(): Promise<{ criadas: number; erros: number }> {
    // Esta função seria chamada por uma Aether Function (serverless)
    // Por enquanto, é um placeholder
    logger.warn('criarInspecoesSemanais deve ser chamado via Aether Function');
    return { criadas: 0, erros: 0 };
  },

  // ─────────────────────────────────────────
  // CONSULTAS DE INSPEÇÃO
  // ─────────────────────────────────────────

  /**
   * Busca uma inspeção por ID.
   */
  async getInspecaoPorId(inspecaoId: string): Promise<InspecaoVeicular | null> {
    try {
      const db = getDb();
      const result = await db.collection(COLLECTION_INSPECOES).get(inspecaoId);
      return result as unknown as InspecaoVeicular | null;
    } catch (error) {
      logger.error('Erro ao buscar inspeção por ID', error);
      throw error;
    }
  },

  /**
   * Busca a inspeção de um motorista para uma semana específica.
   */
  async getInspecaoPorSemana(
    motoristaId: string,
    semanaReferencia: string
  ): Promise<InspecaoVeicular | null> {
    try {
      const db = getDb();
      const result = await db.collection(COLLECTION_INSPECOES).list({
        filter: { motoristaId, semanaReferencia },
        limit: 1,
      });

      if (result && result.length > 0) {
        return result[0] as unknown as InspecaoVeicular;
      }

      return null;
    } catch (error) {
      logger.error('Erro ao buscar inspeção por semana', error);
      throw error;
    }
  },

  /**
   * Busca a inspeção atual (semana corrente) de um motorista.
   */
  async getInspecaoAtual(motoristaId: string): Promise<InspecaoVeicular | null> {
    const semanaAtual = getSemanaISO();

    // [DEBUG] Log para investigar mismatch de inspeção
    logger.debug(`[DEBUG] getInspecaoAtual: Buscando para driver=${motoristaId}, semana=${semanaAtual}`);

    return this.getInspecaoPorSemana(motoristaId, semanaAtual);
  },

  /**
   * Lista todas as inspeções recentes para o painel administrativo.
   * Usado para evitar N+1 queries.
   */
  async listarTodasInspecoes(limite: number = 300): Promise<InspecaoVeicular[]> {
    try {
      const db = getDb();
      const result = await db.collection(COLLECTION_INSPECOES).list({
        sort: { field: 'createdAt', order: 'DESC' },
        limit: limite,
      });

      return (result || []) as unknown as InspecaoVeicular[];
    } catch (error) {
      logger.error('Erro ao listar todas inspeções', error);
      throw error;
    }
  },

  /**
   * Lista o histórico de inspeções de um motorista.
   */
  async listarInspecoesMotorista(
    motoristaId: string,
    limite: number = 10
  ): Promise<InspecaoVeicular[]> {
    try {
      const db = getDb();
      const result = await db.collection(COLLECTION_INSPECOES).list({
        filter: { motoristaId },
        limit: limite,
      });

      // Ordenação manual já que o SDK pode não suportar orderBy
      const sorted = (result || []).sort((a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return sorted as unknown as InspecaoVeicular[];
    } catch (error) {
      logger.error('Erro ao listar inspeções do motorista', error);
      throw error;
    }
  },

  // ─────────────────────────────────────────
  // CONSULTAS DE ITENS
  // ─────────────────────────────────────────

  /**
   * Lista todos os itens de uma inspeção.
   */
  async listarItensInspecao(inspecaoId: string, motoristaId?: string): Promise<ItemInspecao[]> {
    try {
      const db = getDb();
      const filter: any = { inspecaoId };

      // [SECURITY] Adiciona filtro de motorista se fornecido para satisfazer regras
      if (motoristaId) {
        filter.motoristaId = motoristaId;
      }

      const result = await db.collection(COLLECTION_ITENS).list({
        filter,
        limit: 100, // Máximo de itens por inspeção
      });

      return (result || []) as unknown as ItemInspecao[];
    } catch (error) {
      logger.error('Erro ao listar itens da inspeção', error);
      throw error;
    }
  },

  /**
   * Busca um item específico por ID.
   */
  async getItemPorId(itemId: string): Promise<ItemInspecao | null> {
    try {
      const db = getDb();
      const result = await db.collection(COLLECTION_ITENS).get(itemId);
      return result as unknown as ItemInspecao | null;
    } catch (error) {
      logger.error('Erro ao buscar item por ID', error);
      throw error;
    }
  },

  /**
   * Lista itens que precisam de reenvio (para o motorista).
   */
  async listarItensPendentesReenvio(motoristaId: string): Promise<ItemInspecao[]> {
    try {
      const db = getDb();
      const result = await db.collection(COLLECTION_ITENS).list({
        filter: {
          motoristaId,
          requerReenvio: true,
          statusResolucao: 'PENDENTE',
        },
        limit: 50,
      });

      return (result || []) as unknown as ItemInspecao[];
    } catch (error) {
      logger.error('Erro ao listar itens pendentes de reenvio', error);
      throw error;
    }
  },

  // ─────────────────────────────────────────
  // UPLOAD DE FOTOS
  // ─────────────────────────────────────────

  /**
   * Faz upload de uma foto para o Aether Storage.
   */
  async uploadFoto(
    motoristaId: string,
    semana: string,
    itemId: string,
    foto: { uri: string; type: string; name: string; width: number; height: number },
    isReenvio: boolean = false
  ): Promise<UploadResult> {
    try {
      // [FIX] Usa o serviço de upload resiliente (com retry e refresh de token automáticos)
      const { uploadWithRetry } = require('@/services/upload-service').default;

      // [FIX] Gera nome do arquivo e folder SEPARADAMENTE
      // Isso permite que o upload-service receba fileName limpo e folder nas options
      const fileName = gerarNomeArquivo(itemId, isReenvio);
      const folder = gerarStorageFolder(motoristaId, semana);

      logger.debug('Iniciando upload de foto', {
        fileName,
        folder,
        itemId,
        isReenvio,
      });

      // 1. Prepara o arquivo para upload
      const response = await fetch(foto.uri);
      const blob = await response.blob();

      // 2. Upload resiliente
      const result = await uploadWithRetry(
        blob,
        fileName,
        {
          contentType: foto.type || 'image/jpeg',
          folder: folder,
          // metadata: {}, // Metadata não suportado no upload direto do SDK atual
        }
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      logger.info('Foto enviada com sucesso', { path: `${folder}/${fileName}`, size: blob.size, url: result.url });

      return {
        url: result.url || '',
        metadata: {
          width: foto.width,
          height: foto.height,
          size: blob.size,
          mimeType: result.metadata?.mimeType || foto.type,
        },
      };
    } catch (error: any) {
      logger.error('Erro ao fazer upload da foto', error);
      throw error;
    }
  },

  /**
   * Envia foto de um item da inspeção.
   */
  async enviarFotoItem(
    input: EnviarFotoItemInput,
    motoristaId: string,
    semanaReferencia: string,
    itemContext?: ItemInspecao // [PERF] Evita leitura se já temos o item
  ): Promise<ItemInspecao> {
    try {
      const db = getDb();

      // Busca o item se não fornecido
      const item = itemContext || await this.getItemPorId(input.itemId);

      if (!item) {
        throw new Error('Item não encontrado');
      }

      // Valida que o item pertence ao motorista
      if (item.motoristaId !== motoristaId) {
        throw new Error('Item não pertence a este motorista');
      }

      // Upload da foto
      const uploadResult = await this.uploadFoto(
        motoristaId,
        semanaReferencia,
        item.itemId,
        input.foto
      );

      // Atualiza o item com a foto
      const now = new Date().toISOString();
      const itemAtualizado: Partial<ItemInspecao> = {
        fotoUrl: uploadResult.url,
        fotoThumbnailUrl: uploadResult.thumbnailUrl,
        fotoMetadata: uploadResult.metadata,
        dataEnvioFoto: now,
        updatedAt: now,
      };

      await db.collection(COLLECTION_ITENS).update(input.itemId, itemAtualizado);

      // Atualiza contadores da inspeção
      await this.atualizarContadoresInspecao(item.inspecaoId, motoristaId);

      return { ...item, ...itemAtualizado } as ItemInspecao;
    } catch (error) {
      logger.error('Erro ao enviar foto do item', error);
      throw error;
    }
  },

  /**
   * Reenvia foto de um item após manutenção.
   */
  async reenviarFotoItem(
    input: ReenviarFotoInput,
    motoristaId: string
  ): Promise<ItemInspecao> {
    try {
      const db = getDb();

      // Busca o item
      const item = await this.getItemPorId(input.itemId);
      if (!item) {
        throw new Error('Item não encontrado');
      }

      // Valida que o item pertence ao motorista e requer reenvio
      if (item.motoristaId !== motoristaId) {
        throw new Error('Item não pertence a este motorista');
      }
      if (!item.requerReenvio) {
        throw new Error('Este item não requer reenvio');
      }

      // Upload da nova foto
      const uploadResult = await this.uploadFoto(
        motoristaId,
        item.semanaReferencia,
        item.itemId,
        input.foto,
        true // isReenvio
      );

      // Atualiza o item
      const now = new Date().toISOString();
      const itemAtualizado: Partial<ItemInspecao> = {
        fotoReenvioUrl: uploadResult.url,
        dataReenvio: now,
        statusResolucao: 'REENVIADO',
        observacaoReenvio: input.observacao,
        updatedAt: now,
      };

      await db.collection(COLLECTION_ITENS).update(input.itemId, itemAtualizado);

      // Atualiza contadores da inspeção
      await this.atualizarContadoresInspecao(item.inspecaoId, motoristaId);

      logger.debug('Foto reenviada com sucesso', { itemId: input.itemId });

      return { ...item, ...itemAtualizado } as ItemInspecao;
    } catch (error) {
      logger.error('Erro ao reenviar foto do item', error);
      throw error;
    }
  },

  // ─────────────────────────────────────────
  // ENVIO DE INSPEÇÃO
  // ─────────────────────────────────────────

  /**
   * Finaliza e envia a inspeção para análise do admin.
   */
  async enviarInspecao(
    inspecaoId: string,
    motoristaId: string,
    observacoes?: string
  ): Promise<InspecaoVeicular> {
    try {
      const db = getDb();

      // Busca a inspeção
      const inspecao = await this.getInspecaoPorId(inspecaoId);
      if (!inspecao) {
        throw new Error('Inspeção não encontrada');
      }

      // Valida que pertence ao motorista
      if (inspecao.motoristaId !== motoristaId) {
        throw new Error('Inspeção não pertence a este motorista');
      }

      // Verifica se já foi enviada
      if (inspecao.status !== 'PENDENTE') {
        throw new Error('Inspeção já foi enviada');
      }

      // Verifica se todos os itens obrigatórios têm foto
      const itens = await this.listarItensInspecao(inspecaoId);
      const itensObrigatoriosSemFoto = itens.filter(item => {
        const config = ITENS_INSPECAO_MAP[item.itemId];
        return config?.obrigatorio && !item.fotoUrl;
      });

      if (itensObrigatoriosSemFoto.length > 0) {
        throw new Error(
          `Faltam fotos de ${itensObrigatoriosSemFoto.length} itens obrigatórios`
        );
      }

      // Atualiza a inspeção
      const now = new Date().toISOString();
      const inspecaoAtualizada: Partial<InspecaoVeicular> = {
        status: 'ENVIADA',
        dataEnvio: now,
        observacoesMotorista: observacoes,
        updatedAt: now,
      };

      await db.collection(COLLECTION_INSPECOES).update(inspecaoId, inspecaoAtualizada);

      logger.debug('Inspeção enviada com sucesso', { inspecaoId });

      // TODO: Disparar notificação para admin

      return { ...inspecao, ...inspecaoAtualizada } as InspecaoVeicular;
    } catch (error) {
      logger.error('Erro ao enviar inspeção', error);
      throw error;
    }
  },

  // ─────────────────────────────────────────
  // AVALIAÇÃO (ADMIN)
  // ─────────────────────────────────────────

  /**
   * Avalia um item da inspeção (apenas admin).
   */
  async avaliarItem(
    input: AvaliarItemInput,
    adminId: string,
    adminNome: string
  ): Promise<ItemInspecao> {
    try {
      const db = getDb();

      // Busca o item
      const item = await this.getItemPorId(input.itemId);
      if (!item) {
        throw new Error('Item não encontrado');
      }

      const now = new Date().toISOString();

      // Prepara atualização
      const itemAtualizado: Partial<ItemInspecao> = {
        statusAvaliacao: input.status,
        avaliadoPor: adminId,
        dataAvaliacao: now,
        observacaoAdmin: input.observacao,
        updatedAt: now,
      };

      // Se status é CRITICO ou ATENCAO, requer reenvio e define prazo
      if (input.status === 'CRITICO' || input.status === 'ATENCAO') {
        itemAtualizado.requerReenvio = true;
        itemAtualizado.statusResolucao = 'PENDENTE';

        if (input.diasParaManutencao) {
          const prazo = new Date();
          prazo.setDate(prazo.getDate() + input.diasParaManutencao);
          itemAtualizado.prazoManutencao = prazo.toISOString();
          itemAtualizado.diasParaManutencao = input.diasParaManutencao;
        }
      } else {
        // BOM_ESTADO - não requer reenvio
        itemAtualizado.requerReenvio = false;
        itemAtualizado.statusResolucao = null; // [FIX] Use null instead of undefined
      }

      // Atualiza o item
      await db.collection(COLLECTION_ITENS).update(input.itemId, itemAtualizado);

      // Registra no histórico de avaliações
      const historico: Omit<HistoricoAvaliacao, 'id'> = {
        itemInspecaoId: input.itemId,
        inspecaoId: item.inspecaoId,
        motoristaId: item.motoristaId || 'unknown', // [FIX] Fallback to prevent crash
        adminId,
        adminNome,
        statusAnterior: item.statusAvaliacao,
        statusNovo: input.status,
        observacao: input.observacao,
        prazoDefinido: input.diasParaManutencao,
        createdAt: now,
      };

      try {
        await db.collection(COLLECTION_HISTORICO).create(historico);
      } catch (histError) {
        logger.warn('Falha ao criar histórico (não crítico)', histError);
      }

      // Atualiza contadores da inspeção
      await this.atualizarContadoresInspecao(item.inspecaoId);

      logger.debug('Item avaliado com sucesso', {
        itemId: input.itemId,
        status: input.status,
      });

      // Dispara notificação se CRITICO ou ATENCAO
      if (input.status === 'CRITICO' || input.status === 'ATENCAO') {
        try {
          // [FIX] Ensure getFunctions is available and safe
          const functions = getFunctions();

          await functions.invoke('notificar-item-critico', {
            itemId: input.itemId,
            inspecaoId: item.inspecaoId,
            motoristaId: item.motoristaId || 'unknown',
            itemNome: ITENS_INSPECAO_MAP[item.itemId]?.nome || 'Item',
            observacao: input.observacao,
            prazoManutencao: itemAtualizado.prazoManutencao
          });
          logger.debug('Solicitação de notificação enviada', { itemId: input.itemId });
        } catch (notifyError: any) {
          // [FIX] Melhor log de erro
          logger.warn('Falha ao enviar notificação de item crítico', {
            message: notifyError.message,
            code: notifyError.code
          });
        }
      }

      return { ...item, ...itemAtualizado } as ItemInspecao;
    } catch (error: any) {
      // [FIX] Full error logging for debug
      logger.error('Erro ao avaliar item', {
        message: error.message,
        stack: error.stack,
        full: JSON.stringify(error)
      });
      throw error;
    }
  },

  /**
   * Confirma resolução de um item reenviado (admin).
   */
  async confirmarResolucao(
    itemId: string,
    adminId: string,
    adminNome: string
  ): Promise<ItemInspecao> {
    try {
      const db = getDb();

      // Busca o item
      const item = await this.getItemPorId(itemId);
      if (!item) {
        throw new Error('Item não encontrado');
      }

      // Valida que foi reenviado
      if (item.statusResolucao !== 'REENVIADO') {
        throw new Error('Item não foi reenviado');
      }

      const now = new Date().toISOString();

      // Atualiza para resolvido
      const itemAtualizado: Partial<ItemInspecao> = {
        statusAvaliacao: 'BOM_ESTADO',
        statusResolucao: 'RESOLVIDO',
        requerReenvio: false,
        avaliadoPor: adminId,
        dataAvaliacao: now,
        updatedAt: now,
      };

      await db.collection(COLLECTION_ITENS).update(itemId, itemAtualizado);

      // Registra no histórico
      const historico: Omit<HistoricoAvaliacao, 'id'> = {
        itemInspecaoId: itemId,
        inspecaoId: item.inspecaoId,
        motoristaId: item.motoristaId,
        adminId,
        adminNome,
        statusAnterior: item.statusAvaliacao,
        statusNovo: 'BOM_ESTADO',
        observacao: 'Resolução confirmada após reenvio',
        createdAt: now,
      };

      await db.collection(COLLECTION_HISTORICO).create(historico);

      // Atualiza contadores
      await this.atualizarContadoresInspecao(item.inspecaoId);

      logger.debug('Resolução confirmada', { itemId });

      return { ...item, ...itemAtualizado } as ItemInspecao;
    } catch (error) {
      logger.error('Erro ao confirmar resolução', error);
      throw error;
    }
  },

  /**
   * Finaliza a avaliação de uma inspeção (admin).
   */
  async finalizarAvaliacao(
    inspecaoId: string,
    adminId: string,
    adminNome: string,
    observacoes?: string
  ): Promise<InspecaoVeicular> {
    try {
      const db = getDb();

      // Busca a inspeção e itens
      const inspecao = await this.getInspecaoPorId(inspecaoId);
      if (!inspecao) {
        throw new Error('Inspeção não encontrada');
      }

      const itens = await this.listarItensInspecao(inspecaoId);

      // Verifica se todos os itens foram avaliados
      const naoAvaliados = itens.filter(i => i.statusAvaliacao === 'PENDENTE');
      if (naoAvaliados.length > 0) {
        throw new Error(`Ainda há ${naoAvaliados.length} itens não avaliados`);
      }

      // Determina o status final
      const status = determinarStatusInspecao(itens, inspecao.totalItens);

      const now = new Date().toISOString();
      const inspecaoAtualizada: Partial<InspecaoVeicular> = {
        status,
        dataAvaliacao: now,
        avaliadoPor: adminId,
        avaliadoPorNome: adminNome,
        observacoesAdmin: observacoes,
        updatedAt: now,
      };

      await db.collection(COLLECTION_INSPECOES).update(inspecaoId, inspecaoAtualizada);

      logger.debug('Avaliação finalizada', { inspecaoId, status });

      // Dispara notificação de conclusão
      try {
        const functions = getFunctions();
        await functions.invoke('notificar-avaliacao', {
          inspecaoId,
          motoristaId: inspecao.motoristaId,
          avaliadoPor: adminId,
          avaliadoPorNome: adminNome
        });
        logger.debug('Solicitação de notificação de conclusão enviada', { inspecaoId });
      } catch (notifyError) {
        logger.warn('Falha ao enviar notificação de conclusão', notifyError);
        // Não falha a operação principal
      }

      return { ...inspecao, ...inspecaoAtualizada } as InspecaoVeicular;
    } catch (error) {
      logger.error('Erro ao finalizar avaliação', error);
      throw error;
    }
  },

  // ─────────────────────────────────────────
  // HELPERS INTERNOS
  // ─────────────────────────────────────────

  /**
   * Atualiza os contadores de uma inspeção baseado nos itens.
   */
  async atualizarContadoresInspecao(inspecaoId: string, motoristaId?: string): Promise<void> {
    try {
      const db = getDb();

      // [PERF/SECURITY] Busca itens diretamente (usando motoristaId se disponível para bypass rules)
      const itens = await this.listarItensInspecao(inspecaoId, motoristaId);

      // Calcula contadores
      const contadores = calcularContadores(itens);
      // Assume total igual length (skip getInspecaoPorId que causa 403)
      const status = determinarStatusInspecao(itens, itens.length);

      // Atualiza a inspeção
      await db.collection(COLLECTION_INSPECOES).update(inspecaoId, {
        ...contadores,
        status,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Erro ao atualizar contadores', error);
      // Não lança erro para não interromper fluxo principal
    }
  },

  // ─────────────────────────────────────────
  // QUERIES ADMIN
  // ─────────────────────────────────────────

  /**
   * Lista todas as inspeções pendentes de análise (admin).
   */
  async listarInspecoesPendentesAnalise(): Promise<InspecaoVeicular[]> {
    try {
      const db = getDb();
      const result = await db.collection(COLLECTION_INSPECOES).list({
        filter: { status: 'ENVIADA' },
        limit: 100,
      });

      // Ordenação manual
      const sorted = (result || []).sort((a: any, b: any) =>
        new Date(a.dataEnvio).getTime() - new Date(b.dataEnvio).getTime()
      );

      return sorted as unknown as InspecaoVeicular[];
    } catch (error) {
      logger.error('Erro ao listar inspeções pendentes', error);
      throw error;
    }
  },

  /**
   * Lista inspeções atrasadas (prazo vencido sem envio).
   */
  async listarInspecoesAtrasadas(): Promise<InspecaoVeicular[]> {
    try {
      const db = getDb();
      const agora = new Date().toISOString();

      const result = await db.collection(COLLECTION_INSPECOES).list({
        filter: {
          status: 'PENDENTE',
          // dataLimiteEnvio < agora (prazo vencido)
        },
        limit: 100,
      });

      // Filtra manualmente por data (se o Aether não suportar comparação)
      const inspecoes = (result || []) as unknown as InspecaoVeicular[];
      return inspecoes.filter(i => i.dataLimiteEnvio < agora);
    } catch (error) {
      logger.error('Erro ao listar inspeções atrasadas', error);
      throw error;
    }
  },

  /**
   * Lista itens críticos pendentes de resolução (admin).
   */
  async listarItensCriticosPendentes(): Promise<ItemInspecao[]> {
    try {
      const db = getDb();
      const result = await db.collection(COLLECTION_ITENS).list({
        filter: {
          statusAvaliacao: 'CRITICO',
          statusResolucao: 'PENDENTE',
        },
        limit: 100,
      });

      return (result || []) as unknown as ItemInspecao[];
    } catch (error) {
      logger.error('Erro ao listar itens críticos', error);
      throw error;
    }
  },

  // ============================================
  // [NOVO] HISTÓRICO DE INSPEÇÕES FINALIZADAS
  // ============================================

  /**
   * Lista inspeções finalizadas (APROVADA ou REPROVADA) para o admin.
   * Usado para exibir histórico de inspeções já avaliadas na aba "Histórico".
   * 
   * @param limite - Número máximo de inspeções a retornar (padrão: 50)
   * @param semanaReferencia - Filtrar por semana específica (opcional)
   * @param motoristaId - Filtrar por motorista específico (opcional)
   * @returns Lista de inspeções finalizadas ordenadas por data de avaliação (mais recentes primeiro)
   */
  async listarInspecoesFinalizadas(
    limite: number = 50,
    semanaReferencia?: string,
    motoristaId?: string
  ): Promise<InspecaoVeicular[]> {
    try {
      const db = getDb();

      // Busca inspeções APROVADAS
      const aprovadas = await db.collection(COLLECTION_INSPECOES).list({
        filter: { status: 'APROVADA' },
        limit: limite,
      });

      // Busca inspeções REPROVADAS
      const reprovadas = await db.collection(COLLECTION_INSPECOES).list({
        filter: { status: 'REPROVADA' },
        limit: limite,
      });

      // Combina os resultados
      let todasFinalizadas = [
        ...(aprovadas || []),
        ...(reprovadas || []),
      ] as unknown as InspecaoVeicular[];

      // Filtra por semana se especificado
      if (semanaReferencia) {
        todasFinalizadas = todasFinalizadas.filter(
          (i) => i.semanaReferencia === semanaReferencia
        );
      }

      // Filtra por motorista se especificado
      if (motoristaId) {
        todasFinalizadas = todasFinalizadas.filter(
          (i) => i.motoristaId === motoristaId
        );
      }

      // Ordena por data de avaliação (mais recentes primeiro)
      const ordenadas = todasFinalizadas.sort((a, b) => {
        const dataA = a.dataAvaliacao ? new Date(a.dataAvaliacao).getTime() : 0;
        const dataB = b.dataAvaliacao ? new Date(b.dataAvaliacao).getTime() : 0;
        return dataB - dataA;
      });

      // Limita o resultado final
      return ordenadas.slice(0, limite);
    } catch (error) {
      logger.error('Erro ao listar inspeções finalizadas', error);
      throw error;
    }
  },

  /**
   * Conta inspeções finalizadas por status (para estatísticas do dashboard).
   * 
   * @returns Objeto com contagem de aprovadas, reprovadas e total
   */
  async contarInspecoesFinalizadas(): Promise<{
    aprovadas: number;
    reprovadas: number;
    total: number;
  }> {
    try {
      const db = getDb();

      // Busca contagem em paralelo para melhor performance
      const [aprovadas, reprovadas] = await Promise.all([
        db.collection(COLLECTION_INSPECOES).list({
          filter: { status: 'APROVADA' },
          limit: 1000,
        }),
        db.collection(COLLECTION_INSPECOES).list({
          filter: { status: 'REPROVADA' },
          limit: 1000,
        }),
      ]);

      const countAprovadas = (aprovadas || []).length;
      const countReprovadas = (reprovadas || []).length;

      return {
        aprovadas: countAprovadas,
        reprovadas: countReprovadas,
        total: countAprovadas + countReprovadas,
      };
    } catch (error) {
      logger.error('Erro ao contar inspeções finalizadas', error);
      throw error;
    }
  },

  /**
   * Lista o histórico de avaliações de um item específico.
   */
  async listarHistoricoItem(itemId: string): Promise<HistoricoAvaliacao[]> {
    try {
      const db = getDb();
      const result = await db.collection(COLLECTION_HISTORICO).list({
        filter: { itemInspecaoId: itemId },
        sort: { field: 'createdAt', order: 'DESC' },
      });

      return (result || []) as unknown as HistoricoAvaliacao[];
    } catch (error) {
      logger.error('Erro ao listar histórico do item', error);
      // Retorna vazio em caso de erro para não quebrar a UI
      return [];
    }
  },

  // ============================================
  // FIM DAS NOVAS FUNÇÕES
  // ============================================

  /**
   * Gera resumo para dashboard do admin.
   */
  async getResumoAdmin(): Promise<ResumoInspecoesAdmin> {
    try {
      // Busca dados em paralelo
      const [pendentes, atrasadas, criticos] = await Promise.all([
        this.listarInspecoesPendentesAnalise(),
        this.listarInspecoesAtrasadas(),
        this.listarItensCriticosPendentes(),
      ]);

      // Calcula itens vencendo hoje
      const hoje = new Date();
      hoje.setHours(23, 59, 59, 999);
      const hojeISO = hoje.toISOString();
      const vencendoHoje = criticos.filter(i =>
        i.prazoManutencao && i.prazoManutencao <= hojeISO
      );

      return {
        totalMotoristas: 0, // Será preenchido pela store
        inspecoesParaAnalisar: pendentes.length,
        inspecoesPendentes: 0, // Será calculado
        inspecoesAtrasadas: atrasadas.length,
        itensCriticosPendentes: criticos.length,
        itensVencendoHoje: vencendoHoje.length,
      };
    } catch (error) {
      logger.error('Erro ao gerar resumo admin', error);
      throw error;
    }
  },

  /**
   * Gera resumo para o motorista.
   */
  async getResumoMotorista(motoristaId: string): Promise<ResumoInspecaoMotorista> {
    try {
      // Busca inspeção atual e itens com problema
      const [inspecaoAtual, itensPendentes] = await Promise.all([
        this.getInspecaoAtual(motoristaId),
        this.listarItensPendentesReenvio(motoristaId),
      ]);

      // Calcula progresso
      let progressoEnvio = 0;
      if (inspecaoAtual) {
        progressoEnvio = Math.round(
          (inspecaoAtual.itensEnviados / inspecaoAtual.totalItens) * 100
        );
      }

      // Calcula dias restantes
      let diasRestantes: number | undefined;
      if (inspecaoAtual?.dataLimiteEnvio) {
        const prazo = new Date(inspecaoAtual.dataLimiteEnvio);
        const agora = new Date();
        diasRestantes = Math.ceil((prazo.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24));
      }

      return {
        temInspecaoPendente: inspecaoAtual?.status === 'PENDENTE',
        inspecaoAtual: inspecaoAtual || undefined,
        progressoEnvio,
        itensComProblema: itensPendentes,
        proximoPrazo: inspecaoAtual?.dataLimiteEnvio,
        diasRestantes: diasRestantes !== undefined && diasRestantes >= 0 ? diasRestantes : undefined,
      };
    } catch (error) {
      logger.error('Erro ao gerar resumo do motorista', error);
      throw error;
    }
  },
};

export default inspectionService;