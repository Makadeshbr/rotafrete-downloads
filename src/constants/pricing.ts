// src/constants/pricing.ts
// ============================================
// ROTAFRETE - Tabela de Preços da Transportadora
// ============================================
// Valores extraídos da tabela oficial fornecida
// Última atualização: Dezembro 2024
//
// [NOVO] Adicionado sistema de cálculo de adicional por paradas
// ============================================

export type TipoVeiculo = 'PASSEIO' | 'UTILITARIO' | 'VAN' | 'VUC';
export type FaixaKm = '0-100' | '101-150' | '151-200' | '201-300' | 'EXCEDENTE';
export type Turno = 'AM' | 'PM';
export type TipoDia = 'SEMANA' | 'SABADO' | 'DOMINGO' | 'FERIADO';

// Interface para um item da tabela de preços
export interface PrecoItem {
  tipoVeiculo: TipoVeiculo;
  faixaKm: FaixaKm;
  kmInicial: number;
  kmFinal: number | null; // null = sem limite (excedente)
  segSabAM: number;
  segSabPM: number;
  domFerAM: number;
  domFerPM: number;
}

// ============================================
// TABELA DE ADICIONAL POR PARADAS
// ============================================
// Regra de negócio:
// - 0 a 60 paradas: R$0,35 por parada (máximo R$21,00)
// - 61 a 90 paradas: R$2,00 por parada adicional
// - Acima de 91 paradas: R$1,04 por parada adicional
// ============================================

export interface AdicionalParadasConfig {
  faixa: string;
  inicioFaixa: number;
  fimFaixa: number | null; // null = sem limite
  valorPorParada: number;
  valorMaximoFaixa: number | null; // null = sem limite
}

export const TABELA_ADICIONAL_PARADAS: AdicionalParadasConfig[] = [
  {
    faixa: '0-60',
    inicioFaixa: 0,
    fimFaixa: 60,
    valorPorParada: 0.35,
    valorMaximoFaixa: 21.00, // 60 * 0.35 = 21.00
  },
  {
    faixa: '61-90',
    inicioFaixa: 61,
    fimFaixa: 90,
    valorPorParada: 2.00,
    valorMaximoFaixa: null, // 30 * 2.00 = 60.00 (sem limite explicito)
  },
  {
    faixa: '91+',
    inicioFaixa: 91,
    fimFaixa: null,
    valorPorParada: 1.04,
    valorMaximoFaixa: null,
  },
];

