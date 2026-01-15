// rotafrete/src/services/pdf-generator.ts
// ============================================
// ROTAFRETE - Gerador de PDF Local
// ============================================
// Gera PDF do extrato mensal usando expo-print
// SEM dependências de backend - 100% local
// ============================================

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface ExtractData {
  userId: string;
  month: number;
  year: number;
  periodLabel?: string; // [NOVO] Permite sobrescrever o título (ex: "Semana 02/01 - 08/01")
  rotas: any[];
  despesas: any[];
}

export interface PDFResult {
  success: boolean;
  uri?: string;
  error?: string;
}

/**
 * Gera HTML do extrato mensal formatado
 */
function generateExtractHTML(data: ExtractData): string {
  const { month, year, rotas, despesas, periodLabel } = data;

  const monthName = format(new Date(year, month - 1, 1), 'MMMM', { locale: ptBR });
  const tituloRelatorio = periodLabel || `Extrato de ${monthName} ${year}`;

  // Calcular totais
  const totalBruto = rotas.reduce((sum, r) =>
    sum + (r.valorFrete || 0) + (r.valorParadas || 0), 0
  );

  const despesasPorTipo: Record<string, number> = {};
  despesas.forEach(d => {
    const tipo = d.tipo || 'OUTROS';
    despesasPorTipo[tipo] = (despesasPorTipo[tipo] || 0) + (d.valor || 0);
  });

  const totalDespesas = Object.values(despesasPorTipo).reduce(
    (sum, val) => sum + val, 0
  );

  const totalLiquido = totalBruto - totalDespesas;
  const totalKm = rotas.reduce((sum, r) => sum + (r.kmRodados || 0), 0);
  const totalParadas = rotas.reduce((sum, r) => sum + (r.quantidadeParadas || 0), 0);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 40px 30px;
      color: #1f2937;
      background: white;
    }
    
    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 3px solid #f97316;
      padding-bottom: 20px;
    }
    
    .logo {
      font-size: 32px;
      font-weight: 800;
      color: #f97316;
      margin-bottom: 8px;
    }
    
    .period {
      font-size: 18px;
      color: #6b7280;
      font-weight: 600;
      text-transform: capitalize;
    }
    
    .summary {
      background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 32px;
    }
    
    .summary-title {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 16px;
      color: #92400e;
    }
    
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 16px;
    }
    
    .summary-item {
      text-align: center;
    }
    
    .summary-label {
      font-size: 12px;
      color: #78350f;
      margin-bottom: 4px;
      text-transform: uppercase;
      font-weight: 600;
    }
    
    .summary-value {
      font-size: 20px;
      font-weight: 700;
      color: #451a03;
    }
    
    .summary-value.positive {
      color: #15803d;
    }
    
    .summary-value.negative {
      color: #dc2626;
    }
    
    .stats {
      font-size: 14px;
      color: #78350f;
      margin-top: 16px;
      border-top: 1px solid rgba(120, 53, 15, 0.2);
      padding-top: 12px;
    }
    
    .section {
      margin-bottom: 32px;
    }
    
    .section-title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 16px;
      color: #1f2937;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 8px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    
    thead {
      background: #f3f4f6;
    }
    
    th {
      text-align: left;
      padding: 10px;
      font-weight: 600;
      color: #4b5563;
      border-bottom: 2px solid #d1d5db;
    }
    
    td {
      padding: 10px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    tr:hover {
      background: #f9fafb;
    }
    
    .text-right {
      text-align: right;
    }
    
    .text-center {
      text-align: center;
    }
    
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .badge-combustivel { background: #fef3c7; color: #92400e; }
    .badge-pedagio { background: #dbeafe; color: #1e40af; }
    .badge-manutencao { background: #fecaca; color: #991b1b; }
    .badge-outros { background: #e5e7eb; color: #374151; }
    
    .footer {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 11px;
      color: #9ca3af;
    }
    
    .empty-state {
      text-align: center;
      padding: 40px;
      color: #9ca3af;
      font-style: italic;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="logo">🚚 RotaFrete</div>
    <div class="period">${tituloRelatorio}</div>
  </div>
  
  <!-- Summary -->
  <div class="summary">
    <div class="summary-title">Resumo Financeiro</div>
    <div class="summary-grid">
      <div class="summary-item">
        <div class="summary-label">Total Bruto</div>
        <div class="summary-value">R$ ${totalBruto.toFixed(2)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Despesas</div>
        <div class="summary-value negative">R$ ${totalDespesas.toFixed(2)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Total Líquido</div>
        <div class="summary-value positive">R$ ${totalLiquido.toFixed(2)}</div>
      </div>
    </div>
    <div class="stats">
      📍 ${totalKm} km rodados · 📦 ${totalParadas} paradas · 
      🚗 ${rotas.length} rotas · 💰 ${despesas.length} despesas
    </div>
  </div>
  
  <!-- Rotas -->
  <div class="section">
    <div class="section-title">Rotas</div>
    ${rotas.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th class="text-center">KM</th>
            <th class="text-center">Paradas</th>
            <th>Destino</th>
            <th class="text-right">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${rotas.map(r => `
            <tr>
              <td>${r.data ? format(parseISO(r.data), 'dd/MM', { locale: ptBR }) : 'N/A'}</td>
              <td class="text-center">${r.kmRodados || 0}</td>
              <td class="text-center">${r.quantidadeParadas || 0}</td>
              <td>${r.cidadeDestino || r.destino || '-'}</td>
              <td class="text-right">R$ ${((r.valorFrete || 0) + (r.valorParadas || 0)).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '<div class="empty-state">Nenhuma rota registrada neste período</div>'}
  </div>
  
  <!-- Despesas -->
  <div class="section">
    <div class="section-title">Despesas</div>
    ${despesas.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Tipo</th>
            <th>Descrição</th>
            <th class="text-right">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${despesas.map(d => `
            <tr>
              <td>${d.data ? format(parseISO(d.data), 'dd/MM', { locale: ptBR }) : 'N/A'}</td>
              <td>
                <span class="badge badge-${(d.tipo || 'outros').toLowerCase()}">
                  ${d.tipo || 'OUTROS'}
                </span>
              </td>
              <td>${d.descricao || '-'}</td>
              <td class="text-right">R$ ${(d.valor || 0).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '<div class="empty-state">Nenhuma despesa registrada neste período</div>'}
  </div>
  
  <!-- Footer -->
  <div class="footer">
    Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} · 
    RotaFrete powered by Aether Platform
  </div>
</body>
</html>
  `;
}

/**
 * Gera PDF do extrato mensal localmente
 * 
 * @example
 * ```ts
 * const result = await generateExtractPDFLocal({
 *   userId: user.id,
 *   month: 1,
 *   year: 2026,
 *   rotas: [...],
 *   despesas: [...]
 * });
 * 
 * if (result.success) {
 *   await Sharing.shareAsync(result.uri!);
 * }
 * ```
 */
export async function generateExtractPDFLocal(data: ExtractData): Promise<PDFResult> {
  try {
    const html = generateExtractHTML(data);

    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    return {
      success: true,
      uri,
    };
  } catch (error: any) {
    console.error('[PDF Generator] Erro:', error);
    return {
      success: false,
      error: error?.message || 'Erro ao gerar PDF',
    };
  }
}
