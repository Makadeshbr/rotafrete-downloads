// src/types/inspection.ts
// ============================================
// ROTAFRETE - Tipos do Sistema de Inspeção Veicular
// ============================================
// Define todas as interfaces e tipos para o módulo
// de inspeção semanal de veículos.
// ============================================

import type { TipoVeiculo } from '@/constants/pricing';

// ============================================
// ENUMS E TIPOS BASE
// ============================================

/**
 * Categorias de itens de inspeção.
 * Cada categoria agrupa itens relacionados do veículo.
 */
export type CategoriaInspecao =
  | 'PNEUS'
  | 'FREIOS'
  | 'ILUMINACAO'
  | 'VISIBILIDADE'
  | 'SEGURANCA'
  | 'FLUIDOS'
  | 'DOCUMENTACAO';

/**
 * Identificadores únicos para cada item de inspeção.
 * Baseado no checklist padrão de transportadoras.
 */
export type ItemInspecaoId =
  // Pneus e Rodas (6)
  | 'PNEU_DIANTEIRO_ESQ'
  | 'PNEU_DIANTEIRO_DIR'
  | 'PNEU_TRASEIRO_ESQ'
  | 'PNEU_TRASEIRO_DIR'
  | 'ESTEPE'
  | 'MACACO_CHAVE'
  // Freios (4)
  | 'FREIO_DIANTEIRO'
  | 'FREIO_TRASEIRO'
  | 'FREIO_MAO'
  | 'FLUIDO_FREIO'
  // Iluminação (8)
  | 'FAROL_BAIXO_ESQ'
  | 'FAROL_BAIXO_DIR'
  | 'FAROL_ALTO'
  | 'LANTERNA_TRAS_ESQ'
  | 'LANTERNA_TRAS_DIR'
  | 'LUZ_FREIO'
  | 'SETAS_PISCAS'
  | 'LUZ_RE'
  // Visibilidade (5)
  | 'PARABRISA'
  | 'RETROVISOR_INTERNO'
  | 'RETROVISOR_ESQ'
  | 'RETROVISOR_DIR'
  | 'LIMPADOR_PARABRISA'
  // Segurança (6)
  | 'CINTO_MOTORISTA'
  | 'CINTO_PASSAGEIRO'
  | 'EXTINTOR'
  | 'TRIANGULO'
  | 'BUZINA'
  | 'TRAVAS_FECHADURAS'
  // Fluidos e Motor (5)
  | 'OLEO_MOTOR'
  | 'AGUA_ARREFECIMENTO'
  | 'FLUIDO_DIRECAO'
  | 'BATERIA'
  | 'CORREIAS'
  // Documentação e Outros (4)
  | 'CRLV'
  | 'TACOGRAFO'
  | 'LIMPEZA_VEICULO'
  | 'COMPARTIMENTO_CARGA';

/**
 * Status de uma inspeção semanal completa.
 */
export type StatusInspecao =
  | 'PENDENTE'      // Aguardando envio do motorista
  | 'ENVIADA'       // Motorista enviou, aguardando análise
  | 'EM_ANALISE'    // Admin começou a avaliar
  | 'APROVADA'      // Todos os itens OK
  | 'REPROVADA'     // Há itens críticos pendentes
  | 'PARCIAL';      // Alguns itens OK, outros pendentes

/**
 * Status de avaliação de um item individual.
 */
export type StatusAvaliacao =
  | 'PENDENTE'      // Ainda não avaliado pelo admin
  | 'BOM_ESTADO'    // Item em boas condições
  | 'ATENCAO'       // Precisa de atenção/manutenção preventiva
  | 'CRITICO';      // Requer manutenção urgente

/**
 * Status de resolução quando um item precisa de reenvio.
 */
export type StatusResolucao =
  | 'PENDENTE'      // Aguardando motorista fazer manutenção e reenviar
  | 'REENVIADO'     // Motorista reenviou foto após manutenção
  | 'RESOLVIDO'     // Admin confirmou que está OK
  | 'VENCIDO';      // Prazo expirou sem resolução

/**
 * Roles de usuário no sistema.
 */
export type UserRole = 'motorista' | 'admin';

/**
 * Dias da semana (0 = Domingo, 6 = Sábado).
 */
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// ============================================
// INTERFACES DE CONFIGURAÇÃO
// ============================================

/**
 * Configuração de um item do checklist.
 * Define as propriedades de exibição e comportamento.
 */
export interface ItemInspecaoConfig {
  /** Identificador único do item */
  id: ItemInspecaoId;
  /** Nome para exibição na UI */
  nome: string;
  /** Descrição/dica para o motorista */
  descricao: string;
  /** Categoria à qual pertence */
  categoria: CategoriaInspecao;
  /** Nome do ícone (Lucide) */
  icone: string;
  /** Se o item é obrigatório ou opcional */
  obrigatorio: boolean;
  /** Ordem de exibição dentro da categoria */
  ordem: number;
  /** Tipos de veículo que precisam deste item */
  tiposVeiculo?: TipoVeiculo[];
}

