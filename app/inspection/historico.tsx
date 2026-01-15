// app/inspection/historico.tsx
// ============================================
// ROTAFRETE - Histórico de Inspeções (Motorista)
// ============================================
// Lista todas as inspeções anteriores do
// motorista com filtros, detalhes e exportação.
// ============================================
// [NOVO] Botão de exportar PDF no modal de detalhes
// ============================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Filter,
  ChevronRight,
  X,
  FileText,
  Truck,
  Download,
} from 'lucide-react-native';

// Store e serviços
import { useInspectionStore } from '@/store/useInspectionStore';
import { inspectionService } from '@/services/inspection-service';
import { PdfInspectionService } from '@/services/pdf-inspection';
import { useAuthWithRole } from '@/hooks/useAuthWithRole';
import {
  STATUS_AVALIACAO_CONFIG,
  CATEGORIAS_INSPECAO,
  formatarSemanaISO,
} from '@/constants/inspection';
import type { InspecaoVeicular, ItemInspecao, StatusInspecao } from '@/types/inspection';

// ============================================
// CONFIGURAÇÃO DE STATUS
// ============================================

const STATUS_CONFIG: Record<StatusInspecao, {
  label: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
}> = {
  PENDENTE: {
    label: 'Pendente',
    icon: Clock,
    color: '#F59E0B',
    bgColor: '#422006',
  },
  ENVIADA: {
    label: 'Enviada',
    icon: FileText,
    color: '#3B82F6',
    bgColor: '#172554',
  },
  EM_ANALISE: {
    label: 'Em Análise',
    icon: Clock,
    color: '#8B5CF6',
    bgColor: '#2E1065',
  },
  APROVADA: {
    label: 'Aprovada',
    icon: CheckCircle,
    color: '#22C55E',
    bgColor: '#052E16',
  },
  REPROVADA: {
    label: 'Reprovada',
    icon: XCircle,
    color: '#EF4444',
    bgColor: '#450A0A',
  },
  PARCIAL: {
    label: 'Parcial',
    icon: AlertTriangle,
    color: '#F59E0B',
    bgColor: '#422006',
  },
};

// ============================================
// COMPONENTE DE ITEM DA LISTA
// ============================================

interface InspecaoListItemProps {
  inspecao: InspecaoVeicular;
  onPress: () => void;
}

