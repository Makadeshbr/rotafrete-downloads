// src/store/useAdminStore.ts
// ============================================
// ROTAFRETE - Store do Painel Admin
// ============================================
// Gerencia o estado do painel administrativo:
// - Dashboard e resumos
// - Lista de motoristas
// - Avaliação de inspeções
// - [NOVO] Histórico de inspeções finalizadas
// - Configurações globais
// ============================================

import { create } from 'zustand';
import { getDb } from '@aether-baas/react-native';
import { createLogger } from '@/utils/logger';
import { inspectionService } from '@/services/inspection-service';
import type {
  InspecaoVeicular,
  ItemInspecao,
  MotoristaResumo,
  ResumoInspecoesAdmin,
  ConfigInspecaoGlobal,
  AvaliarItemInput,
  StatusAvaliacao,
  HistoricoAvaliacao,
} from '@/types/inspection';

// ============================================
// LOGGER
// ============================================

const logger = createLogger('AdminStore');

// ============================================
// TIPOS DA STORE
// ============================================

/**
 * Filtros para listagem de inspeções.
 */
interface FiltrosInspecao {
  status?: string[];
  semana?: string;
  motoristaId?: string;
  apenasAtrasadas?: boolean;
  apenasComCriticos?: boolean;
}

/**
 * Inspeção com itens carregados (para avaliação).
 */
interface InspecaoComItens extends InspecaoVeicular {
  itens: ItemInspecao[];
}

/**
 * Interface do estado da store admin.
 */
interface AdminState {
  // ─── Estado Principal ────────────────────
  /** Resumo geral para dashboard */
  resumo: ResumoInspecoesAdmin | null;
  /** Lista de motoristas cadastrados */
  motoristas: MotoristaResumo[];
  /** Inspeções pendentes de análise */
  inspecoesPendentes: InspecaoVeicular[];
  /** Inspeções atrasadas */
  inspecoesAtrasadas: InspecaoVeicular[];
  /** Itens críticos pendentes */
  itensCriticos: ItemInspecao[];
  /** Configuração global do sistema */
  configGlobal: ConfigInspecaoGlobal | null;

  // ─── [NOVO] Histórico de Inspeções ───────
  /** Inspeções finalizadas (APROVADA/REPROVADA) */
  historicoInspecoes: InspecaoVeicular[];
  /** Estatísticas do histórico */
  estatisticasHistorico: {
    aprovadas: number;
    reprovadas: number;
    total: number;
  };

  // ─── Estado de Avaliação ─────────────────
  /** Inspeção sendo avaliada atualmente */
  inspecaoEmAvaliacao: InspecaoComItens | null;
  /** Item sendo avaliado no momento */
  itemEmAvaliacao: ItemInspecao | null;
  /** Histórico de avaliações do item atual */
  historicoItem: HistoricoAvaliacao[];

  // ─── Filtros e Paginação ─────────────────
  filtros: FiltrosInspecao;
  paginaAtual: number;
  totalPaginas: number;
  itensPorPagina: number;

  // ─── Estado de UI ────────────────────────
  isLoading: boolean;
  isLoadingAvaliacao: boolean;
  isLoadingHistorico: boolean; // [NOVO]
  error: string | null;
  sucesso: string | null;

  // ─── Ações de Carregamento ───────────────
  /** Carrega dados do dashboard */
  carregarDashboard: () => Promise<void>;
  /** Carrega lista de motoristas */
  carregarMotoristas: () => Promise<void>;
  /** Carrega inspeções pendentes de análise */
  carregarInspecoesPendentes: () => Promise<void>;
  /** Carrega inspeções atrasadas */
  carregarInspecoesAtrasadas: () => Promise<void>;
  /** Carrega itens críticos pendentes */
  carregarItensCriticos: () => Promise<void>;
  /** Carrega configuração global */
  carregarConfigGlobal: () => Promise<void>;
  /** [NOVO] Carrega histórico de inspeções finalizadas */
  carregarHistoricoInspecoes: (limite?: number, semana?: string, motoristaId?: string) => Promise<void>;