// ============================================
// TABELA COMPLETA DE PREÇOS
// ============================================
export const TABELA_PRECOS: PrecoItem[] = [
  // PASSEIO
  { tipoVeiculo: 'PASSEIO', faixaKm: '0-100', kmInicial: 0, kmFinal: 100, segSabAM: 206.84, segSabPM: 163.24, domFerAM: 248.21, domFerPM: 195.88 },
  { tipoVeiculo: 'PASSEIO', faixaKm: '101-150', kmInicial: 101, kmFinal: 150, segSabAM: 241.58, segSabPM: 190.62, domFerAM: 289.89, domFerPM: 228.74 },
  { tipoVeiculo: 'PASSEIO', faixaKm: '151-200', kmInicial: 151, kmFinal: 200, segSabAM: 270.35, segSabPM: 213.51, domFerAM: 324.41, domFerPM: 256.21 },
  { tipoVeiculo: 'PASSEIO', faixaKm: '201-300', kmInicial: 201, kmFinal: 300, segSabAM: 304.26, segSabPM: 240.15, domFerAM: 365.11, domFerPM: 288.18 },
  { tipoVeiculo: 'PASSEIO', faixaKm: 'EXCEDENTE', kmInicial: 301, kmFinal: null, segSabAM: 338.99, segSabPM: 267.43, domFerAM: 406.79, domFerPM: 320.91 },

  // UTILITÁRIO
  { tipoVeiculo: 'UTILITARIO', faixaKm: '0-100', kmInicial: 0, kmFinal: 100, segSabAM: 262.73, segSabPM: 207.10, domFerAM: 315.27, domFerPM: 248.52 },
  { tipoVeiculo: 'UTILITARIO', faixaKm: '101-150', kmInicial: 101, kmFinal: 150, segSabAM: 300.94, segSabPM: 236.94, domFerAM: 361.12, domFerPM: 284.33 },
  { tipoVeiculo: 'UTILITARIO', faixaKm: '151-200', kmInicial: 151, kmFinal: 200, segSabAM: 343.29, segSabPM: 270.64, domFerAM: 411.95, domFerPM: 324.76 },
  { tipoVeiculo: 'UTILITARIO', faixaKm: '201-300', kmInicial: 201, kmFinal: 300, segSabAM: 381.39, segSabPM: 300.48, domFerAM: 457.67, domFerPM: 360.57 },
  { tipoVeiculo: 'UTILITARIO', faixaKm: 'EXCEDENTE', kmInicial: 301, kmFinal: null, segSabAM: 423.85, segSabPM: 334.18, domFerAM: 508.62, domFerPM: 401.01 },

  // VAN
  { tipoVeiculo: 'VAN', faixaKm: '0-100', kmInicial: 0, kmFinal: 100, segSabAM: 328.53, segSabPM: 240.52, domFerAM: 394.24, domFerPM: 288.62 },
  { tipoVeiculo: 'VAN', faixaKm: '101-150', kmInicial: 101, kmFinal: 150, segSabAM: 377.85, segSabPM: 277.22, domFerAM: 453.42, domFerPM: 332.67 },
  { tipoVeiculo: 'VAN', faixaKm: '151-200', kmInicial: 151, kmFinal: 200, segSabAM: 427.18, segSabPM: 313.19, domFerAM: 512.62, domFerPM: 375.83 },
  { tipoVeiculo: 'VAN', faixaKm: '201-300', kmInicial: 201, kmFinal: 300, segSabAM: 477.39, segSabPM: 349.90, domFerAM: 572.87, domFerPM: 419.87 },
  { tipoVeiculo: 'VAN', faixaKm: 'EXCEDENTE', kmInicial: 301, kmFinal: null, segSabAM: 526.71, segSabPM: 385.86, domFerAM: 632.05, domFerPM: 463.03 },

  // VUC
  { tipoVeiculo: 'VUC', faixaKm: '0-100', kmInicial: 0, kmFinal: 100, segSabAM: 502.05, segSabPM: 367.88, domFerAM: 602.46, domFerPM: 441.45 },
  { tipoVeiculo: 'VUC', faixaKm: '101-150', kmInicial: 101, kmFinal: 150, segSabAM: 543.44, segSabPM: 398.12, domFerAM: 652.13, domFerPM: 477.75 },
  { tipoVeiculo: 'VUC', faixaKm: '151-200', kmInicial: 151, kmFinal: 200, segSabAM: 594.53, segSabPM: 436.03, domFerAM: 713.44, domFerPM: 523.24 },
  { tipoVeiculo: 'VUC', faixaKm: '201-300', kmInicial: 201, kmFinal: 300, segSabAM: 612.14, segSabPM: 448.94, domFerAM: 734.57, domFerPM: 538.73 },
  { tipoVeiculo: 'VUC', faixaKm: 'EXCEDENTE', kmInicial: 301, kmFinal: null, segSabAM: 658.82, segSabPM: 482.97, domFerAM: 790.59, domFerPM: 579.57 },
];

// ============================================
// CONFIGURAÇÃO DE VEÍCULOS
// ============================================
export interface VeiculoConfig {
  id: TipoVeiculo;
  nome: string;
  descricao: string;
  icone: string; // Nome do ícone Lucide
  cor: string;   // Cor Tailwind
  // [NOVO] Configuração visual para diagrama de manutenção
  temRodadoDuploTraseiro: boolean; // VAN e VUC têm rodado duplo
  formato: 'sedan' | 'utilitario' | 'van' | 'caminhao';
  // [LOTTIE] Arquivo de animação para o tipo de veículo
  lottieFile: string;
}

export const VEICULOS: VeiculoConfig[] = [
  {
    id: 'PASSEIO',
    nome: 'Passeio',
    descricao: 'Carros de passeio (Sedan, Hatch)',
    icone: 'Car',
    cor: '#3B82F6', // Azul
    temRodadoDuploTraseiro: false,
    formato: 'sedan',
    lottieFile: 'Passeio',
  },
  {
    id: 'UTILITARIO',
    nome: 'Utilitário',
    descricao: 'Fiorino, Kangoo, Partner',
    icone: 'Truck',
    cor: '#22C55E', // Verde
    temRodadoDuploTraseiro: false,
    formato: 'utilitario',
    lottieFile: 'Utilitario',
  },
  {
    id: 'VAN',
    nome: 'Van',
    descricao: 'Sprinter, Master, Daily',
    icone: 'Bus',
    cor: '#A855F7', // Roxo
    temRodadoDuploTraseiro: true,
    formato: 'van',
    lottieFile: 'Van',
  },
  {
    id: 'VUC',
    nome: 'VUC',
    descricao: 'Veículo Urbano de Carga',
    icone: 'Container',
    cor: '#F59E0B', // Amarelo
    temRodadoDuploTraseiro: true,
    formato: 'caminhao',
    lottieFile: 'VUC',
  },
];

