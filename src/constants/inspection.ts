// src/constants/inspection.ts
// ============================================
// ROTAFRETE - Constantes do Sistema de Inspeção
// ============================================
// Define os itens do checklist, categorias, cores
// e configurações padrão para inspeções veiculares.
// ============================================
// Baseado no checklist padrão de transportadoras
// conforme normas do CONTRAN e boas práticas.
// ============================================

import type {
  ItemInspecaoConfig,
  CategoriaConfig,
  CategoriaInspecao,
  StatusAvaliacao,
  StatusAvaliacaoConfig,
  ItemInspecaoId,
  DiaSemana,
} from '@/types/inspection';

// ============================================
// CONFIGURAÇÃO DE CATEGORIAS
// ============================================

/**
 * Configuração das categorias de inspeção.
 * Define nome, ícone e cor tema de cada categoria.
 */
export const CATEGORIAS_INSPECAO: Record<CategoriaInspecao, CategoriaConfig> = {
  PNEUS: {
    id: 'PNEUS',
    nome: 'Pneus e Rodas',
    descricao: 'Estado dos pneus, estepe, macaco e chave de roda',
    icone: 'circle',
    cor: '#3B82F6', // Azul
    ordem: 1,
  },
  FREIOS: {
    id: 'FREIOS',
    nome: 'Sistema de Freios',
    descricao: 'Pastilhas, lonas, fluido e freio de mão',
    icone: 'disc',
    cor: '#EF4444', // Vermelho
    ordem: 2,
  },
  ILUMINACAO: {
    id: 'ILUMINACAO',
    nome: 'Iluminação',
    descricao: 'Faróis, lanternas, setas e luzes de sinalização',
    icone: 'lightbulb',
    cor: '#F59E0B', // Âmbar
    ordem: 3,
  },
  VISIBILIDADE: {
    id: 'VISIBILIDADE',
    nome: 'Visibilidade',
    descricao: 'Parabrisa, retrovisores e limpadores',
    icone: 'eye',
    cor: '#06B6D4', // Ciano
    ordem: 4,
  },
  SEGURANCA: {
    id: 'SEGURANCA',
    nome: 'Segurança',
    descricao: 'Cintos, extintor, triângulo, buzina e travas',
    icone: 'shield-check',
    cor: '#22C55E', // Verde
    ordem: 5,
  },
  FLUIDOS: {
    id: 'FLUIDOS',
    nome: 'Fluidos e Motor',
    descricao: 'Óleo, água, fluido de direção, bateria e correias',
    icone: 'droplet',
    cor: '#8B5CF6', // Roxo
    ordem: 6,
  },
  DOCUMENTACAO: {
    id: 'DOCUMENTACAO',
    nome: 'Documentação e Outros',
    descricao: 'CRLV, limpeza geral e compartimento de carga',
    icone: 'file-text',
    cor: '#64748B', // Cinza
    ordem: 7,
  },
};

/**
 * Lista ordenada de categorias para iteração.
 */
export const CATEGORIAS_ORDENADAS: CategoriaConfig[] = Object.values(CATEGORIAS_INSPECAO)
  .sort((a, b) => a.ordem - b.ordem);

// ============================================
// CHECKLIST DE ITENS (38 ITENS)
// ============================================

/**
 * Checklist completo de inspeção veicular.
 * Baseado nas normas do CONTRAN e práticas de transportadoras.
 * 
 * Total: 38 itens divididos em 7 categorias.
 */
