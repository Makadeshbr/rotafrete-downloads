// app/(admin)/relatorios.tsx
// ============================================
// ROTAFRETE - Relatórios (Admin)
// ============================================
// Permite gerar e exportar relatórios de inspeção
// em PDF com fotos e filtros por período.
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
  FileBarChart,
  Calendar,
  Users,
  Download,
  Share as ShareIcon,
  ChevronRight,
  FileText,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Filter,
} from 'lucide-react-native';

// Store e serviços
import { useAdminStore } from '@/store/useAdminStore';
import { PdfInspectionService } from '@/services/pdf-inspection';
import { getSemanaISO, formatarSemanaISO, DIAS_SEMANA } from '@/constants/inspection';
import type { StatusInspecao } from '@/types/inspection';

// ============================================
// TIPOS
// ============================================

type TipoPeriodo = 'semanal' | 'mensal' | 'personalizado';

interface FiltrosRelatorio {
  tipoPeriodo: TipoPeriodo;
  semana?: string;
  mes?: string;
  ano?: number;
  motoristas: string[]; // IDs, vazio = todos
  status: StatusInspecao[];
  apenasComProblemas: boolean;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function RelatoriosScreen() {
  // Store
  const { motoristas, inspecoesPendentes } = useAdminStore();

  // Estados
  const [isGenerating, setIsGenerating] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosRelatorio>({
    tipoPeriodo: 'semanal',
    semana: getSemanaISO(),
    motoristas: [],
    status: [],
    apenasComProblemas: false,
  });
  const [showTipoPeriodo, setShowTipoPeriodo] = useState(false);
  const [showFiltrosMotorista, setShowFiltrosMotorista] = useState(false);
  const [showFiltrosStatus, setShowFiltrosStatus] = useState(false);

  // Handlers
  const handleGerarRelatorio = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsGenerating(true);

    try {
      // Gera o PDF
      const pdfUri = await PdfInspectionService.gerarRelatorioPDF({
        periodo: {
          tipo: filtros.tipoPeriodo,
          inicio: '', // Calculado pelo serviço
          fim: '',
          semanaReferencia: filtros.semana,
        },
        filtros: {
          motoristas: filtros.motoristas.length > 0 ? filtros.motoristas : undefined,
          status: filtros.status.length > 0 ? filtros.status : undefined,
          apenasComProblemas: filtros.apenasComProblemas,
        },
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Opções de ação com o PDF
      Alert.alert('Relatório Gerado!', 'O que deseja fazer com o relatório?', [
        {
          text: 'Compartilhar',
          onPress: () => handleCompartilhar(pdfUri),
        },
        {
          text: 'Salvar',
          onPress: () => handleSalvar(pdfUri),
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      Alert.alert('Erro', 'Não foi possível gerar o relatório. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCompartilhar = async (pdfUri: string) => {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Compartilhar Relatório de Inspeção',
        });
      } else {
        // Fallback para Share nativo
        await Share.share({
          url: pdfUri,
          message: 'Relatório de Inspeção Veicular',
        });
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível compartilhar o relatório.');
    }
  };

  const handleSalvar = async (pdfUri: string) => {
    try {
      // Em produção, salvaria no dispositivo ou storage
      Alert.alert('Salvo!', `Relatório salvo em: ${pdfUri}`);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar o relatório.');
    }
  };

  const handleToggleMotorista = (id: string) => {
    setFiltros((prev) => ({
      ...prev,
      motoristas: prev.motoristas.includes(id)
        ? prev.motoristas.filter((m) => m !== id)
        : [...prev.motoristas, id],
    }));
  };

  const handleToggleStatus = (status: StatusInspecao) => {
    setFiltros((prev) => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter((s) => s !== status)
        : [...prev.status, status],
    }));
  };

  // Calcula semanas disponíveis (últimas 12)
  const semanasDisponiveis: string[] = [];
  for (let i = 0; i < 12; i++) {
    const data = new Date();
    data.setDate(data.getDate() - i * 7);
    semanasDisponiveis.push(getSemanaISO(data));
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Relatórios</Text>
        <Text style={styles.headerSubtitle}>Exportar dados de inspeção</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Card de Resumo */}
        <View style={styles.resumoCard}>
          <View style={styles.resumoHeader}>
            <FileBarChart size={24} color="#3B82F6" />
            <Text style={styles.resumoTitulo}>Relatório de Inspeções</Text>
          </View>
          <Text style={styles.resumoDescricao}>
            Gere um relatório PDF com os dados das inspeções veiculares,
            incluindo fotos e status de cada item avaliado.
          </Text>
        </View>

        {/* Seção: Período */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={18} color="#3B82F6" />
            <Text style={styles.sectionTitle}>Período</Text>
          </View>

          <View style={styles.optionCard}>
            {/* Tipo de período */}
            <TouchableOpacity
              style={styles.optionItemTouchable}
              onPress={() => setShowTipoPeriodo(!showTipoPeriodo)}
            >
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Tipo de período</Text>
              </View>
              <View style={styles.optionValue}>
                <Text style={styles.optionValueText}>
                  {filtros.tipoPeriodo === 'semanal'
                    ? 'Semanal'
                    : filtros.tipoPeriodo === 'mensal'
                    ? 'Mensal'
                    : 'Personalizado'}
                </Text>
                <ChevronRight size={18} color="#64748B" />
              </View>
            </TouchableOpacity>

            {showTipoPeriodo && (
              <View style={styles.pickerContainer}>
                {(['semanal', 'mensal'] as TipoPeriodo[]).map((tipo) => (
                  <TouchableOpacity
                    key={tipo}
                    style={[
                      styles.pickerOption,
                      filtros.tipoPeriodo === tipo && styles.pickerOptionActive,
                    ]}
                    onPress={() => {
                      setFiltros((prev) => ({ ...prev, tipoPeriodo: tipo }));
                      setShowTipoPeriodo(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        filtros.tipoPeriodo === tipo &&
                          styles.pickerOptionTextActive,
                      ]}
                    >
                      {tipo === 'semanal' ? 'Semanal' : 'Mensal'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.optionDivider} />

            {/* Seletor de semana */}
            {filtros.tipoPeriodo === 'semanal' && (
              <View style={styles.semanasContainer}>
                <Text style={styles.semanasLabel}>Selecione a semana:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.semanasScroll}
                >
                  {semanasDisponiveis.map((semana) => (
                    <TouchableOpacity
                      key={semana}
                      style={[
                        styles.semanaChip,
                        filtros.semana === semana && styles.semanaChipActive,
                      ]}
                      onPress={() => setFiltros((prev) => ({ ...prev, semana }))}
                    >
                      <Text
                        style={[
                          styles.semanaChipText,
                          filtros.semana === semana && styles.semanaChipTextActive,
                        ]}
                      >
                        {formatarSemanaISO(semana)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>

        {/* Seção: Filtros */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Filter size={18} color="#F59E0B" />
            <Text style={styles.sectionTitle}>Filtros</Text>
          </View>

          <View style={styles.optionCard}>
            {/* Motoristas */}
            <TouchableOpacity
              style={styles.optionItemTouchable}
              onPress={() => setShowFiltrosMotorista(!showFiltrosMotorista)}
            >
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Motoristas</Text>
                <Text style={styles.optionDescription}>
                  {filtros.motoristas.length === 0
                    ? 'Todos os motoristas'
                    : `${filtros.motoristas.length} selecionado(s)`}
                </Text>
              </View>
              <ChevronRight size={18} color="#64748B" />
            </TouchableOpacity>

            {showFiltrosMotorista && (
              <View style={styles.filtrosListContainer}>
                {motoristas.map((motorista) => (
                  <TouchableOpacity
                    key={motorista.id}
                    style={styles.filtroItemRow}
                    onPress={() => handleToggleMotorista(motorista.id)}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        filtros.motoristas.includes(motorista.id) &&
                          styles.checkboxActive,
                      ]}
                    >
                      {filtros.motoristas.includes(motorista.id) && (
                        <CheckCircle size={14} color="#fff" />
                      )}
                    </View>
                    <Text style={styles.filtroItemText}>{motorista.nome}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.optionDivider} />

            {/* Status */}
            <TouchableOpacity
              style={styles.optionItemTouchable}
              onPress={() => setShowFiltrosStatus(!showFiltrosStatus)}
            >
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Status</Text>
                <Text style={styles.optionDescription}>
                  {filtros.status.length === 0
                    ? 'Todos os status'
                    : `${filtros.status.length} selecionado(s)`}
                </Text>
              </View>
              <ChevronRight size={18} color="#64748B" />
            </TouchableOpacity>

            {showFiltrosStatus && (
              <View style={styles.filtrosListContainer}>
                {(
                  [
                    'APROVADA',
                    'REPROVADA',
                    'ENVIADA',
                    'PENDENTE',
                  ] as StatusInspecao[]
                ).map((status) => {
                  const statusLabels: Record<StatusInspecao, string> = {
                    APROVADA: 'Aprovadas',
                    REPROVADA: 'Reprovadas',
                    ENVIADA: 'Aguardando Análise',
                    PENDENTE: 'Pendentes',
                    PARCIAL: 'Parciais',
                    EM_ANALISE: 'Em Análise',
                  };

                  return (
                    <TouchableOpacity
                      key={status}
                      style={styles.filtroItemRow}
                      onPress={() => handleToggleStatus(status)}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          filtros.status.includes(status) && styles.checkboxActive,
                        ]}
                      >
                        {filtros.status.includes(status) && (
                          <CheckCircle size={14} color="#fff" />
                        )}
                      </View>
                      <Text style={styles.filtroItemText}>
                        {statusLabels[status]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <View style={styles.optionDivider} />

            {/* Apenas com problemas */}
            <View style={styles.optionItem}>
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Apenas com problemas</Text>
                <Text style={styles.optionDescription}>
                  Incluir apenas inspeções com itens críticos ou atenção
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  filtros.apenasComProblemas && styles.toggleButtonActive,
                ]}
                onPress={() =>
                  setFiltros((prev) => ({
                    ...prev,
                    apenasComProblemas: !prev.apenasComProblemas,
                  }))
                }
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    filtros.apenasComProblemas && styles.toggleButtonTextActive,
                  ]}
                >
                  {filtros.apenasComProblemas ? 'Sim' : 'Não'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Preview do que será gerado */}
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>O relatório incluirá:</Text>
          <View style={styles.previewItem}>
            <CheckCircle size={14} color="#22C55E" />
            <Text style={styles.previewText}>
              Resumo geral com estatísticas
            </Text>
          </View>
          <View style={styles.previewItem}>
            <CheckCircle size={14} color="#22C55E" />
            <Text style={styles.previewText}>
              Lista de motoristas e status
            </Text>
          </View>
          <View style={styles.previewItem}>
            <CheckCircle size={14} color="#22C55E" />
            <Text style={styles.previewText}>
              Fotos de cada item inspecionado
            </Text>
          </View>
          <View style={styles.previewItem}>
            <CheckCircle size={14} color="#22C55E" />
            <Text style={styles.previewText}>
              Observações e prazos de manutenção
            </Text>
          </View>
        </View>

        {/* Botão de Gerar */}
        <TouchableOpacity
          style={styles.gerarButton}
          onPress={handleGerarRelatorio}
          disabled={isGenerating}
          activeOpacity={0.8}
        >
          {isGenerating ? (
            <>
              <ActivityIndicator color="#fff" />
              <Text style={styles.gerarButtonText}>Gerando PDF...</Text>
            </>
          ) : (
            <>
              <FileText size={20} color="#fff" />
              <Text style={styles.gerarButtonText}>Gerar Relatório PDF</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Ações rápidas */}
        <View style={styles.acoesRapidas}>
          <Text style={styles.acoesRapidasTitle}>Relatórios Rápidos</Text>

          <TouchableOpacity
            style={styles.acaoRapidaButton}
            onPress={() => {
              setFiltros({
                tipoPeriodo: 'semanal',
                semana: getSemanaISO(),
                motoristas: [],
                status: [],
                apenasComProblemas: false,
              });
              handleGerarRelatorio();
            }}
          >
            <Calendar size={18} color="#3B82F6" />
            <Text style={styles.acaoRapidaText}>Semana Atual - Completo</Text>
            <ChevronRight size={16} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.acaoRapidaButton}
            onPress={() => {
              setFiltros({
                tipoPeriodo: 'semanal',
                semana: getSemanaISO(),
                motoristas: [],
                status: [],
                apenasComProblemas: true,
              });
              handleGerarRelatorio();
            }}
          >
            <AlertTriangle size={18} color="#F59E0B" />
            <Text style={styles.acaoRapidaText}>
              Semana Atual - Só Problemas
            </Text>
            <ChevronRight size={16} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.acaoRapidaButton}
            onPress={() => {
              setFiltros({
                tipoPeriodo: 'semanal',
                semana: getSemanaISO(),
                motoristas: [],
                status: ['REPROVADA'],
                apenasComProblemas: false,
              });
              handleGerarRelatorio();
            }}
          >
            <XCircle size={18} color="#EF4444" />
            <Text style={styles.acaoRapidaText}>Inspeções Reprovadas</Text>
            <ChevronRight size={16} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },

  // Content
  content: {
    flex: 1,
    padding: 16,
  },

  // Resumo Card
  resumoCard: {
    backgroundColor: '#172554',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#1E40AF',
  },
  resumoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  resumoTitulo: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F1F5F9',
    marginLeft: 10,
  },
  resumoDescricao: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },

  // Seções
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    marginLeft: 8,
  },

  // Cards de Opções
  optionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    overflow: 'hidden',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  optionItemTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  optionInfo: {
    flex: 1,
    marginRight: 16,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F1F5F9',
  },
  optionDescription: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  optionValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  optionValueText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  optionDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginHorizontal: 16,
  },

  // Pickers
  pickerContainer: {
    padding: 12,
    backgroundColor: '#0F172A',
  },
  pickerOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  pickerOptionActive: {
    backgroundColor: '#172554',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  pickerOptionTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },

  // Semanas
  semanasContainer: {
    padding: 16,
  },
  semanasLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
  },
  semanasScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  semanaChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  semanaChipActive: {
    backgroundColor: '#172554',
    borderColor: '#3B82F6',
  },
  semanaChipText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  semanaChipTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },

  // Filtros List
  filtrosListContainer: {
    padding: 12,
    backgroundColor: '#0F172A',
  },
  filtroItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filtroItemText: {
    fontSize: 14,
    color: '#E2E8F0',
  },

  // Toggle Button
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  toggleButtonActive: {
    backgroundColor: '#172554',
    borderColor: '#3B82F6',
  },
  toggleButtonText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  toggleButtonTextActive: {
    color: '#3B82F6',
  },

  // Preview
  previewCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 12,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  previewText: {
    fontSize: 13,
    color: '#94A3B8',
  },

  // Botão Gerar
  gerarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 10,
  },
  gerarButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },

  // Ações Rápidas
  acoesRapidas: {
    marginBottom: 24,
  },
  acoesRapidasTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 12,
  },
  acaoRapidaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  acaoRapidaText: {
    flex: 1,
    fontSize: 14,
    color: '#E2E8F0',
  },
});
