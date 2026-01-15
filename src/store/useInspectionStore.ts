// src/store/useInspectionStore.ts
// ============================================
// ROTAFRETE - Store de Inspeção (Motorista)
// ============================================
// Gerencia o estado das inspeções do motorista:
// - Inspeção atual e histórico
// - Upload de fotos
// - Progresso de envio
// - Itens pendentes de reenvio
// ============================================

import { create } from 'zustand';
import { getDb } from '@aether-baas/react-native';
import { createLogger } from '@/utils/logger';
import { inspectionService } from '@/services/inspection-service';
import { createSafeSubscriptionHandler, debounceSubscription } from '@/utils/safeSubscribe';
import {
  ITENS_INSPECAO,
  CATEGORIAS_INSPECAO,
  CATEGORIAS_ORDENADAS,
  ITENS_POR_CATEGORIA,
  getSemanaISO,
} from '@/constants/inspection';
import type {
  InspecaoVeicular,
  ItemInspecao,
  CategoriaInspecao,
  ConfigInspecaoMotorista,
  ResumoInspecaoMotorista,
  EnviarFotoItemInput,
  ReenviarFotoInput,
} from '@/types/inspection';

// ============================================
// CONSTANTES
// ============================================

const COLLECTION_INSPECOES = 'inspecoes_veiculares';

// ============================================
// LOGGER
// ============================================

const logger = createLogger('InspectionStore');

// ============================================
// TIPOS DA STORE
// ============================================

/**
 * Estado agrupado de itens por categoria.
 */
interface CategoriaComItens {
  categoria: typeof CATEGORIAS_INSPECAO[CategoriaInspecao];
  itens: ItemInspecao[];
  totalItens: number;
  itensEnviados: number;
  completa: boolean;
}

/**
 * Interface do estado da store.
 */
interface InspectionState {
  // ─── Estado Principal ────────────────────
  /** Inspeção atual (semana corrente) */
  inspecaoAtual: InspecaoVeicular | null;
  /** Itens da inspeção atual */
  itensInspecao: ItemInspecao[];
  /** Histórico de inspeções anteriores */
  historico: InspecaoVeicular[];
  /** Itens que precisam de reenvio */
  itensPendentesReenvio: ItemInspecao[];
  /** Configuração personalizada do motorista */
  configMotorista: ConfigInspecaoMotorista | null;

  // ─── Estado de UI ────────────────────────
  /** Indica se está carregando dados */
  isLoading: boolean;
  /** Indica se está enviando foto */
  isUploading: boolean;
  /** Progresso do upload (0-100) */
  uploadProgress: number;
  /** Erro atual (se houver) */
  error: string | null;
  /** ID do item sendo editado/fotografado */
  itemSelecionadoId: string | null;

  // ─── Computed ────────────────────────────
  /** Resumo para exibição rápida */
  resumo: ResumoInspecaoMotorista | null;

  // ─── Ações ───────────────────────────────
  /** Carrega a inspeção atual e itens */
  carregarInspecaoAtual: (motoristaId: string) => Promise<void>;
  /** Carrega histórico de inspeções */
  carregarHistorico: (motoristaId: string, limite?: number) => Promise<void>;
  /** Carrega itens pendentes de reenvio */
  carregarItensPendentesReenvio: (motoristaId: string) => Promise<void>;
  /** Carrega configuração do motorista */
  carregarConfigMotorista: (motoristaId: string) => Promise<void>;
  /** Atualiza configuração de notificações */
  atualizarConfigMotorista: (motoristaId: string, config: Partial<ConfigInspecaoMotorista>) => Promise<void>;
  /** Envia foto de um item */
  enviarFotoItem: (input: EnviarFotoItemInput, motoristaId: string) => Promise<void>;
  /** Reenvia foto após manutenção */
  reenviarFotoItem: (input: ReenviarFotoInput, motoristaId: string) => Promise<void>;
  /** Finaliza e envia a inspeção */
  enviarInspecao: (inspecaoId: string, motoristaId: string, observacoes?: string) => Promise<void>;
  /** Seleciona um item para edição */
  selecionarItem: (itemId: string | null) => void;
  /** Limpa o erro atual */
  limparErro: () => void;
  /** Reseta a store */
  reset: () => void;

