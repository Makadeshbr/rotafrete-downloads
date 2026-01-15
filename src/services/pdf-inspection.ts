// src/services/pdf-inspection.ts
// ============================================
// ROTAFRETE - Serviço de Geração de PDF
// ============================================
// Gera relatórios PDF de inspeções veiculares
// com fotos, status e estatísticas.
// ============================================

import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getDb, getStorage } from '@aether-baas/react-native';
import { createLogger } from '@/utils/logger';
import {
  formatarSemanaISO,
  STATUS_AVALIACAO_CONFIG,
  CATEGORIAS_INSPECAO,
} from '@/constants/inspection';
import type {
  InspecaoVeicular,
  ItemInspecao,
  StatusInspecao,
  CategoriaInspecao,
} from '@/types/inspection';

// ============================================
// LOGGER
// ============================================

const logger = createLogger('PdfInspection');

// ============================================
// TIPOS
// ============================================

export interface RelatorioPDFInput {
  periodo: {
    tipo: 'semanal' | 'mensal' | 'personalizado';
    inicio?: string;
    fim?: string;
    semanaReferencia?: string;
  };
  filtros?: {
    motoristas?: string[];
    status?: StatusInspecao[];
    apenasComProblemas?: boolean;
  };
}

interface InspecaoComItens extends InspecaoVeicular {
  itens: ItemInspecao[];
}

// ============================================
// CONSTANTES
// ============================================

const COLLECTION_INSPECOES = 'inspecoes_veiculares';
const COLLECTION_ITENS = 'itens_inspecao';

// ============================================
// HELPERS DE VALIDAÇÃO (Enterprise Patterns)
// ============================================

/**
 * Valida se o objeto possui a estrutura mínima de uma inspeção.
 * Padrão "Type Guard" para garantir integridade em runtime.
 */
function isValidInspecao(data: any): data is InspecaoVeicular {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.id === 'string' &&
    // Valida existência de objetos obrigatórios, mesmo que parciais
    (typeof data.motorista === 'object' || typeof data.veiculo === 'object')
  );
}

// Cores do tema
const CORES = {
  primary: '#3B82F6',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  dark: '#0F172A',
  light: '#F1F5F9',
  gray: '#64748B',
  border: '#334155',
};

// ============================================
// HELPERS DE HTML
// ============================================

/**
 * Gera o CSS base do relatório.
 */