// ============================================
// FERIADOS NACIONAIS + SP 2024/2025
// ============================================
export const FERIADOS: string[] = [
  // 2024
  '2024-01-01', // Confraternização Universal
  '2024-02-12', // Carnaval
  '2024-02-13', // Carnaval
  '2024-03-29', // Sexta-feira Santa
  '2024-04-21', // Tiradentes
  '2024-05-01', // Dia do Trabalho
  '2024-05-30', // Corpus Christi
  '2024-09-07', // Independência
  '2024-10-12', // Nossa Senhora Aparecida
  '2024-11-02', // Finados
  '2024-11-15', // Proclamação da República
  '2024-11-20', // Consciência Negra (SP)
  '2024-12-25', // Natal
  // 2025
  '2025-01-01', // Confraternização Universal
  '2025-03-03', // Carnaval
  '2025-03-04', // Carnaval
  '2025-04-18', // Sexta-feira Santa
  '2025-04-21', // Tiradentes
  '2025-05-01', // Dia do Trabalho
  '2025-06-19', // Corpus Christi
  '2025-09-07', // Independência
  '2025-10-12', // Nossa Senhora Aparecida
  '2025-11-02', // Finados
  '2025-11-15', // Proclamação da República
  '2025-11-20', // Consciência Negra (SP)
  '2025-12-25', // Natal
];

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

/**
 * Determina a faixa de KM baseado nos quilômetros rodados
 * REGRA: O valor só muda se BATER exatamente a faixa
 * Ex: 138km = faixa 101-150, 149km = faixa 101-150, 150km = faixa 151-200
 */
export function determinarFaixaKm(km: number): FaixaKm {
  if (km <= 100) return '0-100';
  if (km <= 150) return '101-150';
  if (km <= 200) return '151-200';
  if (km <= 300) return '201-300';
  return 'EXCEDENTE';
}

/**
 * Determina o tipo do dia (semana, sábado, domingo ou feriado)
 */
export function determinarTipoDia(data: Date): TipoDia {
  // [FIX] Usa data local para comparação de string, não UTC
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  const dataStr = `${ano}-${mes}-${dia}`;

  // Verifica se é feriado primeiro
  if (FERIADOS.includes(dataStr)) {
    return 'FERIADO';
  }

  const diaSemana = data.getDay();

  if (diaSemana === 0) return 'DOMINGO';
  if (diaSemana === 6) return 'SABADO';
  return 'SEMANA';
}

/**
 * Calcula o valor do frete baseado nos parâmetros (apenas KM, sem paradas)
 */
export function calcularFrete(
  kmRodados: number,
  tipoVeiculo: TipoVeiculo,
  turno: Turno,
  data: Date
): { valor: number; faixaKm: FaixaKm; tipoDia: TipoDia } {
  const faixaKm = determinarFaixaKm(kmRodados);
  const tipoDia = determinarTipoDia(data);

  // Busca o item na tabela
  const item = TABELA_PRECOS.find(
    p => p.tipoVeiculo === tipoVeiculo && p.faixaKm === faixaKm
  );

  if (!item) {
    throw new Error(`Preço não encontrado para ${tipoVeiculo} / ${faixaKm}`);
  }

  // Seleciona o valor correto baseado no tipo de dia e turno
  let valor: number;

  if (tipoDia === 'DOMINGO' || tipoDia === 'FERIADO') {
    valor = turno === 'AM' ? item.domFerAM : item.domFerPM;
  } else {
    // Semana ou Sábado usam a mesma coluna
    valor = turno === 'AM' ? item.segSabAM : item.segSabPM;
  }

  return { valor, faixaKm, tipoDia };
}