  // ─── Ações de Avaliação ──────────────────
  /** Inicia avaliação de uma inspeção */
  iniciarAvaliacao: (inspecaoId: string) => Promise<void>;
  /** Avalia um item da inspeção */
  avaliarItem: (input: AvaliarItemInput, adminId: string, adminNome: string) => Promise<void>;
  /** Confirma resolução de item reenviado */
  confirmarResolucao: (itemId: string, adminId: string, adminNome: string) => Promise<void>;
  /** Finaliza avaliação da inspeção */
  finalizarAvaliacao: (adminId: string, adminNome: string, observacoes?: string) => Promise<void>;
  /** Seleciona item para avaliação */
  selecionarItemAvaliacao: (item: ItemInspecao | null) => void;
  /** Cancela avaliação em andamento */
  cancelarAvaliacao: () => void;

  // ─── Ações de Configuração ───────────────
  /** Atualiza configuração global */
  atualizarConfigGlobal: (config: Partial<ConfigInspecaoGlobal>, adminId: string) => Promise<void>;
  /** Gera inspeções da semana manualmente (Trigger HTTP) */
  gerarInspecaoSemanal: () => Promise<any>;

  // ─── Ações de Filtro ─────────────────────
  setFiltros: (filtros: Partial<FiltrosInspecao>) => void;
  limparFiltros: () => void;
  setPagina: (pagina: number) => void;

  // ─── Ações de UI ─────────────────────────
  limparErro: () => void;
  limparSucesso: () => void;
  reset: () => void;

  // ─── Getters ─────────────────────────────
  /** Retorna itens agrupados por categoria na avaliação */
  getItensPorCategoriaAvaliacao: () => Record<string, ItemInspecao[]>;
  /** Retorna progresso da avaliação atual */
  getProgressoAvaliacao: () => { avaliados: number; total: number; porcentagem: number };
}

// ============================================
// ESTADO INICIAL
// ============================================

const ESTADO_INICIAL = {
  resumo: null,
  motoristas: [],
  inspecoesPendentes: [],
  inspecoesAtrasadas: [],
  itensCriticos: [],
  configGlobal: null,
  // [NOVO] Histórico
  historicoInspecoes: [],
  estatisticasHistorico: {
    aprovadas: 0,
    reprovadas: 0,
    total: 0,
  },
  inspecaoEmAvaliacao: null,
  itemEmAvaliacao: null,
  historicoItem: [],
  filtros: {},
  paginaAtual: 1,
  totalPaginas: 1,
  itensPorPagina: 20,
  isLoading: false,
  isLoadingAvaliacao: false,
  isLoadingHistorico: false, // [NOVO]
  error: null,
  sucesso: null,
};

// ============================================
// STORE
// ============================================