export const ITENS_INSPECAO: ItemInspecaoConfig[] = [
  // ─────────────────────────────────────────
  // PNEUS E RODAS (6 itens)
  // ─────────────────────────────────────────
  {
    id: 'PNEU_DIANTEIRO_ESQ',
    nome: 'Pneu Dianteiro Esquerdo',
    descricao: 'Fotografe o pneu de frente, mostrando a banda de rodagem e estado geral da borracha.',
    categoria: 'PNEUS',
    icone: 'circle',
    obrigatorio: true,
    ordem: 1,
  },
  {
    id: 'PNEU_DIANTEIRO_DIR',
    nome: 'Pneu Dianteiro Direito',
    descricao: 'Fotografe o pneu de frente, mostrando a banda de rodagem e estado geral da borracha.',
    categoria: 'PNEUS',
    icone: 'circle',
    obrigatorio: true,
    ordem: 2,
  },
  {
    id: 'PNEU_TRASEIRO_ESQ',
    nome: 'Pneu Traseiro Esquerdo',
    descricao: 'Fotografe o pneu de frente, mostrando a banda de rodagem e estado geral da borracha.',
    categoria: 'PNEUS',
    icone: 'circle',
    obrigatorio: true,
    ordem: 3,
  },
  {
    id: 'PNEU_TRASEIRO_DIR',
    nome: 'Pneu Traseiro Direito',
    descricao: 'Fotografe o pneu de frente, mostrando a banda de rodagem e estado geral da borracha.',
    categoria: 'PNEUS',
    icone: 'circle',
    obrigatorio: true,
    ordem: 4,
  },
  {
    id: 'ESTEPE',
    nome: 'Estepe',
    descricao: 'Fotografe o estepe mostrando o estado e calibragem. Se não tiver estepe, fotografe o kit de reparo.',
    categoria: 'PNEUS',
    icone: 'circle-dashed',
    obrigatorio: true,
    ordem: 5,
  },
  {
    id: 'MACACO_CHAVE',
    nome: 'Macaco e Chave de Roda',
    descricao: 'Fotografe o macaco e a chave de roda, mostrando que estão presentes e em bom estado.',
    categoria: 'PNEUS',
    icone: 'wrench',
    obrigatorio: true,
    ordem: 6,
  },

  // ─────────────────────────────────────────
  // SISTEMA DE FREIOS (4 itens)
  // ─────────────────────────────────────────
  {
    id: 'FREIO_DIANTEIRO',
    nome: 'Freio Dianteiro',
    descricao: 'Fotografe a roda dianteira com ângulo que mostre o disco/tambor de freio. Se possível, mostre as pastilhas.',
    categoria: 'FREIOS',
    icone: 'disc',
    obrigatorio: true,
    ordem: 1,
  },
  {
    id: 'FREIO_TRASEIRO',
    nome: 'Freio Traseiro',
    descricao: 'Fotografe a roda traseira com ângulo que mostre o disco/tambor de freio.',
    categoria: 'FREIOS',
    icone: 'disc',
    obrigatorio: true,
    ordem: 2,
  },
  {
    id: 'FREIO_MAO',
    nome: 'Freio de Mão',
    descricao: 'Fotografe o freio de mão/estacionamento mostrando que está funcionando (puxado e travando).',
    categoria: 'FREIOS',
    icone: 'grip-vertical',
    obrigatorio: true,
    ordem: 3,
  },
  {
    id: 'FLUIDO_FREIO',
    nome: 'Nível Fluido de Freio',
    descricao: 'Fotografe o reservatório do fluido de freio no motor, mostrando o nível.',
    categoria: 'FREIOS',
    icone: 'flask-conical',
    obrigatorio: true,
    ordem: 4,
  },

  // ─────────────────────────────────────────
  // ILUMINAÇÃO E SINALIZAÇÃO (8 itens)
  // ─────────────────────────────────────────
  {
    id: 'FAROL_BAIXO_ESQ',
    nome: 'Farol Baixo Esquerdo',
    descricao: 'Fotografe o farol esquerdo aceso (luz baixa). Pode fazer à noite ou em local escuro.',
    categoria: 'ILUMINACAO',
    icone: 'lightbulb',
    obrigatorio: true,
    ordem: 1,
  },
  {
    id: 'FAROL_BAIXO_DIR',
    nome: 'Farol Baixo Direito',
    descricao: 'Fotografe o farol direito aceso (luz baixa). Pode fazer à noite ou em local escuro.',
    categoria: 'ILUMINACAO',
    icone: 'lightbulb',
    obrigatorio: true,
    ordem: 2,
  },
  {
    id: 'FAROL_ALTO',
    nome: 'Farol Alto',
    descricao: 'Fotografe os faróis com luz alta acesa, mostrando que ambos funcionam.',
    categoria: 'ILUMINACAO',
    icone: 'sun',
    obrigatorio: true,
    ordem: 3,
  },
  {
    id: 'LANTERNA_TRAS_ESQ',
    nome: 'Lanterna Traseira Esquerda',
    descricao: 'Fotografe a lanterna traseira esquerda acesa.',
    categoria: 'ILUMINACAO',
    icone: 'lamp',
    obrigatorio: true,
    ordem: 4,
  },
  {
    id: 'LANTERNA_TRAS_DIR',
    nome: 'Lanterna Traseira Direita',
    descricao: 'Fotografe a lanterna traseira direita acesa.',
    categoria: 'ILUMINACAO',
    icone: 'lamp',
    obrigatorio: true,
    ordem: 5,
  },
  {
    id: 'LUZ_FREIO',
    nome: 'Luz de Freio',
    descricao: 'Fotografe as luzes de freio acesas (peça ajuda ou use um objeto para pressionar o pedal).',
    categoria: 'ILUMINACAO',
    icone: 'octagon',
    obrigatorio: true,
    ordem: 6,
  },
  {
    id: 'SETAS_PISCAS',
    nome: 'Setas e Piscas',
    descricao: 'Fotografe as setas funcionando (dianteiras e traseiras). Pode ser com pisca-alerta ligado.',
    categoria: 'ILUMINACAO',
    icone: 'arrow-left-right',
    obrigatorio: true,
    ordem: 7,
  },
  {
    id: 'LUZ_RE',
    nome: 'Luz de Ré',
    descricao: 'Fotografe a luz de ré funcionando (com marcha ré engrenada).',
    categoria: 'ILUMINACAO',
    icone: 'circle-dot',
    obrigatorio: true,
    ordem: 8,
  },

  // ─────────────────────────────────────────
  // VISIBILIDADE (5 itens)
  // ─────────────────────────────────────────
  {
    id: 'PARABRISA',
    nome: 'Parabrisa',
    descricao: 'Fotografe o parabrisa de dentro do veículo, mostrando se há trincas, rachaduras ou sujeira que atrapalhe a visão.',
    categoria: 'VISIBILIDADE',
    icone: 'square',
    obrigatorio: true,
    ordem: 1,
  },
  {
    id: 'RETROVISOR_INTERNO',
    nome: 'Retrovisor Interno',
    descricao: 'Fotografe o retrovisor interno mostrando que está presente e sem trincas.',
    categoria: 'VISIBILIDADE',
    icone: 'flip-horizontal',
    obrigatorio: true,
    ordem: 2,
  },
  {
    id: 'RETROVISOR_ESQ',
    nome: 'Retrovisor Externo Esquerdo',
    descricao: 'Fotografe o retrovisor externo esquerdo mostrando que está presente, fixo e sem trincas.',
    categoria: 'VISIBILIDADE',
    icone: 'flip-horizontal',
    obrigatorio: true,
    ordem: 3,
  },
  {
    id: 'RETROVISOR_DIR',
    nome: 'Retrovisor Externo Direito',
    descricao: 'Fotografe o retrovisor externo direito mostrando que está presente, fixo e sem trincas.',
    categoria: 'VISIBILIDADE',
    icone: 'flip-horizontal',
    obrigatorio: true,
    ordem: 4,
  },
  {
    id: 'LIMPADOR_PARABRISA',
    nome: 'Limpador de Parabrisa',
    descricao: 'Fotografe os limpadores de parabrisa mostrando as palhetas e que estão em bom estado.',
    categoria: 'VISIBILIDADE',
    icone: 'move-horizontal',
    obrigatorio: true,
    ordem: 5,
  },

  // ─────────────────────────────────────────
  // SEGURANÇA (6 itens)
  // ─────────────────────────────────────────
  {
    id: 'CINTO_MOTORISTA',
    nome: 'Cinto do Motorista',
    descricao: 'Fotografe o cinto de segurança do motorista mostrando a fivela e a trava funcionando.',
    categoria: 'SEGURANCA',
    icone: 'shield-check',
    obrigatorio: true,
    ordem: 1,
  },
  {
    id: 'CINTO_PASSAGEIRO',
    nome: 'Cinto do Passageiro',
    descricao: 'Fotografe o cinto de segurança do passageiro mostrando que está presente e funcional.',
    categoria: 'SEGURANCA',
    icone: 'shield-check',
    obrigatorio: true,
    ordem: 2,
  },
  {
    id: 'EXTINTOR',
    nome: 'Extintor de Incêndio',
    descricao: 'Fotografe o extintor mostrando a validade no selo e o indicador de carga (ponteiro no verde).',
    categoria: 'SEGURANCA',
    icone: 'flame',
    obrigatorio: true,
    ordem: 3,
  },
  {
    id: 'TRIANGULO',
    nome: 'Triângulo de Sinalização',
    descricao: 'Fotografe o triângulo de sinalização mostrando que está presente e em bom estado.',
    categoria: 'SEGURANCA',
    icone: 'triangle',
    obrigatorio: true,
    ordem: 4,
  },
  {
    id: 'BUZINA',
    nome: 'Buzina',
    descricao: 'Fotografe o volante e confirme na observação que a buzina está funcionando.',
    categoria: 'SEGURANCA',
    icone: 'volume-2',
    obrigatorio: true,
    ordem: 5,
  },
  {
    id: 'TRAVAS_FECHADURAS',
    nome: 'Travas e Fechaduras',
    descricao: 'Fotografe as portas mostrando que as travas e fechaduras estão funcionando corretamente.',
    categoria: 'SEGURANCA',
    icone: 'lock',
    obrigatorio: true,
    ordem: 6,
  },

  // ─────────────────────────────────────────
  // FLUIDOS E MOTOR (5 itens)
  // ─────────────────────────────────────────
  {
    id: 'OLEO_MOTOR',
    nome: 'Nível de Óleo do Motor',
    descricao: 'Fotografe a vareta de óleo mostrando o nível (entre mín e máx). Faça com motor frio.',
    categoria: 'FLUIDOS',
    icone: 'droplet',
    obrigatorio: true,
    ordem: 1,
  },
  {
    id: 'AGUA_ARREFECIMENTO',
    nome: 'Água/Líquido de Arrefecimento',
    descricao: 'Fotografe o reservatório de água/líquido de arrefecimento mostrando o nível.',
    categoria: 'FLUIDOS',
    icone: 'droplets',
    obrigatorio: true,
    ordem: 2,
  },
  {
    id: 'FLUIDO_DIRECAO',
    nome: 'Fluido de Direção Hidráulica',
    descricao: 'Fotografe o reservatório do fluido de direção mostrando o nível. Se for direção elétrica, pule este item.',
    categoria: 'FLUIDOS',
    icone: 'gauge',
    obrigatorio: false, // Alguns veículos têm direção elétrica
    ordem: 3,
  },
  {
    id: 'BATERIA',
    nome: 'Bateria',
    descricao: 'Fotografe a bateria mostrando os terminais (sem oxidação) e o estado geral.',
    categoria: 'FLUIDOS',
    icone: 'battery',
    obrigatorio: true,
    ordem: 4,
  },
  {
    id: 'CORREIAS',
    nome: 'Correias do Motor',
    descricao: 'Fotografe as correias do motor (alternador, ar-condicionado) mostrando o estado visual (sem rachaduras).',
    categoria: 'FLUIDOS',
    icone: 'rotate-cw',
    obrigatorio: true,
    ordem: 5,
  },

  // ─────────────────────────────────────────
  // DOCUMENTAÇÃO E OUTROS (4 itens)
  // ─────────────────────────────────────────
  {
    id: 'CRLV',
    nome: 'CRLV em Dia',
    descricao: 'Fotografe o CRLV (documento do veículo) mostrando que está válido para o ano atual.',
    categoria: 'DOCUMENTACAO',
    icone: 'file-text',
    obrigatorio: true,
    ordem: 1,
  },
  {
    id: 'TACOGRAFO',
    nome: 'Tacógrafo/Registro',
    descricao: 'Se o veículo possui tacógrafo, fotografe mostrando que está funcionando e com disco/cartão.',
    categoria: 'DOCUMENTACAO',
    icone: 'gauge-circle',
    obrigatorio: false, // Nem todos os veículos têm
    ordem: 2,
    tiposVeiculo: ['VAN', 'VUC'], // Apenas veículos maiores
  },
  {
    id: 'LIMPEZA_VEICULO',
    nome: 'Limpeza Geral do Veículo',
    descricao: 'Fotografe a visão geral do veículo (externa) mostrando o estado de limpeza e conservação.',
    categoria: 'DOCUMENTACAO',
    icone: 'sparkles',
    obrigatorio: true,
    ordem: 3,
  },
  {
    id: 'COMPARTIMENTO_CARGA',
    nome: 'Compartimento de Carga',
    descricao: 'Fotografe o compartimento de carga (porta-malas/baú) mostrando que está limpo e em bom estado.',
    categoria: 'DOCUMENTACAO',
    icone: 'package',
    obrigatorio: true,
    ordem: 4,
  },
];

