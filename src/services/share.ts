// src/services/share.ts
// ============================================
// ROTAFRETE - Serviço de Compartilhamento
// ============================================

import { Share, Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import type { ResumoSemana, Motorista } from '@/types';
import { formatarMoeda } from '@/constants';

// Gera texto do relatório semanal
export function gerarTextoRelatorioSemanal(
  resumo: ResumoSemana,
  motorista: Motorista
): string {
  const dataInicio = format(new Date(resumo.inicio), "d 'de' MMM", { locale: ptBR });
  const dataFim = format(new Date(resumo.fim), "d 'de' MMM", { locale: ptBR });
  
  let texto = `📊 *RELATÓRIO SEMANAL - ROTAFRETE*\n`;
  texto += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  texto += `👤 *Motorista:* ${motorista.name}\n`;
  texto += `🚗 *Veículo:* ${motorista.data?.tipoVeiculo} - ${motorista.data?.placaVeiculo}\n`;
  texto += `📅 *Período:* ${dataInicio} a ${dataFim}\n\n`;
  texto += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  texto += `💰 *GANHOS*\n`;
  texto += `   Total Bruto: ${formatarMoeda(resumo.totalBruto)}\n`;
  texto += `   (-) Combustível: ${formatarMoeda(resumo.totalCombustivel)}\n`;
  texto += `   (-) Pedágios: ${formatarMoeda(resumo.totalPedagio)}\n`;
  texto += `   (-) Manutenção: ${formatarMoeda(resumo.totalManutencao)}\n`;
  texto += `   ─────────────────\n`;
  texto += `   *LÍQUIDO: ${formatarMoeda(resumo.totalLiquido)}*\n\n`;
  texto += `📈 *ESTATÍSTICAS*\n`;
  texto += `   Dias trabalhados: ${resumo.diasTrabalhados}\n`;
  texto += `   Total KM: ${resumo.kmTotal} km\n`;
  texto += `   Média/dia: ${formatarMoeda(resumo.diasTrabalhados > 0 ? resumo.totalBruto / resumo.diasTrabalhados : 0)}\n\n`;
  texto += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  texto += `_Gerado por RotaFrete - Aether Platform_`;
  
  return texto;
}

// Compartilha via WhatsApp ou outras apps
export async function compartilharRelatorio(
  resumo: ResumoSemana,
  motorista: Motorista
): Promise<boolean> {
  try {
    const texto = gerarTextoRelatorioSemanal(resumo, motorista);
    
    const result = await Share.share({
      message: texto,
      title: 'Relatório Semanal - RotaFrete',
    });
    
    return result.action === Share.sharedAction;
  } catch (error) {
    console.error('[Share] Erro ao compartilhar:', error);
    Alert.alert('Erro', 'Não foi possível compartilhar o relatório');
    return false;
  }
}

// Gera HTML do relatório para salvar como arquivo
export function gerarHTMLRelatorio(
  resumo: ResumoSemana,
  motorista: Motorista
): string {
  const dataInicio = format(new Date(resumo.inicio), "d 'de' MMMM", { locale: ptBR });
  const dataFim = format(new Date(resumo.fim), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório Semanal - RotaFrete</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #FF6B00;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .logo {
      font-size: 24px;
      font-weight: 800;
      color: #FF6B00;
    }
    .periodo {
      color: #666;
      margin-top: 8px;
    }
    .motorista {
      background: #f8f9fa;
      padding: 16px;
      border-radius: 12px;
      margin-bottom: 24px;
    }
    .motorista h3 {
      margin: 0 0 8px 0;
      color: #333;
    }
    .motorista p {
      margin: 4px 0;
      color: #666;
    }
    .resumo {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    .card {
      background: linear-gradient(135deg, #FF6B00, #EA580C);
      color: white;
      padding: 20px;
      border-radius: 12px;
      grid-column: span 2;
    }
    .card-small {
      background: #f8f9fa;
      padding: 16px;
      border-radius: 12px;
      text-align: center;
    }
    .card h2 {
      margin: 0;
      font-size: 32px;
    }
    .card p {
      margin: 8px 0 0 0;
      opacity: 0.9;
    }
    .card-small h3 {
      margin: 0;
      color: #333;
      font-size: 20px;
    }
    .card-small p {
      margin: 4px 0 0 0;
      color: #666;
      font-size: 12px;
    }
    .detalhes {
      border-top: 1px solid #eee;
      padding-top: 20px;
    }
    .linha {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .linha.total {
      font-weight: 700;
      font-size: 18px;
      color: #22C55E;
      border-bottom: none;
      padding-top: 16px;
    }
    .footer {
      text-align: center;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #eee;
      color: #999;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🚛 RotaFrete</div>
      <p class="periodo">${dataInicio} a ${dataFim}</p>
    </div>
    
    <div class="motorista">
      <h3>${motorista.name}</h3>
      <p>📧 ${motorista.email}</p>
      <p>🚗 ${motorista.data?.tipoVeiculo} - ${motorista.data?.placaVeiculo}</p>
      <p>📍 ${motorista.data?.cidadeBase || 'Avaré'}</p>
    </div>
    
    <div class="resumo">
      <div class="card">
        <h2>${formatarMoeda(resumo.totalLiquido)}</h2>
        <p>Ganho Líquido da Semana</p>
      </div>
      <div class="card-small">
        <h3>${resumo.diasTrabalhados}</h3>
        <p>Dias trabalhados</p>
      </div>
      <div class="card-small">
        <h3>${resumo.kmTotal} km</h3>
        <p>Total rodado</p>
      </div>
    </div>
    
    <div class="detalhes">
      <h4>Detalhamento</h4>
      <div class="linha">
        <span>💰 Total Bruto</span>
        <span>${formatarMoeda(resumo.totalBruto)}</span>
      </div>
      <div class="linha">
        <span>⛽ Combustível</span>
        <span>- ${formatarMoeda(resumo.totalCombustivel)}</span>
      </div>
      <div class="linha">
        <span>🛣️ Pedágios</span>
        <span>- ${formatarMoeda(resumo.totalPedagio)}</span>
      </div>
      <div class="linha">
        <span>🔧 Manutenção</span>
        <span>- ${formatarMoeda(resumo.totalManutencao)}</span>
      </div>
      <div class="linha total">
        <span>✅ Líquido</span>
        <span>${formatarMoeda(resumo.totalLiquido)}</span>
      </div>
    </div>
    
    <div class="footer">
      <p>Relatório gerado por RotaFrete</p>
      <p>Powered by Aether Platform</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// Salva e compartilha arquivo HTML
export async function exportarRelatorioHTML(
  resumo: ResumoSemana,
  motorista: Motorista
): Promise<boolean> {
  try {
    // Verifica se compartilhamento é suportado
    const isAvailable = await Sharing.isAvailableAsync();
    
    if (!isAvailable) {
      Alert.alert('Não disponível', 'Compartilhamento de arquivos não está disponível neste dispositivo');
      return false;
    }
    
    const html = gerarHTMLRelatorio(resumo, motorista);
    const fileName = `relatorio-rotafrete-${format(new Date(), 'yyyy-MM-dd')}.html`;
    const filePath = `${FileSystem.documentDirectory}${fileName}`;
    
    // Salva arquivo
    await FileSystem.writeAsStringAsync(filePath, html, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    
    // Compartilha
    await Sharing.shareAsync(filePath, {
      mimeType: 'text/html',
      dialogTitle: 'Exportar Relatório',
    });
    
    return true;
  } catch (error) {
    console.error('[Share] Erro ao exportar HTML:', error);
    Alert.alert('Erro', 'Não foi possível exportar o relatório');
    return false;
  }
}

export default {
  compartilharRelatorio,
  exportarRelatorioHTML,
  gerarTextoRelatorioSemanal,
  gerarHTMLRelatorio,
};