export const useAdminStore = create<AdminState>((set, get) => ({
  ...ESTADO_INICIAL,

  // ─────────────────────────────────────────
  // CARREGAMENTO DE DADOS
  // ─────────────────────────────────────────

  /**
   * Carrega todos os dados do dashboard.
   */
  carregarDashboard: async () => {
    try {
      set({ isLoading: true, error: null });

      // Carrega tudo em paralelo
      await Promise.all([
        get().carregarMotoristas(),
        get().carregarInspecoesPendentes(),
        get().carregarInspecoesAtrasadas(),
        get().carregarItensCriticos(),
        get().carregarConfigGlobal(),
      ]);

      // Gera resumo
      const {
        motoristas,
        inspecoesPendentes,
        inspecoesAtrasadas,
        itensCriticos,
      } = get();

      // Calcula itens vencendo hoje
      const hoje = new Date();
      hoje.setHours(23, 59, 59, 999);
      const hojeISO = hoje.toISOString();
      const vencendoHoje = itensCriticos.filter(
        i => i.prazoManutencao && i.prazoManutencao <= hojeISO
      );

      const resumo: ResumoInspecoesAdmin = {
        totalMotoristas: motoristas.length,
        inspecoesParaAnalisar: inspecoesPendentes.length,
        inspecoesPendentes: 0, // Calculado abaixo
        inspecoesAtrasadas: inspecoesAtrasadas.length,
        itensCriticosPendentes: itensCriticos.length,
        itensVencendoHoje: vencendoHoje.length,
      };

      set({ resumo, isLoading: false });

      logger.debug('Dashboard carregado', resumo);
    } catch (error) {
      logger.error('Erro ao carregar dashboard', error);
      set({
        error: 'Não foi possível carregar o dashboard.',
        isLoading: false,
      });
    }
  },

  /**
   * Carrega lista de motoristas cadastrados.
   * [OTIMIZADO] Busca em lote para evitar N+1 queries.
   */
  carregarMotoristas: async () => {
    try {
      // Usa motoristaService para buscar da coleção 'motoristas' (não tenant_users)
      const { motoristaService } = await import('@/services/motorista-service');

      // 1. Busca todos os motoristas e inspeções recentes em paralelo
      const [usuarios, todasInspecoes] = await Promise.all([
        motoristaService.listarTodos(),
        inspectionService.listarTodasInspecoes(500) // Busca as 500 mais recentes
      ]);

      // 2. Mapeia inspeções para fácil acesso por motoristaId
      const inspecoesPorMotorista: Record<string, InspecaoVeicular> = {};

      // Como a lista já vem ordenada por DESC, a primeira que encontrarmos é a mais recente
      // Mas para garantir, vamos iterar e pegar a mais nova
      todasInspecoes.forEach(inspecao => {
        const atual = inspecoesPorMotorista[inspecao.motoristaId];
        if (!atual || new Date(inspecao.createdAt) > new Date(atual.createdAt)) {
          inspecoesPorMotorista[inspecao.motoristaId] = inspecao;
        }
      });

      // 3. Monta o DTO final sem fazer requisições extras
      const motoristas: MotoristaResumo[] = usuarios.map((user) => {
        const ultimaInspecao = inspecoesPorMotorista[user.userId];

        // [OTIMIZACAO] Usa contadores cacheados na inspeção em vez de buscar itens
        // Se a inspeção for muito antiga ou não tiver contadores, assume 0
        const itensCriticos = ultimaInspecao?.itensCriticos || 0;
        const itensAtencao = ultimaInspecao?.itensAtencao || 0;

        return {
          id: user.userId,
          nome: user.nome || user.email,
          email: user.email,
          veiculo: {
            placa: user.placaVeiculo || 'N/A',
            modelo: user.modeloVeiculo || 'N/A',
            tipo: (user.tipoVeiculo || 'UTILITARIO') as any,
          },
          ultimaInspecao: ultimaInspecao
            ? {
              id: ultimaInspecao.id,
              semana: ultimaInspecao.semanaReferencia,
              status: ultimaInspecao.status,
              dataEnvio: ultimaInspecao.dataEnvio,
            }
            : undefined,
          itensCriticos,
          itensAtencao,
        };
      });

      set({ motoristas });

      logger.debug('Motoristas carregados (Otimizado)', { total: motoristas.length });
    } catch (error) {
      logger.error('Erro ao carregar motoristas', error);
      throw error;
    }
  },

  /**
   * Carrega inspeções pendentes de análise.
   */
  carregarInspecoesPendentes: async () => {
    try {
      const inspecoes = await inspectionService.listarInspecoesPendentesAnalise();
      set({ inspecoesPendentes: inspecoes });
    } catch (error) {
      logger.error('Erro ao carregar inspeções pendentes', error);
      throw error;
    }
  },

  /**
   * Carrega inspeções atrasadas.
   */
  carregarInspecoesAtrasadas: async () => {
    try {
      const inspecoes = await inspectionService.listarInspecoesAtrasadas();
      set({ inspecoesAtrasadas: inspecoes });
    } catch (error) {
      logger.error('Erro ao carregar inspeções atrasadas', error);
      throw error;
    }
  },

  /**
   * Carrega itens críticos pendentes de resolução.
   */
  carregarItensCriticos: async () => {
    try {
      const itens = await inspectionService.listarItensCriticosPendentes();
      set({ itensCriticos: itens });
    } catch (error) {
      logger.error('Erro ao carregar itens críticos', error);
      throw error;
    }
  },

  /**
   * Carrega configuração global do sistema.
   */
  carregarConfigGlobal: async () => {
    try {
      const config = await inspectionService.getConfigGlobal();
      set({ configGlobal: config });
    } catch (error) {
      logger.error('Erro ao carregar configuração global', error);
      throw error;
    }
  },

  // ============================================
  // [NOVO] HISTÓRICO DE INSPEÇÕES FINALIZADAS
  // ============================================

  /**
   * Carrega histórico de inspeções finalizadas (APROVADA/REPROVADA).
   * 
   * @param limite - Número máximo de inspeções a carregar (padrão: 50)
   * @param semana - Filtrar por semana específica (opcional)
   * @param motoristaId - Filtrar por motorista específico (opcional)
   */
  carregarHistoricoInspecoes: async (
    limite: number = 50,
    semana?: string,
    motoristaId?: string
  ) => {
    try {
      set({ isLoadingHistorico: true, error: null });

      // Carrega inspeções finalizadas e estatísticas em paralelo
      const [inspecoes, estatisticas] = await Promise.all([
        inspectionService.listarInspecoesFinalizadas(limite, semana, motoristaId),
        inspectionService.contarInspecoesFinalizadas(),
      ]);

      set({
        historicoInspecoes: inspecoes,
        estatisticasHistorico: estatisticas,
        isLoadingHistorico: false,
      });

      logger.debug('Histórico de inspeções carregado', {
        total: inspecoes.length,
        estatisticas,
      });
    } catch (error) {
      logger.error('Erro ao carregar histórico de inspeções', error);
      set({
        error: 'Não foi possível carregar o histórico de inspeções.',
        isLoadingHistorico: false,
      });
    }
  },

  // ─────────────────────────────────────────
  // AVALIAÇÃO
  // ─────────────────────────────────────────

  /**
   * Inicia a avaliação de uma inspeção.
   * Carrega a inspeção e todos os seus itens.
   */
  iniciarAvaliacao: async (inspecaoId: string) => {
    try {
      set({ isLoadingAvaliacao: true, error: null });

      // Busca inspeção e itens
      const [inspecao, itens] = await Promise.all([
        inspectionService.getInspecaoPorId(inspecaoId),
        inspectionService.listarItensInspecao(inspecaoId),
      ]);

      if (!inspecao) {
        throw new Error('Inspeção não encontrada');
      }

      set({
        inspecaoEmAvaliacao: { ...inspecao, itens },
        isLoadingAvaliacao: false,
      });

      logger.debug('Avaliação iniciada', {
        inspecaoId,
        totalItens: itens.length,
      });
    } catch (error) {
      logger.error('Erro ao iniciar avaliação', error);
      set({
        error: 'Não foi possível carregar a inspeção.',
        isLoadingAvaliacao: false,
      });
    }
  },

  /**
   * Avalia um item da inspeção.
   */
  avaliarItem: async (
    input: AvaliarItemInput,
    adminId: string,
    adminNome: string
  ) => {
    try {
      set({ isLoadingAvaliacao: true, error: null });

      const itemAtualizado = await inspectionService.avaliarItem(
        input,
        adminId,
        adminNome
      );

      // Atualiza o item na lista local
      const { inspecaoEmAvaliacao } = get();
      if (inspecaoEmAvaliacao) {
        const novosItens = inspecaoEmAvaliacao.itens.map(item =>
          item.id === itemAtualizado.id ? itemAtualizado : item
        );

        set({
          inspecaoEmAvaliacao: { ...inspecaoEmAvaliacao, itens: novosItens },
          itemEmAvaliacao: null, // Fecha o modal de avaliação
          sucesso: 'Item avaliado com sucesso!',
          isLoadingAvaliacao: false,
        });
      }

      // Limpa mensagem de sucesso após 3 segundos
      setTimeout(() => set({ sucesso: null }), 3000);

      logger.debug('Item avaliado', { itemId: input.itemId, status: input.status });
    } catch (error) {
      logger.error('Erro ao avaliar item', error);
      set({
        error: 'Não foi possível avaliar o item.',
        isLoadingAvaliacao: false,
      });
    }
  },

  /**
   * Confirma resolução de um item reenviado.
   */
  confirmarResolucao: async (
    itemId: string,
    adminId: string,
    adminNome: string
  ) => {
    try {
      set({ isLoadingAvaliacao: true, error: null });

      const itemAtualizado = await inspectionService.confirmarResolucao(
        itemId,
        adminId,
        adminNome
      );

      // Atualiza o item na lista local
      const { inspecaoEmAvaliacao, itensCriticos } = get();

      if (inspecaoEmAvaliacao) {
        const novosItens = inspecaoEmAvaliacao.itens.map(item =>
          item.id === itemAtualizado.id ? itemAtualizado : item
        );
        set({
          inspecaoEmAvaliacao: { ...inspecaoEmAvaliacao, itens: novosItens },
        });
      }

      // Remove da lista de críticos
      set({
        itensCriticos: itensCriticos.filter(i => i.id !== itemId),
        sucesso: 'Resolução confirmada!',
        isLoadingAvaliacao: false,
      });

      setTimeout(() => set({ sucesso: null }), 3000);

      logger.debug('Resolução confirmada', { itemId });
    } catch (error) {
      logger.error('Erro ao confirmar resolução', error);
      set({
        error: 'Não foi possível confirmar a resolução.',
        isLoadingAvaliacao: false,
      });
    }
  },

  /**
   * Finaliza a avaliação da inspeção atual.
   */
  finalizarAvaliacao: async (
    adminId: string,
    adminNome: string,
    observacoes?: string
  ) => {
    const { inspecaoEmAvaliacao } = get();

    if (!inspecaoEmAvaliacao) {
      set({ error: 'Nenhuma inspeção em avaliação.' });
      return;
    }

    try {
      set({ isLoadingAvaliacao: true, error: null });

      const inspecaoAtualizada = await inspectionService.finalizarAvaliacao(
        inspecaoEmAvaliacao.id,
        adminId,
        adminNome,
        observacoes
      );

      // Remove da lista de pendentes
      const { inspecoesPendentes } = get();

      set({
        inspecoesPendentes: inspecoesPendentes.filter(
          i => i.id !== inspecaoEmAvaliacao.id
        ),
        inspecaoEmAvaliacao: null,
        sucesso: `Inspeção ${inspecaoAtualizada.status === 'APROVADA' ? 'aprovada' : 'finalizada'}!`,
        isLoadingAvaliacao: false,
      });

      // Recarrega dashboard
      get().carregarDashboard();

      setTimeout(() => set({ sucesso: null }), 3000);

      logger.debug('Avaliação finalizada', {
        inspecaoId: inspecaoEmAvaliacao.id,
        status: inspecaoAtualizada.status,
      });
    } catch (error: any) {
      logger.error('Erro ao finalizar avaliação', error);
      set({
        error: error.message || 'Não foi possível finalizar a avaliação.',
        isLoadingAvaliacao: false,
      });
    }
  },

  /**
   * Seleciona um item para avaliação (abre modal).
   */
  selecionarItemAvaliacao: (item: ItemInspecao | null) => {
    set({ itemEmAvaliacao: item, historicoItem: [] });

    // Se selecionou um item, busca histórico
    if (item) {
      // Busca histórico de avaliações do item
      import('@/services/inspection-service').then(({ inspectionService }) => {
        inspectionService.listarHistoricoItem(item.id)
          .then(historico => set({ historicoItem: historico }))
          .catch(err => {
            console.error('Erro ao buscar histórico:', err);
            set({ historicoItem: [] });
          });
      });
    }
  },

  /**
   * Cancela a avaliação em andamento.
   */
  cancelarAvaliacao: () => {
    set({
      inspecaoEmAvaliacao: null,
      itemEmAvaliacao: null,
      historicoItem: [],
    });
  },

  // ─────────────────────────────────────────
  // CONFIGURAÇÃO
  // ─────────────────────────────────────────

  /**
   * Atualiza configuração global do sistema.
   */
  atualizarConfigGlobal: async (
    config: Partial<ConfigInspecaoGlobal>,
    adminId: string
  ) => {
    try {
      set({ isLoading: true, error: null });

      const configAtualizada = await inspectionService.updateConfigGlobal(
        config,
        adminId
      );

      set({
        configGlobal: configAtualizada,
        sucesso: 'Configurações salvas!',
        isLoading: false,
      });

      setTimeout(() => set({ sucesso: null }), 3000);

      logger.debug('Configuração global atualizada', config);
    } catch (error) {
      logger.error('Erro ao atualizar configuração', error);
      set({
        error: 'Não foi possível salvar as configurações.',
        isLoading: false,
      });
    }
  },

  /**
   * Gera inspeções da semana manualmente via Function HTTP.
   */
  gerarInspecaoSemanal: async () => {
    try {
      set({ isLoading: true, error: null });

      const { getFunctions } = await import('@aether-baas/react-native');
      const functions = getFunctions();

      // [SDK 3.5.1] Agora o método httpsCallable é oficial e tipado
      const generateInspection = functions.httpsCallable<any, { success: boolean; summary: { created: number; alreadyExisted: number; totalActiveDrivers: number }; error?: string; message?: string }>('generate-inspection-manual');

      // O SDK retorna { data: ResponseData }
      // [FIX] Enviar force: true para recriar se já existir (comportamento de debug/admin)
      const { data } = await generateInspection({ force: true });

      if (data.success) {
        set({
          sucesso: `Inspeções geradas! (Criadas: ${data.summary?.created || 0})`,
          isLoading: false
        });
        setTimeout(() => set({ sucesso: null }), 3000);
        logger.debug('Inspeção manual gerada', data);
        return data; // Retorna para uso na UI
      } else {
        throw new Error(data.error || data.message || 'Erro desconhecido ao gerar inspeções');
      }

    } catch (error: any) {
      logger.error('Erro ao gerar inspeção manual', { message: error.message, stack: error.stack });
      console.error('FULL ERROR:', error); // Fallback manual pro console do Metro
      set({
        error: error.message || 'Falha ao gerar inspeções.',
        isLoading: false,
      });
      throw error; // Re-throw para a UI tratar
    }
  },

  // ─────────────────────────────────────────
  // FILTROS
  // ─────────────────────────────────────────

  setFiltros: (filtros: Partial<FiltrosInspecao>) => {
    set(state => ({
      filtros: { ...state.filtros, ...filtros },
      paginaAtual: 1, // Reseta para primeira página
    }));
  },

  limparFiltros: () => {
    set({ filtros: {}, paginaAtual: 1 });
  },

  setPagina: (pagina: number) => {
    set({ paginaAtual: pagina });
  },

  // ─────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────

  limparErro: () => {
    set({ error: null });
  },

  limparSucesso: () => {
    set({ sucesso: null });
  },

  reset: () => {
    set(ESTADO_INICIAL);
  },

  // ─────────────────────────────────────────
  // GETTERS
  // ─────────────────────────────────────────

  /**
   * Retorna itens agrupados por categoria para a avaliação atual.
   */
  getItensPorCategoriaAvaliacao: (): Record<string, ItemInspecao[]> => {
    const { inspecaoEmAvaliacao } = get();

    if (!inspecaoEmAvaliacao) {
      return {};
    }

    return inspecaoEmAvaliacao.itens.reduce((acc, item) => {
      if (!acc[item.categoria]) {
        acc[item.categoria] = [];
      }
      acc[item.categoria].push(item);
      return acc;
    }, {} as Record<string, ItemInspecao[]>);
  },

  /**
   * Retorna o progresso da avaliação atual.
   */
  getProgressoAvaliacao: () => {
    const { inspecaoEmAvaliacao } = get();

    if (!inspecaoEmAvaliacao) {
      return { avaliados: 0, total: 0, porcentagem: 0 };
    }

    const total = inspecaoEmAvaliacao.itens.length;
    const avaliados = inspecaoEmAvaliacao.itens.filter(
      i => i.statusAvaliacao !== 'PENDENTE'
    ).length;

    return {
      avaliados,
      total,
      porcentagem: total > 0 ? Math.round((avaliados / total) * 100) : 0,
    };
  },
}));

// ============================================
// HOOKS AUXILIARES
// ============================================

/**
 * Seletor para resumo do dashboard.
 */
export const useResumoAdmin = () =>
  useAdminStore(state => state.resumo);

/**
 * Seletor para inspeções pendentes.
 */
export const useInspecoesPendentes = () =>
  useAdminStore(state => state.inspecoesPendentes);

/**
 * Seletor para itens críticos.
 */
export const useItensCriticos = () =>
  useAdminStore(state => state.itensCriticos);

/**
 * Seletor para a inspeção em avaliação.
 */
export const useInspecaoEmAvaliacao = () =>
  useAdminStore(state => state.inspecaoEmAvaliacao);

/**
 * [NOVO] Seletor para histórico de inspeções.
 */
export const useHistoricoInspecoes = () =>
  useAdminStore(state => state.historicoInspecoes);

/**
 * [NOVO] Seletor para estatísticas do histórico.
 */
export const useEstatisticasHistorico = () =>
  useAdminStore(state => state.estatisticasHistorico);

export default useAdminStore;