/**
 * Mapa de itens por ID para acesso rápido.
 */
export const ITENS_INSPECAO_MAP: Record<ItemInspecaoId, ItemInspecaoConfig> = 
  ITENS_INSPECAO.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {} as Record<ItemInspecaoId, ItemInspecaoConfig>);

/**
 * Itens agrupados por categoria.
 */
export const ITENS_POR_CATEGORIA: Record<CategoriaInspecao, ItemInspecaoConfig[]> = 
  ITENS_INSPECAO.reduce((acc, item) => {
    if (!acc[item.categoria]) {
      acc[item.categoria] = [];
    }
    acc[item.categoria].push(item);
    return acc;
  }, {} as Record<CategoriaInspecao, ItemInspecaoConfig[]>);

/**
 * Quantidade de itens por categoria.
 */
export const QUANTIDADE_ITENS_POR_CATEGORIA: Record<CategoriaInspecao, number> = 
  Object.entries(ITENS_POR_CATEGORIA).reduce((acc, [cat, itens]) => {
    acc[cat as CategoriaInspecao] = itens.length;
    return acc;
  }, {} as Record<CategoriaInspecao, number>);

/**
 * Total de itens obrigatórios.
 */
export const TOTAL_ITENS_OBRIGATORIOS = ITENS_INSPECAO.filter(i => i.obrigatorio).length;

