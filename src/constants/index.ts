// src/constants/index.ts
export * from './pricing';

// ============================================
// CONSTANTES GLOBAIS DO APP
// ============================================

// Cidade base das operações
export const CIDADE_BASE = {
  nome: 'Avaré',
  estado: 'SP',
  coordenadas: {
    lat: -23.0986,
    lng: -48.9256,
  },
};

// Configuração do fechamento semanal
// Semana de trabalho: Sexta a Quinta (pagamento toda quinta)
export const FECHAMENTO_SEMANAL = {
  diaPagamento: 4, // Quinta-feira (0 = Domingo)
  inicioSemana: 5, // Sexta-feira
};

// Tipos de combustível
export const COMBUSTIVEIS = [
  { id: 'GASOLINA', nome: 'Gasolina', icone: 'Fuel' },
  { id: 'ETANOL', nome: 'Etanol', icone: 'Leaf' },
  { id: 'DIESEL', nome: 'Diesel', icone: 'Droplet' },
] as const;

export type TipoCombustivel = typeof COMBUSTIVEIS[number]['id'];

// Partes do veículo para manutenção
export const PARTES_VEICULO = [
  { id: 'MOTOR', nome: 'Motor', posicao: { x: 50, y: 20 } },
  { id: 'OLEO', nome: 'Óleo', posicao: { x: 50, y: 25 } },
  { id: 'FILTROS', nome: 'Filtros', posicao: { x: 45, y: 22 } },
  { id: 'BATERIA', nome: 'Bateria', posicao: { x: 35, y: 25 } },
  { id: 'CORREIA', nome: 'Correia', posicao: { x: 55, y: 22 } },
  { id: 'FREIOS', nome: 'Freios', posicao: { x: 50, y: 45 } },
  { id: 'PNEU_DIANTEIRO_E', nome: 'Pneu Diant. E', posicao: { x: 25, y: 35 } },
  { id: 'PNEU_DIANTEIRO_D', nome: 'Pneu Diant. D', posicao: { x: 75, y: 35 } },
  { id: 'PNEU_TRASEIRO_E', nome: 'Pneu Tras. E', posicao: { x: 25, y: 70 } },
  { id: 'PNEU_TRASEIRO_D', nome: 'Pneu Tras. D', posicao: { x: 75, y: 70 } },
  { id: 'SUSPENSAO', nome: 'Suspensão', posicao: { x: 50, y: 55 } },
  { id: 'EMBREAGEM', nome: 'Embreagem', posicao: { x: 50, y: 60 } },
  { id: 'FAROL', nome: 'Faróis', posicao: { x: 50, y: 10 } },
  { id: 'LANTERNA', nome: 'Lanternas', posicao: { x: 50, y: 85 } },
] as const;

export type ParteVeiculo = typeof PARTES_VEICULO[number]['id'];

// Status de manutenção (condição do veículo)
export const STATUS_MANUTENCAO = {
  OK: { cor: '#22C55E', label: 'OK', descricao: 'Funcionando bem' },
  ATENCAO: { cor: '#F59E0B', label: 'Atenção', descricao: 'Trocar em breve' },
  URGENTE: { cor: '#EF4444', label: 'Urgente', descricao: 'Trocar imediatamente' },
} as const;

export type StatusManutencao = keyof typeof STATUS_MANUTENCAO;

// Status de agendamento de manutenção
export const STATUS_AGENDAMENTO = {
  AGENDADA: { cor: '#3B82F6', label: 'Agendada', descricao: 'Manutenção agendada', icone: 'Calendar' },
  EM_ANDAMENTO: { cor: '#F59E0B', label: 'Em Andamento', descricao: 'Sendo realizada', icone: 'Wrench' },
  CONCLUIDA: { cor: '#22C55E', label: 'Concluída', descricao: 'Finalizada', icone: 'CheckCircle' },
  CANCELADA: { cor: '#64748B', label: 'Cancelada', descricao: 'Cancelada', icone: 'XCircle' },
} as const;

export type StatusAgendamento = keyof typeof STATUS_AGENDAMENTO;

