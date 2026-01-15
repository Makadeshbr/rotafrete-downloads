// src/types/index.ts
// ============================================
// ROTAFRETE - Tipos TypeScript
// ============================================

import type {
  TipoVeiculo,
  FaixaKm,
  Turno,
  TipoDia
} from '@/constants/pricing';
import type {
  TipoCombustivel,
  ParteVeiculo,
  StatusManutencao
} from '@/constants';

// ============================================
// USUÁRIO / MOTORISTA
// ============================================

export interface Motorista {
  id: string;
  email: string;
  name: string;
  // Dados no campo `data` do tenant_users
  data: {
    tipoVeiculo: TipoVeiculo;
    placaVeiculo: string;
    modeloVeiculo: string;
    anoVeiculo: number;
    turnoPreferido: Turno;
    cidadeBase: string;
    telefone?: string;
    cpf?: string;
  };
  emailVerified: boolean;
  status: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface MotoristaRegistro {
  email: string;
  password: string;
  name: string;
  data: {
    tipoVeiculo: TipoVeiculo;
    placaVeiculo: string;
    modeloVeiculo: string;
    anoVeiculo: number;
    turnoPreferido: Turno;
    cidadeBase: string;
  };
}

// ============================================
// ROTAS / REGISTROS DIÁRIOS
// ============================================

export interface Rota {
  id: string;
  motoristaId: string;
  data: string; // ISO date string
  turno: Turno;
  tipoDia: TipoDia;
  kmRodados: number;
  faixaKm: FaixaKm;
  valorFrete: number;       // Valor total (KM + paradas)
  valorFreteBase?: number;  // [NOVO] Valor apenas dos KMs
  // [NOVO] Campos de paradas
  quantidadeParadas?: number;
  valorParadas?: number;    // Adicional calculado pelas paradas
  adicionalParadas?: number; // Alias para valorParadas (compatibilidade store)
  // [NOVO] Flag de ida+volta
  idaVolta?: boolean;
  origem?: string;
  destino?: string;
  cidadeDestino?: string;
  observacoes?: string;
  createdAt: string;
}

export interface RotaInput {
  data: string;
  turno: Turno;
  kmRodados: number;
  // [NOVO] Campos de paradas
  paradas?: number;         // Quantidade de paradas/entregas
  quantidadeParadas?: number; // Alias para paradas
  valorParadas?: number;    // Valor calculado (opcional, calculado automaticamente)
  valorFrete?: number;      // Valor do frete (opcional, calculado automaticamente)
  // [NOVO] Opções de rota
  idaVolta?: boolean;       // Se é ida e volta (duplica km para cálculo)
  origem?: string;
  destino?: string;
  cidadeDestino?: string;
  observacoes?: string;
  tipoVeiculo?: TipoVeiculo;
}

// ============================================
// ABASTECIMENTOS
// ============================================

export interface Abastecimento {
  id: string;
  motoristaId: string;
  rotaId?: string; // Opcional - pode ser avulso
  data: string;
  tipoCombustivel: TipoCombustivel;
  precoLitro: number;
  litros?: number;
  valorTotal: number;
  kmOdometro?: number;
  posto?: string;
  createdAt: string;
}

export interface AbastecimentoInput {
  data: string;
  tipoCombustivel: TipoCombustivel;
  precoLitro: number;
  litros?: number;
  valorTotal: number;
  kmOdometro?: number;
  posto?: string;
  rotaId?: string;
}

// ============================================
// PEDÁGIOS
// ============================================

export interface Pedagio {
  id: string;
  motoristaId: string;
  rotaId?: string;
  data: string;
  valor: number;
  rodovia?: string;
  praca?: string;
  createdAt: string;
}

export interface PedagioInput {
  data: string;
  valor: number;
  rodovia?: string;
  praca?: string;
  rotaId?: string;
}

// ============================================
// MANUTENÇÃO
// ============================================

export interface Manutencao {
  id: string;
  motoristaId: string;
  data: string;
  parteVeiculo: ParteVeiculo;
  descricao: string;
  status: StatusManutencao;
  previsaoCusto?: number;
  custoReal?: number;
  dataResolucao?: string;
  createdAt: string;
}

export interface ManutencaoInput {
  parteVeiculo: ParteVeiculo;
  descricao: string;
  status: StatusManutencao;
  previsaoCusto?: number;
}

// ============================================
// AGENDAMENTO DE MANUTENÇÃO
// ============================================

import type { StatusAgendamento } from '@/constants';

export interface AgendamentoManutencao {
  id: string;
  motoristaId: string;
  parteVeiculo: ParteVeiculo;
  descricao: string;
  status: StatusAgendamento;
  dataAgendada: string; // Data prevista para manutenção
  dataRealizacao?: string; // Data que foi realizada
  custoEstimado?: number;
  custoReal?: number;
  local?: string; // Oficina/Local
  observacoes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AgendamentoInput {
  parteVeiculo: ParteVeiculo;
  descricao: string;
  dataAgendada: string;
  custoEstimado?: number;
  local?: string;
  observacoes?: string;
}

// ============================================
// RESUMOS / RELATÓRIOS
// ============================================

export interface ResumoDia {
  data: string;
  rotas: Rota[];
  totalFrete: number;
  totalKm: number;
  // [NOVO] Campos de paradas
  totalParadas?: number;
  totalAdicionalParadas?: number;
  abastecimentos: Abastecimento[];
  totalCombustivel: number;
  pedagios: Pedagio[];
  totalPedagio: number;
  liquido: number;
}

export interface ResumoSemana {
  inicio: string; // Sexta
  fim: string;    // Quinta
  dias: ResumoDia[];
  totalBruto: number;
  // [NOVO] Campos de paradas
  totalParadas?: number;
  totalAdicionalParadas?: number;
  totalCombustivel: number;
  totalPedagio: number;
  totalManutencao: number;
  totalLiquido: number;
  diasTrabalhados: number;
  kmTotal: number;
}

export interface ResumoMes {
  mes: number;
  ano: number;
  semanas: ResumoSemana[];
  totalBruto: number;
  totalCombustivel: number;
  totalPedagio: number;
  totalManutencao: number;
  totalLiquido: number;
  diasTrabalhados: number;
  kmTotal: number;
  mediaDiaria: number;
}

// ============================================
// PRÉVIA DE ROTA
// ============================================

export interface PreviaRota {
  origem: string;
  destino: string;
  distanciaKm: number;
  duracaoMinutos: number;
  estimativas: {
    segSabAM: number;
    segSabPM: number;
    domFerAM: number;
    domFerPM: number;
  };
}

// ============================================
// AUTENTICAÇÃO
// ============================================

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: Motorista | null;
  accessToken: string | null;
  refreshToken: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role?: string;
    metadata?: Motorista['data'];
    emailVerified: boolean;
    status: string;
    createdAt: string;
    updatedAt?: string;
  };
}

// ============================================
// API RESPONSES
// ============================================

export interface ApiResponse<T> {
  data: T;
  total?: number;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}