/**
 * Configuração de uma categoria de inspeção.
 */
export interface CategoriaConfig {
  /** Identificador da categoria */
  id: CategoriaInspecao;
  /** Nome para exibição */
  nome: string;
  /** Descrição da categoria */
  descricao: string;
  /** Nome do ícone (Lucide) */
  icone: string;
  /** Cor tema da categoria (hex) */
  cor: string;
  /** Ordem de exibição */
  ordem: number;
}

/**
 * Configuração de cores para cada status de avaliação.
 */
export interface StatusAvaliacaoConfig {
  /** Cor de fundo */
  bg: string;
  /** Cor de fundo clara (hover) */
  bgLight: string;
  /** Cor da borda */
  border: string;
  /** Cor do texto */
  text: string;
  /** Cor do ícone */
  icon: string;
  /** Rótulo para exibição */
  label: string;
}

// ============================================
// INTERFACES DE DADOS (COLLECTIONS)
// ============================================

/**
 * Inspeção semanal completa de um veículo.
 * Collection: inspecoes_veiculares
 */
export interface InspecaoVeicular {
  /** ID único do documento */
  id: string;

  // ─── Identificação ───────────────────────
  /** ID do motorista (FK tenant_users) */
  motoristaId: string;
  /** Semana de referência no formato ISO (ex: "2026-W02") */
  semanaReferencia: string;

  // ─── Dados do Veículo (snapshot) ─────────
  veiculo: {
    placa: string;
    modelo: string;
    tipo: TipoVeiculo;
  };

  // ─── Dados do Motorista (snapshot) ───────
  motorista: {
    nome: string;
    email: string;
  };

  // ─── Status e Contadores ─────────────────
  /** Status geral da inspeção */
  status: StatusInspecao;
  /** Total de itens na inspeção */
  totalItens: number;
  /** Itens já enviados pelo motorista */
  itensEnviados: number;
  /** Itens avaliados pelo admin */
  itensAvaliados: number;
  /** Itens com status BOM_ESTADO */
  itensAprovados: number;
  /** Itens com status ATENCAO */
  itensAtencao: number;
  /** Itens com status CRITICO */
  itensCriticos: number;
  /** Itens pendentes de reenvio */
  itensPendentesReenvio: number;

  // ─── Prazos e Datas ──────────────────────
  /** Data limite para envio (ISO datetime) */
  dataLimiteEnvio: string;
  /** Data em que o motorista enviou */
  dataEnvio?: string;
  /** Data em que o admin finalizou avaliação */
  dataAvaliacao?: string;

  // ─── Responsáveis ────────────────────────
  /** ID do admin que avaliou */
  avaliadoPor?: string;
  /** Nome do admin que avaliou */
  avaliadoPorNome?: string;

  // ─── Observações ─────────────────────────
  /** Observações do motorista ao enviar */
  observacoesMotorista?: string;
  /** Observações gerais do admin */
  observacoesAdmin?: string;

  // ─── Timestamps ──────────────────────────
  createdAt: string;
  updatedAt: string;
}

/**
 * Item individual de uma inspeção (foto + avaliação).
 * Collection: itens_inspecao
 */
export interface ItemInspecao {
  /** ID único do documento */
  id: string;

  // ─── Relacionamentos ─────────────────────
  /** FK para inspecoes_veiculares */
  inspecaoId: string;
  /** ID do motorista (denormalizado para queries) */
  motoristaId: string;
  /** Semana de referência (denormalizado) */
  semanaReferencia: string;

  // ─── Identificação do Item ───────────────
  /** ID do item conforme checklist */
  itemId: ItemInspecaoId;
  /** Categoria do item */
  categoria: CategoriaInspecao;
  /** Nome para exibição */
  nomeExibicao: string;

  // ─── Foto do Motorista ───────────────────
  /** URL da foto no Aether Storage */
  fotoUrl?: string;
  /** URL do thumbnail (versão reduzida) */
  fotoThumbnailUrl?: string;
  /** Metadados da foto */
  fotoMetadata?: {
    width: number;
    height: number;
    size: number;
    mimeType: string;
  };
  /** Data do envio da foto */
  dataEnvioFoto?: string;

  // ─── Avaliação do Admin ──────────────────
  /** Status da avaliação */
  statusAvaliacao: StatusAvaliacao;
  /** ID do admin que avaliou */
  avaliadoPor?: string;
  /** Data da avaliação */
  dataAvaliacao?: string;
  /** Observação do admin sobre este item */
  observacaoAdmin?: string;