/**
 * Total de itens (incluindo opcionais).
 */
export const TOTAL_ITENS = ITENS_INSPECAO.length;

// ============================================
// CONFIGURAÇÃO DE STATUS DE AVALIAÇÃO
// ============================================

/**
 * Configuração visual para cada status de avaliação.
 */
export const STATUS_AVALIACAO_CONFIG: Record<StatusAvaliacao, StatusAvaliacaoConfig> = {
  PENDENTE: {
    bg: '#1E293B',
    bgLight: '#334155',
    border: '#64748B',
    text: '#94A3B8',
    icon: '#64748B',
    label: 'Pendente',
  },
  BOM_ESTADO: {
    bg: '#052E16',
    bgLight: '#14532D',
    border: '#22C55E',
    text: '#4ADE80',
    icon: '#22C55E',
    label: 'Bom Estado',
  },
  ATENCAO: {
    bg: '#422006',
    bgLight: '#713F12',
    border: '#F59E0B',
    text: '#FCD34D',
    icon: '#F59E0B',
    label: 'Atenção',
  },
  CRITICO: {
    bg: '#450A0A',
    bgLight: '#7F1D1D',
    border: '#EF4444',
    text: '#FCA5A5',
    icon: '#EF4444',
    label: 'Crítico',
  },
};