  // ─── Getters Computados ──────────────────
  /** Retorna itens agrupados por categoria */
  getItensPorCategoria: () => CategoriaComItens[];
  /** Retorna o progresso geral (0-100) */
  getProgresso: () => number;
  /** Verifica se pode enviar a inspeção */
  podeEnviar: () => boolean;
  /** Retorna itens de uma categoria específica */
  getItensCategoria: (categoria: CategoriaInspecao) => ItemInspecao[];

  // ─── Realtime ────────────────────────────
  /** Assina mudanças na inspeção atual */
  subscribeToCurrentInspection: (motoristaId: string) => () => void;
}

// ============================================
// ESTADO INICIAL
// ============================================

const ESTADO_INICIAL = {
  inspecaoAtual: null,
  itensInspecao: [],
  historico: [],
  itensPendentesReenvio: [],
  configMotorista: null,
  isLoading: false,
  isUploading: false,
  uploadProgress: 0,
  error: null,
  itemSelecionadoId: null,
  resumo: null,
};

// ============================================
// STORE
// ============================================

export const useInspectionStore = create<InspectionState>((set, get) => ({
  ...ESTADO_INICIAL,

  // ─────────────────────────────────────────
  // CARREGAMENTO DE DADOS
  // ─────────────────────────────────────────

  /**
   * Carrega a inspeção atual (semana corrente) e seus itens.
   * Se não existir inspeção, cria uma nova.
   */
  carregarInspecaoAtual: async (motoristaId: string) => {
    try {
      set({ isLoading: true, error: null });

      // Busca inspeção e itens em paralelo
      const inspecao = await inspectionService.getInspecaoAtual(motoristaId);

      if (inspecao) {
        // Carrega os itens da inspeção
        const itens = await inspectionService.listarItensInspecao(inspecao.id, motoristaId);

        // Gera resumo
        const resumo = await inspectionService.getResumoMotorista(motoristaId);

        set({
          inspecaoAtual: inspecao,
          itensInspecao: itens,
          resumo,
          isLoading: false,
        });

        logger.debug('Inspeção atual carregada', {
          inspecaoId: inspecao.id,
          totalItens: itens.length,
        });
      } else {
        // Não há inspeção para esta semana
        // A criação é feita pelo admin/cron, não pelo motorista
        set({
          inspecaoAtual: null,
          itensInspecao: [],
          resumo: {
            temInspecaoPendente: false,
            progressoEnvio: 0,
            itensComProblema: [],
          },
          isLoading: false,
        });

        logger.debug('Nenhuma inspeção para semana atual');
      }
    } catch (error) {
      logger.error('Erro ao carregar inspeção atual', error);
      set({
        error: 'Não foi possível carregar a inspeção. Tente novamente.',
        isLoading: false,
      });
    }
  },

  /**
   * Carrega o histórico de inspeções anteriores.
   */
  carregarHistorico: async (motoristaId: string, limite: number = 10) => {
    try {
      set({ isLoading: true, error: null });

      const historico = await inspectionService.listarInspecoesMotorista(motoristaId, limite);

      set({ historico, isLoading: false });

      logger.debug('Histórico carregado', { total: historico.length });
    } catch (error) {
      logger.error('Erro ao carregar histórico', error);
      set({
        error: 'Não foi possível carregar o histórico.',
        isLoading: false,
      });
    }
  },

  /**
   * Carrega itens que precisam de reenvio (de qualquer inspeção).
   */
  carregarItensPendentesReenvio: async (motoristaId: string) => {
    try {
      const itens = await inspectionService.listarItensPendentesReenvio(motoristaId);

      set({ itensPendentesReenvio: itens });

      logger.debug('Itens pendentes de reenvio carregados', { total: itens.length });
    } catch (error) {
      logger.error('Erro ao carregar itens pendentes', error);
      // Não bloqueia a UI por este erro
    }
  },

  /**
   * Carrega configuração de notificações do motorista.
   */
  carregarConfigMotorista: async (motoristaId: string) => {
    try {
      const config = await inspectionService.getConfigMotorista(motoristaId);
      set({ configMotorista: config });
    } catch (error) {
      logger.error('Erro ao carregar configuração', error);
    }
  },

  /**
   * Atualiza configuração de notificações do motorista.
   */
  atualizarConfigMotorista: async (
    motoristaId: string,
    config: Partial<ConfigInspecaoMotorista>
  ) => {
    try {
      const configAtualizada = await inspectionService.upsertConfigMotorista(
        motoristaId,
        config
      );

      set({ configMotorista: configAtualizada });

      logger.debug('Configuração atualizada', config);
    } catch (error) {
      logger.error('Erro ao atualizar configuração', error);
      set({ error: 'Não foi possível salvar as preferências.' });
    }
  },

  // ─────────────────────────────────────────
  // UPLOAD DE FOTOS
  // ─────────────────────────────────────────

  /**
   * Envia foto de um item da inspeção.
   */
  enviarFotoItem: async (input: EnviarFotoItemInput, motoristaId: string) => {
    const { inspecaoAtual, itensInspecao } = get();

    if (!inspecaoAtual) {
      set({ error: 'Nenhuma inspeção ativa.' });
      return;
    }

    try {
      set({ isUploading: true, uploadProgress: 0, error: null });

      // Simula progresso (o upload real não tem callback de progresso)
      const progressInterval = setInterval(() => {
        set(state => ({
          uploadProgress: Math.min(state.uploadProgress + 10, 90),
        }));
      }, 200);

      // Encontra o item para passar contexto (evita 403 no get)
      const itemAlvo = itensInspecao.find(i => i.id === input.itemId);

      // Envia a foto
      const itemAtualizado = await inspectionService.enviarFotoItem(
        input,
        motoristaId,
        inspecaoAtual.semanaReferencia,
        itemAlvo
      );

      clearInterval(progressInterval);

      // Atualiza o item na lista local
      const novosItens = itensInspecao.map(item =>
        item.id === itemAtualizado.id ? itemAtualizado : item
      );

      // Recalcula o resumo
      const enviados = novosItens.filter(i => i.fotoUrl).length;
      const progresso = Math.round((enviados / inspecaoAtual.totalItens) * 100);

      set({
        itensInspecao: novosItens,
        inspecaoAtual: {
          ...inspecaoAtual,
          itensEnviados: enviados,
        },
        resumo: get().resumo
          ? { ...get().resumo!, progressoEnvio: progresso }
          : null,
        isUploading: false,
        uploadProgress: 100,
      });

      // Reseta o progresso após um delay
      setTimeout(() => set({ uploadProgress: 0 }), 500);

      logger.debug('Foto enviada com sucesso', { itemId: input.itemId });
    } catch (error) {
      logger.error('Erro ao enviar foto', error);
      set({
        error: 'Não foi possível enviar a foto. Tente novamente.',
        isUploading: false,
        uploadProgress: 0,
      });
    }
  },

  /**
   * Reenvia foto de um item após manutenção.
   */
  reenviarFotoItem: async (input: ReenviarFotoInput, motoristaId: string) => {
    try {
      set({ isUploading: true, uploadProgress: 0, error: null });

      const progressInterval = setInterval(() => {
        set(state => ({
          uploadProgress: Math.min(state.uploadProgress + 10, 90),
        }));
      }, 200);

      const itemAtualizado = await inspectionService.reenviarFotoItem(input, motoristaId);

      clearInterval(progressInterval);

      // Atualiza nas listas locais
      const { itensInspecao, itensPendentesReenvio } = get();

      set({
        itensInspecao: itensInspecao.map(item =>
          item.id === itemAtualizado.id ? itemAtualizado : item
        ),
        itensPendentesReenvio: itensPendentesReenvio.map(item =>
          item.id === itemAtualizado.id ? itemAtualizado : item
        ),
        isUploading: false,
        uploadProgress: 100,
      });

      setTimeout(() => set({ uploadProgress: 0 }), 500);

      logger.debug('Foto reenviada com sucesso', { itemId: input.itemId });
    } catch (error) {
      logger.error('Erro ao reenviar foto', error);
      set({
        error: 'Não foi possível reenviar a foto. Tente novamente.',
        isUploading: false,
        uploadProgress: 0,
      });
    }
  },

  // ─────────────────────────────────────────
  // ENVIO DE INSPEÇÃO
  // ─────────────────────────────────────────

  /**
   * Finaliza e envia a inspeção para análise.
   */
  enviarInspecao: async (
    inspecaoId: string,
    motoristaId: string,
    observacoes?: string
  ) => {
    try {
      set({ isLoading: true, error: null });

      const inspecaoAtualizada = await inspectionService.enviarInspecao(
        inspecaoId,
        motoristaId,
        observacoes
      );

      set({
        inspecaoAtual: inspecaoAtualizada,
        resumo: get().resumo
          ? { ...get().resumo!, temInspecaoPendente: false }
          : null,
        isLoading: false,
      });

      logger.debug('Inspeção enviada com sucesso', { inspecaoId });
    } catch (error: any) {
      logger.error('Erro ao enviar inspeção', error);
      set({
        error: error.message || 'Não foi possível enviar a inspeção.',
        isLoading: false,
      });
    }
  },

  // ─────────────────────────────────────────
  // AÇÕES DE UI
  // ─────────────────────────────────────────

  /**
   * Seleciona um item para edição/fotografia.
   */
  selecionarItem: (itemId: string | null) => {
    set({ itemSelecionadoId: itemId });
  },

  /**
   * Limpa o erro atual.
   */
  limparErro: () => {
    set({ error: null });
  },

  /**
   * Reseta a store para o estado inicial.
   */
  reset: () => {
    set(ESTADO_INICIAL);
  },

  // ─────────────────────────────────────────
  // GETTERS COMPUTADOS
  // ─────────────────────────────────────────

  /**
   * Retorna itens agrupados por categoria com estatísticas.
   */
  getItensPorCategoria: (): CategoriaComItens[] => {
    const { itensInspecao } = get();

    return CATEGORIAS_ORDENADAS.map(categoria => {
      const itensCategoria = itensInspecao.filter(
        item => item.categoria === categoria.id
      );

      const enviados = itensCategoria.filter(item => item.fotoUrl).length;

      return {
        categoria,
        itens: itensCategoria,
        totalItens: itensCategoria.length,
        itensEnviados: enviados,
        completa: enviados === itensCategoria.length && itensCategoria.length > 0,
      };
    }).filter(cat => cat.totalItens > 0); // Remove categorias vazias
  },

  /**
   * Retorna o progresso geral de envio (0-100).
   */
  getProgresso: (): number => {
    const { inspecaoAtual, itensInspecao } = get();

    if (!inspecaoAtual || itensInspecao.length === 0) {
      return 0;
    }

    const enviados = itensInspecao.filter(item => item.fotoUrl).length;
    return Math.round((enviados / inspecaoAtual.totalItens) * 100);
  },

  /**
   * Verifica se a inspeção pode ser enviada.
   * Requer que todos os itens obrigatórios tenham foto.
   */
  podeEnviar: (): boolean => {
    const { inspecaoAtual, itensInspecao } = get();

    if (!inspecaoAtual || inspecaoAtual.status !== 'PENDENTE') {
      return false;
    }

    // Verifica se todos os itens obrigatórios têm foto
    const itensObrigatoriosSemFoto = itensInspecao.filter(item => {
      const config = ITENS_INSPECAO.find(i => i.id === item.itemId);
      return config?.obrigatorio && !item.fotoUrl;
    });

    return itensObrigatoriosSemFoto.length === 0;
  },

  /**
   * Retorna itens de uma categoria específica.
   */
  getItensCategoria: (categoria: CategoriaInspecao): ItemInspecao[] => {
    const { itensInspecao } = get();
    return itensInspecao.filter(item => item.categoria === categoria);
  },
  /**
   * Assina mudanças em tempo real para a inspeção atual.
   * Padrão Senior: Gerenciamento de memória (unsubscribe) e filtro de segurança.
   */
  subscribeToCurrentInspection: (motoristaId: string) => {
    logger.debug('Iniciando subscription realtime', { motoristaId });

    // Handler com lógica de negócio
    const handleChanges = async (action: 'create' | 'update' | 'delete', data: InspecaoVeicular) => {
      try {
        const semanaAtual = getSemanaISO(new Date());

        // Se a ação for DELETE na inspeção atual
        if (action === 'delete') {
          const { inspecaoAtual } = get();
          if (inspecaoAtual?.id === data.id) {
            set({ inspecaoAtual: null, itensInspecao: [], resumo: null });
          }
          return;
        }

        // Para CREATE ou UPDATE
        // Só nos importamos se for da semana corrente
        if (data.semanaReferencia === semanaAtual) {
          if (action === 'create') {
            // Se foi CRIADA, busca dados completos (incluindo itens gerados)
            get().carregarInspecaoAtual(motoristaId);
          } else {
            // UPDATE: atualiza localmente
            set(state => ({
              inspecaoAtual: { ...state.inspecaoAtual, ...data } as InspecaoVeicular
            }));
          }
        }
      } catch (err) {
        logger.error('Erro na lógica do realtime', err);
      }
    };

    const unsubscribe = getDb()
      .collection<InspecaoVeicular>(COLLECTION_INSPECOES)
      .subscribe(
        createSafeSubscriptionHandler<InspecaoVeicular>(
          // [FIX] Debounce para evitar múltiplas chamadas rápidas ou race conditions
          debounceSubscription(handleChanges, 1000),
          {
            moduleName: 'InspectionStore',
            requiredFields: ['id', 'motoristaId', 'semanaReferencia'],
            filterFn: (data) => data.motoristaId === motoristaId,
            onError: (err) => logger.error('Erro no processamento realtime', err)
          }
        )
      );

    return () => {
      logger.debug('Encerrando subscription realtime');
      unsubscribe();
    };
  },
}));