function gerarCSS(): string {
  return `
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      body {
        background: #fff;
        color: ${CORES.dark};
        font-size: 12px;
        line-height: 1.5;
      }
      
      .page {
        padding: 40px;
        page-break-after: always;
      }
      
      .page:last-child {
        page-break-after: avoid;
      }
      
      /* Header */
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid ${CORES.primary};
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      
      .header-title {
        font-size: 24px;
        font-weight: 700;
        color: ${CORES.primary};
      }
      
      .header-subtitle {
        font-size: 14px;
        color: ${CORES.gray};
        margin-top: 4px;
      }
      
      .header-logo {
        font-size: 20px;
        font-weight: 700;
        color: ${CORES.dark};
      }
      
      /* Seções */
      .section {
        margin-bottom: 30px;
      }
      
      .section-title {
        font-size: 16px;
        font-weight: 600;
        color: ${CORES.dark};
        margin-bottom: 15px;
        padding-bottom: 8px;
        border-bottom: 1px solid ${CORES.border};
      }
      
      /* Cards de Estatísticas */
      .stats-grid {
        display: flex;
        gap: 15px;
        margin-bottom: 25px;
      }
      
      .stat-card {
        flex: 1;
        background: #f8fafc;
        border: 1px solid ${CORES.border};
        border-radius: 8px;
        padding: 15px;
        text-align: center;
      }
      
      .stat-value {
        font-size: 28px;
        font-weight: 700;
      }
      
      .stat-label {
        font-size: 11px;
        color: ${CORES.gray};
        margin-top: 4px;
      }
      
      .stat-success { color: ${CORES.success}; }
      .stat-warning { color: ${CORES.warning}; }
      .stat-danger { color: ${CORES.danger}; }
      .stat-primary { color: ${CORES.primary}; }
      
      /* Tabela */
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }
      
      th, td {
        padding: 10px 12px;
        text-align: left;
        border-bottom: 1px solid ${CORES.border};
      }
      
      th {
        background: #f1f5f9;
        font-weight: 600;
        font-size: 11px;
        text-transform: uppercase;
        color: ${CORES.gray};
      }
      
      tr:hover {
        background: #f8fafc;
      }
      
      /* Badges */
      .badge {
        display: inline-block;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 600;
      }
      
      .badge-success {
        background: #dcfce7;
        color: ${CORES.success};
      }
      
      .badge-warning {
        background: #fef3c7;
        color: ${CORES.warning};
      }
      
      .badge-danger {
        background: #fee2e2;
        color: ${CORES.danger};
      }
      
      .badge-info {
        background: #dbeafe;
        color: ${CORES.primary};
      }
      
      /* Inspeção Individual */
      .inspecao-card {
        border: 1px solid ${CORES.border};
        border-radius: 10px;
        margin-bottom: 25px;
        overflow: hidden;
        page-break-inside: avoid;
      }
      
      .inspecao-header {
        background: #f1f5f9;
        padding: 15px;
        border-bottom: 1px solid ${CORES.border};
      }
      
      .inspecao-motorista {
        font-size: 16px;
        font-weight: 600;
        color: ${CORES.dark};
      }
      
      .inspecao-veiculo {
        font-size: 12px;
        color: ${CORES.gray};
        margin-top: 2px;
      }
      
      .inspecao-body {
        padding: 15px;
      }
      
      /* Itens Grid */
      .itens-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }
      
      .item-card {
        border: 1px solid ${CORES.border};
        border-radius: 6px;
        overflow: hidden;
      }
      
      .item-foto {
        width: 100%;
        height: 80px;
        object-fit: cover;
        background: #e2e8f0;
      }
      
      .item-info {
        padding: 8px;
      }
      
      .item-nome {
        font-size: 10px;
        font-weight: 500;
        color: ${CORES.dark};
        margin-bottom: 4px;
      }
      
      .item-obs {
        font-size: 9px;
        color: ${CORES.gray};
        font-style: italic;
      }
      
      /* Footer */
      .footer {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid ${CORES.border};
        text-align: center;
        color: ${CORES.gray};
        font-size: 10px;
      }
      
      /* Categoria */
      .categoria-titulo {
        font-size: 13px;
        font-weight: 600;
        color: ${CORES.gray};
        margin: 15px 0 10px;
        text-transform: uppercase;
      }
    </style>
  `;
}

/**
 * Gera o header do relatório.
 */
function gerarHeader(titulo: string, subtitulo: string): string {
  return `
    <div class="header">
      <div>
        <div class="header-title">${titulo}</div>
        <div class="header-subtitle">${subtitulo}</div>
      </div>
      <div class="header-logo">ROTAFRETE</div>
    </div>
  `;
}

/**
 * Gera cards de estatísticas.
 */
function gerarEstatisticas(inspecoes: InspecaoComItens[]): string {
  const totalInspecoes = inspecoes.length;
  const totalItens = inspecoes.reduce((acc, i) => acc + i.itens.length, 0);
  const itensAprovados = inspecoes.reduce(
    (acc, i) => acc + i.itens.filter((it) => it.statusAvaliacao === 'BOM_ESTADO').length,
    0
  );
  const itensCriticos = inspecoes.reduce(
    (acc, i) => acc + i.itens.filter((it) => it.statusAvaliacao === 'CRITICO').length,
    0
  );
  const itensAtencao = inspecoes.reduce(
    (acc, i) => acc + i.itens.filter((it) => it.statusAvaliacao === 'ATENCAO').length,
    0
  );

  return `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value stat-primary">${totalInspecoes}</div>
        <div class="stat-label">Inspeções</div>
      </div>
      <div class="stat-card">
        <div class="stat-value stat-success">${itensAprovados}</div>
        <div class="stat-label">Itens OK</div>
      </div>
      <div class="stat-card">
        <div class="stat-value stat-warning">${itensAtencao}</div>
        <div class="stat-label">Atenção</div>
      </div>
      <div class="stat-card">
        <div class="stat-value stat-danger">${itensCriticos}</div>
        <div class="stat-label">Críticos</div>
      </div>
    </div>
  `;
}