function InspecaoListItem({ inspecao, onPress }: InspecaoListItemProps) {
  const statusConfig = STATUS_CONFIG[inspecao.status];
  const StatusIcon = statusConfig.icon;

  const progresso = inspecao.totalItens > 0
    ? Math.round((inspecao.itensEnviados / inspecao.totalItens) * 100)
    : 0;

  return (
    <TouchableOpacity
      style={styles.listItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Ícone de status */}
      <View style={[styles.listItemIcon, { backgroundColor: statusConfig.bgColor }]}>
        <StatusIcon size={20} color={statusConfig.color} />
      </View>

      {/* Info */}
      <View style={styles.listItemContent}>
        <Text style={styles.listItemSemana}>
          {formatarSemanaISO(inspecao.semanaReferencia)}
        </Text>
        <View style={styles.listItemMeta}>
          <View style={[styles.listItemStatus, { backgroundColor: statusConfig.bgColor }]}>
            <Text style={[styles.listItemStatusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
          <Text style={styles.listItemData}>
            {inspecao.dataEnvio
              ? new Date(inspecao.dataEnvio).toLocaleDateString('pt-BR')
              : '-'}
          </Text>
        </View>

        {/* Contadores */}
        <View style={styles.listItemCounters}>
          <Text style={styles.listItemCounter}>
            {inspecao.itensEnviados}/{inspecao.totalItens} itens
          </Text>
          {inspecao.itensCriticos > 0 && (
            <View style={styles.listItemCounterBadge}>
              <XCircle size={10} color="#EF4444" />
              <Text style={styles.listItemCounterBadgeText}>
                {inspecao.itensCriticos}
              </Text>
            </View>
          )}
          {inspecao.itensAtencao > 0 && (
            <View style={styles.listItemCounterBadge}>
              <AlertTriangle size={10} color="#F59E0B" />
              <Text style={styles.listItemCounterBadgeTextWarning}>
                {inspecao.itensAtencao}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Seta */}
      <ChevronRight size={20} color="#64748B" />
    </TouchableOpacity>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function HistoricoScreen() {
  // Auth
  const { isAdmin, user } = useAuthWithRole();

  // Store
  const { historico: historicoInspecoes, carregarHistorico } = useInspectionStore();

  // Estados locais
  const [refreshing, setRefreshing] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<StatusInspecao | null>(null);
  const [showFiltros, setShowFiltros] = useState(false);
  const [inspecaoDetalhe, setInspecaoDetalhe] = useState<InspecaoVeicular | null>(null);
  const [itensDetalhe, setItensDetalhe] = useState<ItemInspecao[]>([]);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);
  const [exportandoPdf, setExportandoPdf] = useState(false);

  // Carrega mais histórico
  useEffect(() => {
    if (user?.id) {
      carregarHistorico(user.id, 50);
    }
  }, [user]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    await carregarHistorico(user.id, 50);
    setRefreshing(false);
  }, [user]);

  // Filtra inspeções
  const inspecoesFiltradas = filtroStatus
    ? historicoInspecoes.filter((i) => i.status === filtroStatus)
    : historicoInspecoes;

  // Abre detalhes de uma inspeção
  const handleAbrirDetalhe = async (inspecao: InspecaoVeicular) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInspecaoDetalhe(inspecao);
    setLoadingDetalhe(true);

    try {
      // [SECURITY] Passa o ID do motorista para garantir acesso aos itens
      const motoristaId = user?.id || inspecao.motoristaId;
      const itens = await inspectionService.listarItensInspecao(inspecao.id, motoristaId);
      setItensDetalhe(itens);
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
      Alert.alert('Erro', 'Não foi possível carregar os detalhes.');
    } finally {
      setLoadingDetalhe(false);
    }
  };

  // Fecha detalhes
  const handleFecharDetalhe = () => {
    setInspecaoDetalhe(null);
    setItensDetalhe([]);
  };

  // [NOVO] Exporta PDF da inspeção
  const handleExportarPdf = async () => {
    if (!inspecaoDetalhe) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setExportandoPdf(true);

    try {
      // Gera o PDF usando o serviço
      const pdfUri = await PdfInspectionService.gerarPDFInspecao(inspecaoDetalhe.id);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Oferece opções ao usuário
      Alert.alert('PDF Gerado!', 'O que deseja fazer com o relatório?', [
        {
          text: 'Compartilhar',
          onPress: async () => {
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(pdfUri, {
                mimeType: 'application/pdf',
                dialogTitle: 'Compartilhar Relatório de Inspeção',
              });
            } else {
              Alert.alert('Erro', 'Compartilhamento não disponível neste dispositivo.');
            }
          },
        },
        {
          text: 'OK',
          style: 'cancel',
        },
      ]);
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Erro', 'Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      setExportandoPdf(false);
    }
  };

  // Renderiza item da lista
  const renderItem = ({ item }: { item: InspecaoVeicular }) => (
    <InspecaoListItem
      inspecao={item}
      onPress={() => handleAbrirDetalhe(item)}
    />
  );

  // Renderiza lista vazia
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Calendar size={48} color="#64748B" />
      <Text style={styles.emptyTitle}>Nenhuma inspeção encontrada</Text>
      <Text style={styles.emptyText}>
        {filtroStatus
          ? 'Não há inspeções com este status.'
          : 'Você ainda não realizou nenhuma inspeção.'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#F1F5F9" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Histórico de Inspeções</Text>
          <Text style={styles.headerSubtitle}>
            {inspecoesFiltradas.length} inspeção(ões)
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.filterButton, filtroStatus && styles.filterButtonActive]}
          onPress={() => setShowFiltros(true)}
        >
          <Filter size={20} color={filtroStatus ? '#3B82F6' : '#94A3B8'} />
        </TouchableOpacity>
      </View>

      {/* Filtro ativo */}
      {filtroStatus && (
        <View style={styles.filtroAtivo}>
          <Text style={styles.filtroAtivoText}>
            Filtro: {STATUS_CONFIG[filtroStatus].label}
          </Text>
          <TouchableOpacity onPress={() => setFiltroStatus(null)}>
            <X size={16} color="#3B82F6" />
          </TouchableOpacity>
        </View>
      )}

      {/* Lista */}
      <FlatList
        data={inspecoesFiltradas}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
          />
        }
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />

      {/* Modal de Filtros */}
      <Modal
        visible={showFiltros}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFiltros(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filtrosModal}>
            <View style={styles.filtrosHeader}>
              <Text style={styles.filtrosTitle}>Filtrar por Status</Text>
              <TouchableOpacity onPress={() => setShowFiltros(false)}>
                <X size={24} color="#F1F5F9" />
              </TouchableOpacity>
            </View>

            <View style={styles.filtrosOptions}>
              <TouchableOpacity
                style={[
                  styles.filtroOption,
                  !filtroStatus && styles.filtroOptionActive,
                ]}
                onPress={() => {
                  setFiltroStatus(null);
                  setShowFiltros(false);
                }}
              >
                <Text
                  style={[
                    styles.filtroOptionText,
                    !filtroStatus && styles.filtroOptionTextActive,
                  ]}
                >
                  Todas
                </Text>
              </TouchableOpacity>

              {(Object.keys(STATUS_CONFIG) as StatusInspecao[]).map((status) => {
                const config = STATUS_CONFIG[status];
                const Icon = config.icon;
                const isActive = filtroStatus === status;

                return (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filtroOption,
                      isActive && styles.filtroOptionActive,
                    ]}
                    onPress={() => {
                      setFiltroStatus(status);
                      setShowFiltros(false);
                    }}
                  >
                    <Icon size={18} color={isActive ? '#3B82F6' : config.color} />
                    <Text
                      style={[
                        styles.filtroOptionText,
                        isActive && styles.filtroOptionTextActive,
                      ]}
                    >
                      {config.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Detalhes */}
      <Modal
        visible={!!inspecaoDetalhe}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleFecharDetalhe}
      >
        {inspecaoDetalhe && (
          <SafeAreaView style={styles.detalheContainer}>
            {/* Header */}
            <View style={styles.detalheHeader}>
              <TouchableOpacity onPress={handleFecharDetalhe}>
                <X size={24} color="#F1F5F9" />
              </TouchableOpacity>
              <Text style={styles.detalheTitle}>
                {formatarSemanaISO(inspecaoDetalhe.semanaReferencia)}
              </Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.detalheContent}>
              {/* Card de Status */}
              <View
                style={[
                  styles.detalheStatusCard,
                  { backgroundColor: STATUS_CONFIG[inspecaoDetalhe.status].bgColor },
                ]}
              >
                {React.createElement(STATUS_CONFIG[inspecaoDetalhe.status].icon, {
                  size: 32,
                  color: STATUS_CONFIG[inspecaoDetalhe.status].color,
                })}
                <Text
                  style={[
                    styles.detalheStatusText,
                    { color: STATUS_CONFIG[inspecaoDetalhe.status].color },
                  ]}
                >
                  {STATUS_CONFIG[inspecaoDetalhe.status].label}
                </Text>
              </View>

              {/* Informações */}
              <View style={styles.detalheInfo}>
                <View style={styles.detalheInfoRow}>
                  <Truck size={16} color="#64748B" />
                  <Text style={styles.detalheInfoText}>
                    {inspecaoDetalhe.veiculo?.placa || 'N/A'} • {inspecaoDetalhe.veiculo?.modelo || 'N/A'}
                  </Text>
                </View>
                <View style={styles.detalheInfoRow}>
                  <Calendar size={16} color="#64748B" />
                  <Text style={styles.detalheInfoText}>
                    Enviada em:{' '}
                    {inspecaoDetalhe.dataEnvio
                      ? new Date(inspecaoDetalhe.dataEnvio).toLocaleString('pt-BR')
                      : 'Não enviada'}
                  </Text>
                </View>
                {inspecaoDetalhe.dataAvaliacao && (
                  <View style={styles.detalheInfoRow}>
                    <CheckCircle size={16} color="#64748B" />
                    <Text style={styles.detalheInfoText}>
                      Avaliada em:{' '}
                      {new Date(inspecaoDetalhe.dataAvaliacao).toLocaleString('pt-BR')}
                    </Text>
                  </View>
                )}
              </View>

              {/* Resumo de Itens */}
              <View style={styles.detalheResumo}>
                <Text style={styles.detalheResumoTitle}>Resumo</Text>
                <View style={styles.detalheResumoGrid}>
                  <View style={styles.detalheResumoItem}>
                    <Text style={styles.detalheResumoValor}>
                      {inspecaoDetalhe.itensEnviados}/{inspecaoDetalhe.totalItens}
                    </Text>
                    <Text style={styles.detalheResumoLabel}>Enviados</Text>
                  </View>
                  <View style={styles.detalheResumoItem}>
                    <Text style={[styles.detalheResumoValor, { color: '#22C55E' }]}>
                      {inspecaoDetalhe.itensAprovados}
                    </Text>
                    <Text style={styles.detalheResumoLabel}>OK</Text>
                  </View>
                  <View style={styles.detalheResumoItem}>
                    <Text style={[styles.detalheResumoValor, { color: '#F59E0B' }]}>
                      {inspecaoDetalhe.itensAtencao}
                    </Text>
                    <Text style={styles.detalheResumoLabel}>Atenção</Text>
                  </View>
                  <View style={styles.detalheResumoItem}>
                    <Text style={[styles.detalheResumoValor, { color: '#EF4444' }]}>
                      {inspecaoDetalhe.itensCriticos}
                    </Text>
                    <Text style={styles.detalheResumoLabel}>Críticos</Text>
                  </View>
                </View>
              </View>

              {/* Observações */}
              {(inspecaoDetalhe.observacoesMotorista || inspecaoDetalhe.observacoesAdmin) && (
                <View style={styles.detalheObservacoes}>
                  {inspecaoDetalhe.observacoesMotorista && (
                    <View style={styles.detalheObsItem}>
                      <Text style={styles.detalheObsLabel}>Suas observações:</Text>
                      <Text style={styles.detalheObsText}>
                        {inspecaoDetalhe.observacoesMotorista}
                      </Text>
                    </View>
                  )}
                  {inspecaoDetalhe.observacoesAdmin && (
                    <View style={styles.detalheObsItem}>
                      <Text style={styles.detalheObsLabel}>Observações do avaliador:</Text>
                      <Text style={styles.detalheObsText}>
                        {inspecaoDetalhe.observacoesAdmin}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Lista de Itens */}
              <View style={styles.detalheItens}>
                <Text style={styles.detalheItensTitle}>Itens Avaliados</Text>
                {loadingDetalhe ? (
                  <ActivityIndicator size="small" color="#3B82F6" style={{ marginTop: 20 }} />
                ) : (
                  itensDetalhe.map((item) => {
                    const statusConfig = STATUS_AVALIACAO_CONFIG[item.statusAvaliacao];

                    return (
                      <View key={item.id} style={styles.detalheItemCard}>
                        {/* Thumbnail */}
                        <View style={styles.detalheItemThumb}>
                          {item.fotoUrl ? (
                            <Image
                              source={{ uri: item.fotoUrl }}
                              style={styles.detalheItemImage}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.detalheItemNoImage}>
                              <Text style={styles.detalheItemNoImageText}>-</Text>
                            </View>
                          )}
                        </View>

                        {/* Info */}
                        <View style={styles.detalheItemInfo}>
                          <Text style={styles.detalheItemNome}>{item.nomeExibicao}</Text>
                          <View
                            style={[
                              styles.detalheItemStatus,
                              { backgroundColor: statusConfig?.bg || '#1E293B' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.detalheItemStatusText,
                                { color: statusConfig?.text || '#94A3B8' },
                              ]}
                            >
                              {statusConfig?.label || 'Pendente'}
                            </Text>
                          </View>
                          {item.observacaoAdmin && (
                            <Text style={styles.detalheItemObs} numberOfLines={2}>
                              {item.observacaoAdmin}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}
              </View>

              <View style={{ height: 100 }} />
            </ScrollView>

            {/* [NOVO] Botão de Exportar PDF (Apenas Admin) */}
            {isAdmin() && (
              <View style={styles.detalheFooter}>
                <TouchableOpacity
                  style={styles.exportarBtn}
                  onPress={handleExportarPdf}
                  disabled={exportandoPdf}
                >
                  {exportandoPdf ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Download size={20} color="#FFFFFF" />
                      <Text style={styles.exportarBtnText}>Exportar PDF</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </SafeAreaView>
        )}
      </Modal>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  filterButton: {
    padding: 10,
    backgroundColor: '#1E293B',
    borderRadius: 8,
  },
  filterButtonActive: {
    backgroundColor: '#172554',
  },

  // Filtro ativo
  filtroAtivo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#172554',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  filtroAtivoText: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '500',
  },

  // Lista
  listContent: {
    padding: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  listItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  listItemSemana: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  listItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  listItemStatus: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  listItemStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  listItemData: {
    fontSize: 11,
    color: '#64748B',
  },
  listItemCounters: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  listItemCounter: {
    fontSize: 11,
    color: '#94A3B8',
  },
  listItemCounterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  listItemCounterBadgeText: {
    fontSize: 10,
    color: '#EF4444',
    fontWeight: '600',
  },
  listItemCounterBadgeTextWarning: {
    fontSize: 10,
    color: '#F59E0B',
    fontWeight: '600',
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },

  // Modal de Filtros
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filtrosModal: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  filtrosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  filtrosTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  filtrosOptions: {
    padding: 16,
  },
  filtroOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    gap: 12,
  },
  filtroOptionActive: {
    backgroundColor: '#172554',
  },
  filtroOptionText: {
    fontSize: 15,
    color: '#94A3B8',
  },
  filtroOptionTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },

  // Modal de Detalhes
  detalheContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  detalheHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  detalheTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  detalheContent: {
    flex: 1,
    padding: 16,
  },
  detalheStatusCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
  },
  detalheStatusText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  detalheInfo: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  detalheInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  detalheInfoText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  detalheResumo: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  detalheResumoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 12,
  },
  detalheResumoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detalheResumoItem: {
    alignItems: 'center',
  },
  detalheResumoValor: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  detalheResumoLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  detalheObservacoes: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  detalheObsItem: {
    marginBottom: 12,
  },
  detalheObsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 4,
  },
  detalheObsText: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 18,
  },
  detalheItens: {
    marginTop: 8,
  },
  detalheItensTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 12,
  },
  detalheItemCard: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  detalheItemThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
  },
  detalheItemImage: {
    width: '100%',
    height: '100%',
  },
  detalheItemNoImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detalheItemNoImageText: {
    color: '#64748B',
  },
  detalheItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  detalheItemNome: {
    fontSize: 13,
    fontWeight: '500',
    color: '#E2E8F0',
  },
  detalheItemStatus: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  detalheItemStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  detalheItemObs: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },

  // [NOVO] Footer com Botão Exportar
  detalheFooter: {
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  exportarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  exportarBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});