// ============================================
// CONFIGURAÇÕES PADRÃO
// ============================================

/**
 * Configuração padrão global do sistema de inspeções.
 */
export const CONFIG_INSPECAO_PADRAO = {
  // Prazo de envio: Quinta-feira às 18:00
  diaPrazoEnvio: 4 as DiaSemana,  // Quinta
  horaPrazoEnvio: '18:00',

  // Criação de inspeção: Sexta às 00:00 (início da semana)
  diasAntecedenciaCriacao: 6, // Cria na sexta para entregar na quinta

  // Lembretes padrão
  diaLembretePadrao: 2 as DiaSemana, // Terça
  horaLembretePadrao: '08:00',

  // Prazos de manutenção padrão
  prazoAtencaoPadrao: 7,  // 7 dias para itens ATENCAO
  prazoCriticoPadrao: 3,  // 3 dias para itens CRITICO
};

/**
 * Dias da semana para seleção no picker.
 */
export const DIAS_SEMANA: Array<{ valor: DiaSemana; nome: string; abrev: string }> = [
  { valor: 0, nome: 'Domingo', abrev: 'Dom' },
  { valor: 1, nome: 'Segunda-feira', abrev: 'Seg' },
  { valor: 2, nome: 'Terça-feira', abrev: 'Ter' },
  { valor: 3, nome: 'Quarta-feira', abrev: 'Qua' },
  { valor: 4, nome: 'Quinta-feira', abrev: 'Qui' },
  { valor: 5, nome: 'Sexta-feira', abrev: 'Sex' },
  { valor: 6, nome: 'Sábado', abrev: 'Sáb' },
];