  // ─── Prazo (quando CRITICO ou ATENCAO) ───
  /** Data limite para manutenção */
  prazoManutencao?: string;
  /** Dias definidos para manutenção */
  diasParaManutencao?: number;

  // ─── Resolução/Reenvio ───────────────────
  /** Se requer reenvio de foto após manutenção */
  requerReenvio: boolean;
  /** Status da resolução */
  statusResolucao?: StatusResolucao | null;
  /** URL da foto de reenvio */
  fotoReenvioUrl?: string;
  /** Data do reenvio */
  dataReenvio?: string;
  /** Observação do motorista no reenvio */
  observacaoReenvio?: string;

  // ─── Timestamps ──────────────────────────
  createdAt: string;
  updatedAt: string;
}

/**
 * Configuração de inspeção personalizada por motorista.
 * Collection: config_inspecao_motorista
 */
export interface ConfigInspecaoMotorista {
  /** ID único do documento */
  id: string;
  /** ID do motorista */
  motoristaId: string;

  // ─── Agendamento de Lembretes ────────────
  /** Dia da semana para lembrete principal (0-6) */
  diaLembretePrincipal: DiaSemana;
  /** Hora do lembrete principal (ex: "08:00") */
  horaLembretePrincipal: string;
  /** Se deve enviar lembrete antecipado (1 dia antes) */
  lembreteAntecipado: boolean;
  /** Hora do lembrete antecipado */
  horaLembreteAntecipado?: string;

  // ─── Preferências ────────────────────────
  /** Se notificações push estão ativas */
  notificacoesAtivas: boolean;
  /** Se deve notificar quando avaliação concluída */
  notificarAvaliacao: boolean;
  /** Se deve notificar itens críticos imediatamente */
  notificarCriticos: boolean;

  // ─── Controle ────────────────────────────
  /** Timestamp do último lembrete enviado */
  ultimoLembreteEnviado?: string;
  /** Semana do último lembrete */
  semanaUltimoLembrete?: string;

  // ─── Timestamps ──────────────────────────
  createdAt: string;
  updatedAt: string;
}

/**
 * Configuração global do sistema de inspeções (definida pelo admin).
 * Collection: config_inspecao_global
 */
export interface ConfigInspecaoGlobal {
  /** ID único (geralmente só existe um documento) */
  id: string;

  // ─── Prazos Padrão ───────────────────────
  /** Dia da semana para deadline de envio (0-6) */
  diaPrazoEnvio: DiaSemana;
  /** Hora limite para envio (ex: "18:00") */
  horaPrazoEnvio: string;
  /** Dias de antecedência para criar inspeção */
  diasAntecedenciaCriacao: number;

  // ─── Lembretes Padrão ────────────────────
  /** Dia padrão para lembrete (se motorista não configurou) */
  diaLembretePadrao: DiaSemana;
  /** Hora padrão para lembrete */
  horaLembretePadrao: string;

  // ─── Prazos de Manutenção ────────────────
  /** Prazo padrão para itens ATENCAO (dias) */
  prazoAtencaoPadrao: number;
  /** Prazo padrão para itens CRITICO (dias) */
  prazoCriticoPadrao: number;

  // ─── Itens Ativos ────────────────────────
  /** Lista de IDs de itens ativos no checklist */
  itensAtivos: ItemInspecaoId[];

  // ─── Timestamps ──────────────────────────
  updatedAt: string;
  updatedBy: string;
}

/**
 * Histórico de avaliações (audit trail).
 * Collection: historico_avaliacoes
 */
export interface HistoricoAvaliacao {
  /** ID único do documento */
  id: string;

  // ─── Referências ─────────────────────────
  itemInspecaoId: string;
  inspecaoId: string;
  motoristaId: string;

  // ─── Ação ────────────────────────────────
  /** ID do admin que fez a ação */
  adminId: string;
  /** Nome do admin */
  adminNome: string;
  /** Status anterior */
  statusAnterior: StatusAvaliacao;
  /** Novo status */
  statusNovo: StatusAvaliacao;
  /** Observação registrada */
  observacao?: string;
  /** Prazo definido (se aplicável) */
  prazoDefinido?: number;

  // ─── Timestamps ──────────────────────────
  createdAt: string;
}

// ============================================
// INTERFACES DE INPUT (FORMULÁRIOS)
// ============================================

/**
 * Dados para criar uma nova inspeção.
 */
export interface CriarInspecaoInput {
  motoristaId: string;
  semanaReferencia: string;
  dataLimiteEnvio: string;
}

/**
 * Dados para enviar foto de um item.
 */