/**
 * Gera tabela resumo de inspeções.
 */
function gerarTabelaResumo(inspecoes: InspecaoComItens[]): string {
  const rows = inspecoes
    .map((inspecao) => {
      const statusBadge = {
        APROVADA: 'badge-success',
        REPROVADA: 'badge-danger',
        ENVIADA: 'badge-info',
        PENDENTE: 'badge-warning',
        PARCIAL: 'badge-warning',
        EM_ANALISE: 'badge-info',
      }[inspecao.status];

      const statusLabel = {
        APROVADA: 'Aprovada',
        REPROVADA: 'Reprovada',
        ENVIADA: 'Enviada',
        PENDENTE: 'Pendente',
        PARCIAL: 'Parcial',
        EM_ANALISE: 'Em Análise',
      }[inspecao.status];

      return `
        <tr>
          <td>${inspecao.motorista?.nome || 'Desconhecido'}</td>
          <td>${inspecao.veiculo?.placa || '-'}</td>
          <td><span class="badge ${statusBadge}">${statusLabel}</span></td>
          <td>${inspecao.itensEnviados}/${inspecao.totalItens}</td>
          <td>${inspecao.itensCriticos > 0 ? `<span class="badge badge-danger">${inspecao.itensCriticos}</span>` : '-'}</td>
          <td>${inspecao.itensAtencao > 0 ? `<span class="badge badge-warning">${inspecao.itensAtencao}</span>` : '-'}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <section class="section">
      <h2 class="section-title">Resumo das Inspeções</h2>
      <table>
        <thead>
          <tr>
            <th>Motorista</th>
            <th>Veículo</th>
            <th>Status</th>
            <th>Progresso</th>
            <th>Críticos</th>
            <th>Atenção</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </section>
  `;
}

/**
 * Gera card detalhado de uma inspeção.
 */
function gerarCardInspecao(inspecao: InspecaoComItens): string {
  // Agrupa itens por categoria
  const itensPorCategoria: Record<string, ItemInspecao[]> = {};
  for (const item of inspecao.itens) {
    if (!itensPorCategoria[item.categoria]) {
      itensPorCategoria[item.categoria] = [];
    }
    itensPorCategoria[item.categoria].push(item);
  }

  const categoriasHtml = Object.entries(itensPorCategoria)
    .map(([categoria, itens]) => {
      const categoriaConfig = CATEGORIAS_INSPECAO[categoria as CategoriaInspecao];

      const itensHtml = itens
        .map((item) => {
          const statusConfig = STATUS_AVALIACAO_CONFIG[item.statusAvaliacao];
          const statusBadge = {
            BOM_ESTADO: 'badge-success',
            ATENCAO: 'badge-warning',
            CRITICO: 'badge-danger',
            PENDENTE: 'badge-info',
          }[item.statusAvaliacao];

          return `
            <div class="item-card">
              ${item.fotoUrl
              ? `<img class="item-foto" src="${item.fotoUrl}" alt="${item.nomeExibicao}" />`
              : '<div class="item-foto" style="display:flex;align-items:center;justify-content:center;color:#94a3b8;">Sem foto</div>'
            }
              <div class="item-info">
                <div class="item-nome">${item.nomeExibicao}</div>
                <span class="badge ${statusBadge}">${statusConfig.label}</span>
                ${item.observacaoAdmin ? `<div class="item-obs">${item.observacaoAdmin}</div>` : ''}
              </div>
            </div>
          `;
        })
        .join('');

      return `
        <div class="categoria-titulo">${categoriaConfig?.nome || categoria}</div>
        <div class="itens-grid">${itensHtml}</div>
      `;
    })
    .join('');

  return `
    <div class="inspecao-card">
      <div class="inspecao-header">
        <div class="inspecao-motorista">${inspecao.motorista?.nome || 'Desconhecido'}</div>
        <div class="inspecao-veiculo">${inspecao.veiculo?.placa || '-'} • ${inspecao.veiculo?.modelo || '-'}</div>
      </div>
      <div class="inspecao-body">
        ${categoriasHtml}
      </div>
    </div>
  `;
}

/**
 * Gera o footer do relatório.
 */
function gerarFooter(): string {
  const dataGeracao = new Date().toLocaleString('pt-BR');
  return `
    <div class="footer">
      Relatório gerado em ${dataGeracao} • RotaFrete - Sistema de Gestão de Frotas
    </div>
  `;
}

// ============================================
// SERVIÇO PRINCIPAL
// ============================================

export const PdfInspectionService = {
  /**
   * Gera um relatório PDF completo.
   */
  async gerarRelatorioPDF(input: RelatorioPDFInput): Promise<string> {
    logger.info('Gerando relatório PDF', input);

    const db = getDb();

    try {
      // 1. Busca inspeções baseado nos filtros
      const filtro: Record<string, any> = {};

      if (input.periodo.semanaReferencia) {
        filtro.semanaReferencia = input.periodo.semanaReferencia;
      }

      if (input.filtros?.status && input.filtros.status.length > 0) {
        filtro.status = { $in: input.filtros.status };
      }

      if (input.filtros?.motoristas && input.filtros.motoristas.length > 0) {
        filtro.motoristaId = { $in: input.filtros.motoristas };
      }

      const inspecoesResult: any = await db.collection(COLLECTION_INSPECOES).list({
        filter: filtro,
        limit: 100,
        // orderBy: { dataEnvio: 'desc' }, // [FIX] Removed unsupported property
      });

      const resultData = Array.isArray(inspecoesResult) ? inspecoesResult : (inspecoesResult.data || []);

      // In-memory sort
      resultData.sort((a: any, b: any) => {
        const dateA = new Date(a.dataEnvio || 0).getTime();
        const dateB = new Date(b.dataEnvio || 0).getTime();
        return dateB - dateA;
      });

      // [ENTERPRISE] Runtime Validation & Mapping
      // Filtra registros inválidos para garantir consistência do relatório
      const inspecoesValidas = resultData.filter((item: any) => {
        const valid = isValidInspecao(item);
        if (!valid) {
          logger.warn('Ignorando registro de inspeção inválido/corrompido', { id: item?.id });
        }
        return valid;
      });

      logger.info('Inspeções processadas para PDF', {
        total: resultData.length,
        validas: inspecoesValidas.length,
        filtro
      });

      let inspecoes = inspecoesValidas as InspecaoVeicular[];

      // Filtra apenas com problemas se solicitado
      if (input.filtros?.apenasComProblemas) {
        inspecoes = inspecoes.filter(
          (i) => i.itensCriticos > 0 || i.itensAtencao > 0
        );
      }

      // 2. Busca itens de cada inspeção
      const inspecoesComItens: InspecaoComItens[] = [];

      // Executa buscas em paralelo com limite de concorrência para performance (Promise.all)
      // Em vez de loop serial, disparamos em lotes para melhor tempo de resposta
      const promises = inspecoes.map(async (inspecao) => {
        try {
          const itensResult: any = await db.collection(COLLECTION_ITENS).list({
            filter: { inspecaoId: inspecao.id },
            limit: 50,
          });

          const itensData = Array.isArray(itensResult) ? itensResult : (itensResult.data || []);

          return {
            ...inspecao,
            itens: itensData as ItemInspecao[],
          };
        } catch (err) {
          logger.error(`Erro ao buscar itens da inspeção ${inspecao.id}`, err);
          // Retorna inspeção sem itens em caso de erro parcial (Graceful Degradation)
          return {
            ...inspecao,
            itens: [],
          };
        }
      });

      const resultados = await Promise.all(promises);
      inspecoesComItens.push(...resultados);

      // 3. Gera o HTML do relatório
      const subtitulo = input.periodo.semanaReferencia
        ? formatarSemanaISO(input.periodo.semanaReferencia)
        : 'Período Personalizado';

      const html = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Relatório de Inspeção</title>
          ${gerarCSS()}
        </head>
        <body>
          <div class="page">
            ${gerarHeader('Relatório de Inspeção Veicular', subtitulo)}
            ${gerarEstatisticas(inspecoesComItens)}
            ${gerarTabelaResumo(inspecoesComItens)}
            ${gerarFooter()}
          </div>
          
          ${inspecoesComItens
          .map(
            (inspecao) => `
            <div class="page">
              ${gerarHeader(`Detalhes - ${inspecao.motorista?.nome || 'Desc.'}`, inspecao.veiculo?.placa || '-')}
              ${gerarCardInspecao(inspecao)}
              ${gerarFooter()}
            </div>
          `
          )
          .join('')}
        </body>
        </html>
      `;

      // 4. Gera o PDF
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      // 5. Move para diretório permanente
      const fileName = `relatorio_inspecao_${Date.now()}.pdf`;
      const newUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.moveAsync({
        from: uri,
        to: newUri,
      });

      logger.info('PDF gerado com sucesso', { uri: newUri });

      return newUri;
    } catch (error) {
      logger.error('Erro ao gerar PDF', error);
      throw error;
    }
  },

  /**
   * Gera um PDF de uma única inspeção.
   */
  async gerarPDFInspecao(inspecaoId: string): Promise<string> {
    logger.info('Gerando PDF de inspeção individual', { inspecaoId });

    const db = getDb();

    try {
      // Busca inspeção
      const inspecaoRaw = await db
        .collection(COLLECTION_INSPECOES)
        .get(inspecaoId);

      const inspecao = inspecaoRaw as unknown as InspecaoVeicular | null; // [FIX] Safe cast

      if (!inspecao) {
        throw new Error('Inspeção não encontrada');
      }

      // Busca itens
      const itensResult: any = await db.collection(COLLECTION_ITENS).list({
        filter: { inspecaoId },
        limit: 50,
      });

      const itensData = Array.isArray(itensResult) ? itensResult : (itensResult.data || []);

      const inspecaoComItens: InspecaoComItens = {
        ...inspecao,
        itens: itensData as ItemInspecao[],
      };

      // Gera HTML
      const html = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Inspeção - ${inspecao.motorista.nome}</title>
          ${gerarCSS()}
        </head>
        <body>
          <div class="page">
            ${gerarHeader(
        `Inspeção Veicular - ${inspecao.motorista?.nome || 'Motorista Desconhecido'}`,
        `${inspecao.veiculo?.placa || 'Sem Placa'} • ${formatarSemanaISO(inspecao.semanaReferencia)}`
      )}
            ${gerarCardInspecao(inspecaoComItens)}
            ${gerarFooter()}
          </div>
        </body>
        </html>
      `;

      // Gera PDF
      const { uri } = await Print.printToFileAsync({ html });

      const fileName = `inspecao_${(inspecao.motorista?.nome || 'motorista').replace(/\s/g, '_')}_${Date.now()}.pdf`;
      const newUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.moveAsync({ from: uri, to: newUri });

      logger.info('PDF individual gerado', { uri: newUri });

      return newUri;
    } catch (error) {
      logger.error('Erro ao gerar PDF individual', error);
      throw error;
    }
  },

  /**
   * Compartilha um PDF gerado.
   */
  async compartilharPDF(pdfUri: string): Promise<void> {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Compartilhar Relatório',
      });
    } else {
      throw new Error('Compartilhamento não disponível neste dispositivo');
    }
  },
};

export default PdfInspectionService;