/**
 * Opções de horário para seleção (de hora em hora).
 */
export const HORARIOS_DISPONIVEIS: string[] = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
  '20:00', '21:00', '22:00',
];

/**
 * Opções de prazo para manutenção (em dias).
 */
export const OPCOES_PRAZO_MANUTENCAO: Array<{ valor: number; label: string }> = [
  { valor: 1, label: '1 dia (urgente)' },
  { valor: 2, label: '2 dias' },
  { valor: 3, label: '3 dias' },
  { valor: 5, label: '5 dias' },
  { valor: 7, label: '1 semana' },
  { valor: 14, label: '2 semanas' },
  { valor: 30, label: '1 mês' },
];

// ============================================
// HELPERS
// ============================================

/**
 * Retorna a configuração de um item pelo ID.
 * 
 * @param id - ID do item
 * @returns Configuração do item ou undefined
 */
export function getItemConfig(id: ItemInspecaoId): ItemInspecaoConfig | undefined {
  return ITENS_INSPECAO_MAP[id];
}

/**
 * Retorna os itens de uma categoria específica.
 * 
 * @param categoria - Categoria desejada
 * @returns Lista de itens da categoria
 */
export function getItensPorCategoria(categoria: CategoriaInspecao): ItemInspecaoConfig[] {
  return ITENS_POR_CATEGORIA[categoria] || [];
}

/**
 * Retorna a configuração visual de um status de avaliação.
 * 
 * @param status - Status de avaliação
 * @returns Configuração de cores e labels
 */
export function getStatusConfig(status: StatusAvaliacao): StatusAvaliacaoConfig {
  return STATUS_AVALIACAO_CONFIG[status];
}

/**
 * Filtra itens aplicáveis a um tipo de veículo específico.
 * 
 * @param tipoVeiculo - Tipo do veículo
 * @returns Lista de itens aplicáveis
 */
export function getItensParaVeiculo(tipoVeiculo: string): ItemInspecaoConfig[] {
  return ITENS_INSPECAO.filter(item => {
    // Se não tem restrição de tipo, é aplicável a todos
    if (!item.tiposVeiculo || item.tiposVeiculo.length === 0) {
      return true;
    }
    // Se tem restrição, verifica se o tipo está na lista
    return item.tiposVeiculo.includes(tipoVeiculo as any);
  });
}

/**
 * Calcula a semana ISO atual no formato "YYYY-Www".
 * 
 * @param date - Data de referência (default: hoje)
 * @returns String no formato "2026-W02"
 */
export function getSemanaISO(date: Date = new Date()): string {
  // Calcula o número da semana ISO 8601
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  
  return `${d.getUTCFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
}

/**
 * Converte uma semana ISO para data de início (segunda-feira).
 * 
 * @param semanaISO - Semana no formato "YYYY-Www"
 * @returns Data de início da semana
 */
export function semanaISOParaData(semanaISO: string): Date {
  const [ano, semana] = semanaISO.split('-W').map(Number);
  const primeiroJan = new Date(ano, 0, 1);
  const dias = (semana - 1) * 7;
  const diaSemana = primeiroJan.getDay();
  const ajuste = diaSemana <= 4 ? 1 - diaSemana : 8 - diaSemana;
  
  return new Date(ano, 0, 1 + dias + ajuste);
}

/**
 * Formata uma semana ISO para exibição amigável.
 * 
 * @param semanaISO - Semana no formato "YYYY-Www"
 * @returns String formatada (ex: "Semana 02 de 2026")
 */
export function formatarSemanaISO(semanaISO: string): string {
  const [ano, semana] = semanaISO.split('-W');
  return `Semana ${semana} de ${ano}`;
}