// ============================================
// HOOKS AUXILIARES
// ============================================

/**
 * Hook para carregar dados iniciais do motorista.
 * Deve ser chamado no início do app.
 */
export function useCarregarDadosInspecao(motoristaId: string | undefined) {
  const {
    carregarInspecaoAtual,
    carregarItensPendentesReenvio,
    carregarConfigMotorista,
  } = useInspectionStore();

  // Efeito será implementado no componente
  const carregar = async () => {
    if (!motoristaId) return;

    await Promise.all([
      carregarInspecaoAtual(motoristaId),
      carregarItensPendentesReenvio(motoristaId),
      carregarConfigMotorista(motoristaId),
    ]);
  };

  return { carregar };
}

/**
 * Seletor para obter apenas o resumo.
 */
export const useResumoInspecao = () =>
  useInspectionStore(state => state.resumo);

/**
 * Seletor para obter itens pendentes de reenvio.
 */
export const useItensPendentesReenvio = () =>
  useInspectionStore(state => state.itensPendentesReenvio);

/**
 * Seletor para obter o progresso.
 */
export const useProgressoInspecao = () =>
  useInspectionStore(state => state.getProgresso());

/**
 * Hook para obter dados de progresso formatados.
 * Compatível com inspection.tsx
 */
export function useInspectionProgress() {
  const inspecaoAtual = useInspectionStore(state => state.inspecaoAtual);
  const itensInspecao = useInspectionStore(state => state.itensInspecao);

  const total = inspecaoAtual?.totalItens || 0;
  const enviados = inspecaoAtual?.itensEnviados || 0;
  const porcentagem = total > 0 ? Math.round((enviados / total) * 100) : 0;

  return { total, enviados, porcentagem };
}

/**
 * Hook para obter alertas/problemas da inspeção.
 * Compatível com inspection.tsx
 */
export function useInspectionAlerts() {
  const inspecaoAtual = useInspectionStore(state => state.inspecaoAtual);
  const itensPendentesReenvio = useInspectionStore(state => state.itensPendentesReenvio);

  return {
    criticos: inspecaoAtual?.itensCriticos || 0,
    atencao: inspecaoAtual?.itensAtencao || 0,
    pendentesReenvio: itensPendentesReenvio.length,
  };
}

export default useInspectionStore;