export interface EnviarFotoItemInput {
  itemId: string;
  foto: {
    uri: string;
    type: string;
    name: string;
    width: number;
    height: number;
  };
  observacao?: string;
}

/**
 * Dados para avaliar um item (admin).
 */
export interface AvaliarItemInput {
  itemId: string;
  status: StatusAvaliacao;
  observacao?: string;
  diasParaManutencao?: number;
}

/**
 * Dados para reenviar foto após manutenção.
 */
export interface ReenviarFotoInput {
  itemId: string;
  foto: {
    uri: string;
    type: string;
    name: string;
    width: number;
    height: number;
  };
  observacao?: string;
}

// ============================================
// INTERFACES DE RESPOSTA (API/STORE)
// ============================================

/**
 * Resumo de inspeções para o dashboard admin.
 */
export interface ResumoInspecoesAdmin {
  /** Total de motoristas ativos */
  totalMotoristas: number;
  /** Inspeções enviadas aguardando análise */
  inspecoesParaAnalisar: number;
  /** Inspeções não enviadas (prazo não vencido) */
  inspecoesPendentes: number;
  /** Inspeções com prazo vencido */
  inspecoesAtrasadas: number;
  /** Itens críticos pendentes de resolução */
  itensCriticosPendentes: number;
  /** Itens com prazo de manutenção vencendo hoje */
  itensVencendoHoje: number;
}

/**
 * Resumo de inspeção para o motorista.
 */
export interface ResumoInspecaoMotorista {
  /** Se tem inspeção pendente de envio */
  temInspecaoPendente: boolean;
  /** Inspeção atual (se existir) */
  inspecaoAtual?: InspecaoVeicular;
  /** Progresso de envio (0-100) */
  progressoEnvio: number;
  /** Itens que precisam de atenção/reenvio */
  itensComProblema: ItemInspecao[];
  /** Próximo prazo de envio */
  proximoPrazo?: string;
  /** Dias restantes para o prazo */
  diasRestantes?: number;
}

/**
 * Dados de um motorista para listagem admin.
 */
export interface MotoristaResumo {
  id: string;
  nome: string;
  email: string;
  veiculo: {
    placa: string;
    modelo: string;
    tipo: TipoVeiculo;
  };
  /** Última inspeção */
  ultimaInspecao?: {
    id: string; // [FIX] ID para navegação
    semana: string;
    status: StatusInspecao;
    dataEnvio?: string;
  };
  /** Itens críticos pendentes */
  itensCriticos: number;
  /** Itens com atenção pendentes */
  itensAtencao: number;
}

// ============================================
// INTERFACES DE NOTIFICAÇÃO
// ============================================

/**
 * Tipos de notificação do sistema de inspeção.
 */
export type TipoNotificacaoInspecao =
  | 'LEMBRETE_ENVIO'           // Lembrete para enviar inspeção
  | 'PRAZO_EXPIRANDO'          // Prazo de envio expirando (24h)
  | 'INSPECAO_ENVIADA'         // Para admin: motorista enviou
  | 'AVALIACAO_CONCLUIDA'      // Para motorista: admin avaliou
  | 'ITEM_CRITICO'             // Para motorista: item marcado crítico
  | 'PRAZO_MANUTENCAO'         // Prazo de manutenção expirando
  | 'REENVIO_RECEBIDO';        // Para admin: motorista reenviou

/**
 * Payload de notificação.
 */
export interface NotificacaoInspecaoPayload {
  tipo: TipoNotificacaoInspecao;
  titulo: string;
  corpo: string;
  dados: {
    inspecaoId?: string;
    itemId?: string;
    motoristaId?: string;
    semana?: string;
  };
}

// ============================================
// INTERFACES DE PDF/RELATÓRIO
// ============================================

/**
 * Dados para geração de relatório PDF.
 */
export interface RelatorioInspecaoData {
  /** Período do relatório */
  periodo: {
    tipo: 'semanal' | 'mensal' | 'personalizado';
    inicio: string;
    fim: string;
    semanaReferencia?: string;
  };

  /** Filtros aplicados */
  filtros: {
    motoristas?: string[];      // IDs, vazio = todos
    status?: StatusInspecao[];
    apenasComProblemas?: boolean;
  };

  /** Dados dos motoristas/inspeções */
  dados: Array<{
    motorista: MotoristaResumo;
    inspecao?: InspecaoVeicular;
    itens: ItemInspecao[];
  }>;

  /** Resumo geral */
  resumo: {
    totalMotoristas: number;
    totalInspecoes: number;
    aprovadas: number;
    reprovadas: number;
    pendentes: number;
    totalItensAvaliados: number;
    itensBomEstado: number;
    itensAtencao: number;
    itensCriticos: number;
  };

  /** Metadados */
  geradoEm: string;
  geradoPor: string;
}