/**
 * [NOVO] Calcula o adicional por paradas
 * 
 * Regra de negócio:
 * - 0 a 60 paradas: R$0,35 por parada
 * - 61 a 90 paradas: R$2,00 por parada adicional (além das 60)
 * - Acima de 91 paradas: R$1,04 por parada adicional (além das 90)
 * 
 * Exemplo com 100 paradas:
 * - Faixa 1 (0-60): 60 × R$0,35 = R$21,00
 * - Faixa 2 (61-90): 30 × R$2,00 = R$60,00
 * - Faixa 3 (91+): 10 × R$1,04 = R$10,40
 * - TOTAL: R$91,40
 */
export function calcularAdicionalParadas(quantidadeParadas: number): {
  valor: number;
  detalhamento: {
    faixa: string;
    quantidade: number;
    valorPorParada: number;
    subtotal: number;
  }[];
} {
  // Validação de entrada
  if (quantidadeParadas < 0) {
    throw new Error('Quantidade de paradas não pode ser negativa');
  }

  if (quantidadeParadas === 0) {
    return { valor: 0, detalhamento: [] };
  }

  const detalhamento: {
    faixa: string;
    quantidade: number;
    valorPorParada: number;
    subtotal: number;
  }[] = [];

  let valorTotal = 0;
  let paradasRestantes = quantidadeParadas;

  // Faixa 1: 0-60 paradas (R$0,35 cada)
  if (paradasRestantes > 0) {
    const paradasFaixa1 = Math.min(paradasRestantes, 60);
    const subtotal1 = paradasFaixa1 * 0.35;

    detalhamento.push({
      faixa: '0-60',
      quantidade: paradasFaixa1,
      valorPorParada: 0.35,
      subtotal: subtotal1,
    });

    valorTotal += subtotal1;
    paradasRestantes -= paradasFaixa1;
  }

  // Faixa 2: 61-90 paradas (R$2,00 cada)
  if (paradasRestantes > 0) {
    const paradasFaixa2 = Math.min(paradasRestantes, 30); // 90 - 60 = 30
    const subtotal2 = paradasFaixa2 * 2.00;

    detalhamento.push({
      faixa: '61-90',
      quantidade: paradasFaixa2,
      valorPorParada: 2.00,
      subtotal: subtotal2,
    });

    valorTotal += subtotal2;
    paradasRestantes -= paradasFaixa2;
  }

  // Faixa 3: 91+ paradas (R$1,04 cada)
  if (paradasRestantes > 0) {
    const subtotal3 = paradasRestantes * 1.04;

    detalhamento.push({
      faixa: '91+',
      quantidade: paradasRestantes,
      valorPorParada: 1.04,
      subtotal: subtotal3,
    });

    valorTotal += subtotal3;
  }

  // Arredonda para 2 casas decimais
  valorTotal = Math.round(valorTotal * 100) / 100;

  return { valor: valorTotal, detalhamento };
}

/**
 * [NOVO] Calcula o frete completo (KM + Paradas)
 * 
 * Esta função combina o cálculo de frete por KM com o adicional por paradas
 * para retornar o valor total que o motorista vai receber.
 */
export function calcularFreteCompleto(
  kmRodados: number,
  tipoVeiculo: TipoVeiculo,
  turno: Turno,
  data: Date,
  quantidadeParadas: number = 0
): {
  valorKm: number;
  valorParadas: number;
  valorTotal: number;
  faixaKm: FaixaKm;
  tipoDia: TipoDia;
  detalhamentoParadas: {
    faixa: string;
    quantidade: number;
    valorPorParada: number;
    subtotal: number;
  }[];
} {
  // Calcula valor por KM
  const { valor: valorKm, faixaKm, tipoDia } = calcularFrete(
    kmRodados,
    tipoVeiculo,
    turno,
    data
  );

  // Calcula adicional por paradas
  const { valor: valorParadas, detalhamento: detalhamentoParadas } =
    calcularAdicionalParadas(quantidadeParadas);

  // Valor total
  const valorTotal = Math.round((valorKm + valorParadas) * 100) / 100;

  return {
    valorKm,
    valorParadas,
    valorTotal,
    faixaKm,
    tipoDia,
    detalhamentoParadas,
  };
}

/**
 * Formata valor em Real brasileiro
 */
export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Retorna a cor do veículo para UI
 */
export function getCorVeiculo(tipo: TipoVeiculo): string {
  const veiculo = VEICULOS.find(v => v.id === tipo);
  return veiculo?.cor || '#64748B';
}

/**
 * [NOVO] Retorna configuração completa do veículo
 */
export function getVeiculoConfig(tipo: TipoVeiculo): VeiculoConfig | undefined {
  return VEICULOS.find(v => v.id === tipo);
}