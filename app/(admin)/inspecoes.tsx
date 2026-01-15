// app/(admin)/inspecoes.tsx
// ============================================
// ROTAFRETE - Lista de Inspeções (Admin)
// ============================================
// Exibe todas as inspeções com sistema de ABAS:
// - Pendentes: Aguardando avaliação
// - Histórico: Aprovadas e Reprovadas (NOVO!)
// - Críticos: Com itens críticos
// ============================================
// Inclui modal de detalhes + botão exportar PDF
// ============================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Modal,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import {
  ClipboardCheck,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  ChevronRight,
  Calendar,
  X,
  FileText,
  Truck,
  Download,
  History,
  Share2,
} from 'lucide-react-native';

// Store e constantes
import { useAdminStore } from '@/store/useAdminStore';
import { inspectionService } from '@/services/inspection-service';
import { PdfInspectionService } from '@/services/pdf-inspection';
import { getSemanaISO, formatarSemanaISO, STATUS_AVALIACAO_CONFIG } from '@/constants/inspection';
import type { InspecaoVeicular, ItemInspecao, StatusInspecao } from '@/types/inspection';

// ============================================
// TIPOS
// ============================================

type AbaAtiva = 'pendentes' | 'historico' | 'criticos';

// ============================================
// CONFIGURAÇÃO DE STATUS
// ============================================

const STATUS_CONFIG: Record<
  StatusInspecao,
  { label: string; color: string; bg: string; icon: React.ComponentType<any> }
> = {
  PENDENTE: { label: 'Pendente', color: '#F59E0B', bg: '#422006', icon: Clock },
  ENVIADA: { label: 'Aguardando', color: '#3B82F6', bg: '#172554', icon: ClipboardCheck },
  EM_ANALISE: { label: 'Em Análise', color: '#8B5CF6', bg: '#2E1065', icon: Clock },
  APROVADA: { label: 'Aprovada', color: '#22C55E', bg: '#052E16', icon: CheckCircle },
  REPROVADA: { label: 'Reprovada', color: '#EF4444', bg: '#450A0A', icon: XCircle },
  PARCIAL: { label: 'Parcial', color: '#F59E0B', bg: '#422006', icon: AlertTriangle },
};

// ============================================
// COMPONENTE DE ITEM DA LISTA
// ============================================

interface InspecaoItemProps {
  inspecao: InspecaoVeicular;
  onPress: () => void;
  showDataAvaliacao?: boolean; // Para o histórico, mostra data de avaliação
}

function InspecaoItem({ inspecao, onPress, showDataAvaliacao = false }: InspecaoItemProps) {
  const statusConfig = STATUS_CONFIG[inspecao.status];
  const StatusIcon = statusConfig.icon;

  return (
    <TouchableOpacity
      style={styles.inspecaoItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Ícone */}
      <View style={[styles.inspecaoIcon, { backgroundColor: statusConfig.bg }]}>
        <StatusIcon size={20} color={statusConfig.color} />
      </View>

      {/* Info */}
      <View style={styles.inspecaoInfo}>
        <Text style={styles.inspecaoNome}>{inspecao.motorista?.nome || 'Motorista Desconhecido'}</Text>
        <View style={styles.inspecaoMeta}>
          <Text style={styles.inspecaoPlaca}>{inspecao.veiculo?.placa || 'Sem Placa'}</Text>
          <Text style={styles.inspecaoSeparator}>•</Text>
          <Text style={styles.inspecaoSemana}>
            {formatarSemanaISO(inspecao.semanaReferencia)}
          </Text>
        </View>

        {/* Status e contadores */}
        <View style={styles.inspecaoStatusRow}>
          <View style={[styles.inspecaoStatus, { backgroundColor: statusConfig.bg }]}>
            <Text style={[styles.inspecaoStatusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>

          <Text style={styles.inspecaoContador}>
            {inspecao.itensEnviados}/{inspecao.totalItens}
          </Text>

          {inspecao.itensCriticos > 0 && (
            <View style={styles.badge}>
              <XCircle size={10} color="#EF4444" />
              <Text style={styles.badgeTextCritical}>{inspecao.itensCriticos}</Text>
            </View>
          )}
          {inspecao.itensAtencao > 0 && (
            <View style={styles.badge}>
              <AlertTriangle size={10} color="#F59E0B" />
              <Text style={styles.badgeTextWarning}>{inspecao.itensAtencao}</Text>
            </View>
          )}
        </View>

        {/* Data - mostra data de avaliação no histórico */}
        {showDataAvaliacao && inspecao.dataAvaliacao ? (
          <Text style={styles.inspecaoData}>
            Avaliada: {new Date(inspecao.dataAvaliacao).toLocaleDateString('pt-BR')}
          </Text>
        ) : inspecao.dataEnvio ? (
          <Text style={styles.inspecaoData}>
            Enviada: {new Date(inspecao.dataEnvio).toLocaleDateString('pt-BR')}
          </Text>
        ) : null}
      </View>

      {/* Seta */}
      <ChevronRight size={20} color="#64748B" />
    </TouchableOpacity>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function InspecoesScreen() {
  const params = useLocalSearchParams<{ filtro?: string }>();

  // Store
  const {
    inspecoesPendentes,
    historicoInspecoes,
    estatisticasHistorico,
    itensCriticos,
    isLoading,
    isLoadingHistorico,
    carregarInspecoesPendentes,
    carregarHistoricoInspecoes,
    carregarItensCriticos,
  } = useAdminStore();

  // Estados locais
  const [refreshing, setRefreshing] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>(
    params.filtro === 'criticos' ? 'criticos' : 'pendentes'
  );
  const [filtroStatus, setFiltroStatus] = useState<StatusInspecao | null>(null);

  // Estados do modal de detalhes
  const [inspecaoDetalhe, setInspecaoDetalhe] = useState<InspecaoVeicular | null>(null);
  const [itensDetalhe, setItensDetalhe] = useState<ItemInspecao[]>([]);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);
  const [exportandoPdf, setExportandoPdf] = useState(false);

  // Semana atual
  const semanaAtual = getSemanaISO();

  // ─────────────────────────────────────────
  // CARREGAMENTO DE DADOS
  // ─────────────────────────────────────────

  useEffect(() => {
    carregarDados();
  }, []);

  // Carrega histórico quando mudar para a aba
  useEffect(() => {
    if (abaAtiva === 'historico' && historicoInspecoes.length === 0) {
      carregarHistoricoInspecoes(50);
    }
  }, [abaAtiva]);

  const carregarDados = async () => {
    await Promise.all([
      carregarInspecoesPendentes(),
      carregarItensCriticos(),
    ]);
  };

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (abaAtiva === 'historico') {
      await carregarHistoricoInspecoes(50);
    } else {
      await carregarDados();
    }
    setRefreshing(false);
  }, [abaAtiva]);

  // ─────────────────────────────────────────
  // DADOS FILTRADOS
  // ─────────────────────────────────────────

  // Dados baseados na aba ativa
  const dadosAtuais = (() => {
    switch (abaAtiva) {
      case 'pendentes':
        return inspecoesPendentes;
      case 'historico':
        // Filtra por status se aplicável
        if (filtroStatus) {
          return historicoInspecoes.filter(i => i.status === filtroStatus);
        }
        return historicoInspecoes;
      case 'criticos':
        return inspecoesPendentes.filter(i => i.itensCriticos > 0);
      default:
        return [];
    }
  })();

  // ─────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────

  const handleAbrirInspecao = (inspecao: InspecaoVeicular) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Se for do histórico, abre modal de detalhes
    if (abaAtiva === 'historico') {
      handleAbrirDetalhe(inspecao);
    } else {
      // Se for pendente/crítico, vai para tela de avaliação
      router.push({
        pathname: '/(admin)/avaliar/[inspecaoId]',
        params: { inspecaoId: inspecao.id },
      });
    }
  };

  // Abre modal de detalhes
  const handleAbrirDetalhe = async (inspecao: InspecaoVeicular) => {
    setInspecaoDetalhe(inspecao);
    setLoadingDetalhe(true);

    try {
      const itens = await inspectionService.listarItensInspecao(inspecao.id);
      setItensDetalhe(itens);
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
      Alert.alert('Erro', 'Não foi possível carregar os detalhes da inspeção.');
    } finally {
      setLoadingDetalhe(false);
    }
  };

  // Fecha modal de detalhes
  const handleFecharDetalhe = () => {
    setInspecaoDetalhe(null);
    setItensDetalhe([]);
  };

  // Exporta PDF da inspeção
  const handleExportarPdf = async () => {
    if (!inspecaoDetalhe) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setExportandoPdf(true);

    try {
      // Gera o PDF
      const pdfUri = await PdfInspectionService.gerarPDFInspecao(inspecaoDetalhe.id);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Opções para o usuário
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

  // Muda de aba
  const handleMudarAba = (aba: AbaAtiva) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAbaAtiva(aba);
    setFiltroStatus(null); // Limpa filtro ao mudar de aba
  };

  // ─────────────────────────────────────────
  // RENDERIZAÇÃO
  // ─────────────────────────────────────────

  // Renderiza item da lista
  const renderItem = ({ item }: { item: InspecaoVeicular }) => (
    <InspecaoItem
      inspecao={item}
      onPress={() => handleAbrirInspecao(item)}
      showDataAvaliacao={abaAtiva === 'historico'}
    />
  );

  // Renderiza lista vazia
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      {abaAtiva === 'historico' ? (
        <>
          <History size={48} color="#64748B" />
          <Text style={styles.emptyTitle}>Nenhuma inspeção no histórico</Text>
          <Text style={styles.emptyText}>
            As inspeções aprovadas ou reprovadas aparecerão aqui.
          </Text>
        </>
      ) : abaAtiva === 'criticos' ? (
        <>
          <CheckCircle size={48} color="#22C55E" />
          <Text style={styles.emptyTitle}>Nenhum item crítico</Text>
          <Text style={styles.emptyText}>
            Não há inspeções com itens críticos pendentes.
          </Text>
        </>
      ) : (
        <>
          <CheckCircle size={48} color="#22C55E" />
          <Text style={styles.emptyTitle}>Nenhuma inspeção pendente</Text>
          <Text style={styles.emptyText}>
            Todas as inspeções foram avaliadas!
          </Text>
        </>
      )}
    </View>
  );

  // Renderiza header com estatísticas
  const renderHeader = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{inspecoesPendentes.length}</Text>
        <Text style={styles.statLabel}>Aguardando</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={[styles.statValue, { color: '#22C55E' }]}>
          {estatisticasHistorico.aprovadas}
        </Text>
        <Text style={styles.statLabel}>Aprovadas</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={[styles.statValue, { color: '#EF4444' }]}>
          {inspecoesPendentes.filter((i) => i.itensCriticos > 0).length}
        </Text>
        <Text style={styles.statLabel}>Com Críticos</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Inspeções</Text>
          <Text style={styles.headerSubtitle}>
            {formatarSemanaISO(semanaAtual)}
          </Text>
        </View>
      </View>

      {/* Sistema de Abas */}
      <View style={styles.abasContainer}>
        <TouchableOpacity
          style={[styles.aba, abaAtiva === 'pendentes' && styles.abaAtiva]}
          onPress={() => handleMudarAba('pendentes')}
        >
          <ClipboardCheck
            size={16}
            color={abaAtiva === 'pendentes' ? '#3B82F6' : '#64748B'}
          />
          <Text style={[styles.abaTexto, abaAtiva === 'pendentes' && styles.abaTextoAtivo]}>
            Pendentes
          </Text>
          {inspecoesPendentes.length > 0 && (
            <View style={styles.abaBadge}>
              <Text style={styles.abaBadgeTexto}>{inspecoesPendentes.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.aba, abaAtiva === 'historico' && styles.abaAtiva]}
          onPress={() => handleMudarAba('historico')}
        >
          <History
            size={16}
            color={abaAtiva === 'historico' ? '#3B82F6' : '#64748B'}
          />
          <Text style={[styles.abaTexto, abaAtiva === 'historico' && styles.abaTextoAtivo]}>
            Histórico
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.aba, abaAtiva === 'criticos' && styles.abaAtiva]}
          onPress={() => handleMudarAba('criticos')}
        >
          <XCircle
            size={16}
            color={abaAtiva === 'criticos' ? '#3B82F6' : '#EF4444'}
          />
          <Text style={[styles.abaTexto, abaAtiva === 'criticos' && styles.abaTextoAtivo]}>
            Críticos
          </Text>
          {inspecoesPendentes.filter(i => i.itensCriticos > 0).length > 0 && (
            <View style={[styles.abaBadge, { backgroundColor: '#450A0A' }]}>
              <Text style={[styles.abaBadgeTexto, { color: '#EF4444' }]}>
                {inspecoesPendentes.filter(i => i.itensCriticos > 0).length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Filtros do histórico */}
      {abaAtiva === 'historico' && (
        <View style={styles.filtrosHistorico}>
          <TouchableOpacity
            style={[styles.filtroChip, !filtroStatus && styles.filtroChipActive]}
            onPress={() => setFiltroStatus(null)}
          >
            <Text style={[styles.filtroChipText, !filtroStatus && styles.filtroChipTextActive]}>
              Todas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filtroChip, filtroStatus === 'APROVADA' && styles.filtroChipActive]}
            onPress={() => setFiltroStatus('APROVADA')}
          >
            <CheckCircle size={12} color={filtroStatus === 'APROVADA' ? '#22C55E' : '#64748B'} />
            <Text style={[styles.filtroChipText, filtroStatus === 'APROVADA' && styles.filtroChipTextActive]}>
              Aprovadas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filtroChip, filtroStatus === 'REPROVADA' && styles.filtroChipActive]}
            onPress={() => setFiltroStatus('REPROVADA')}
          >
            <XCircle size={12} color={filtroStatus === 'REPROVADA' ? '#EF4444' : '#64748B'} />
            <Text style={[styles.filtroChipText, filtroStatus === 'REPROVADA' && styles.filtroChipTextActive]}>
              Reprovadas
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Lista */}
      <FlatList
        data={dadosAtuais}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isLoadingHistorico}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Modal de Detalhes da Inspeção */}
      <Modal
        visible={!!inspecaoDetalhe}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleFecharDetalhe}
      >
        {inspecaoDetalhe && (
          <SafeAreaView style={styles.modalContainer}>
            {/* Header do Modal */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleFecharDetalhe}>
                <X size={24} color="#F1F5F9" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {formatarSemanaISO(inspecaoDetalhe.semanaReferencia)}
              </Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Card de Status */}
              <View
                style={[
                  styles.statusCard,
                  { backgroundColor: STATUS_CONFIG[inspecaoDetalhe.status].bg },
                ]}
              >
                {React.createElement(STATUS_CONFIG[inspecaoDetalhe.status].icon, {
                  size: 32,
                  color: STATUS_CONFIG[inspecaoDetalhe.status].color,
                })}
                <Text
                  style={[
                    styles.statusText,
                    { color: STATUS_CONFIG[inspecaoDetalhe.status].color },
                  ]}
                >
                  {STATUS_CONFIG[inspecaoDetalhe.status].label}
                </Text>
              </View>

              {/* Informações do Motorista */}
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Truck size={16} color="#64748B" />
                  <Text style={styles.infoText}>
                    {inspecaoDetalhe.motorista?.nome || 'Motorista'} • {inspecaoDetalhe.veiculo?.placa}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Calendar size={16} color="#64748B" />
                  <Text style={styles.infoText}>
                    Enviada: {inspecaoDetalhe.dataEnvio
                      ? new Date(inspecaoDetalhe.dataEnvio).toLocaleString('pt-BR')
                      : 'Não enviada'}
                  </Text>
                </View>
                {inspecaoDetalhe.dataAvaliacao && (
                  <View style={styles.infoRow}>
                    <CheckCircle size={16} color="#64748B" />
                    <Text style={styles.infoText}>
                      Avaliada: {new Date(inspecaoDetalhe.dataAvaliacao).toLocaleString('pt-BR')}
                    </Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <FileText size={16} color="#64748B" />
                  <Text style={styles.infoText}>
                    Por: {inspecaoDetalhe.avaliadoPorNome || 'Admin'}
                  </Text>
                </View>
              </View>

              {/* Resumo de Itens */}
              <View style={styles.resumoCard}>
                <Text style={styles.resumoTitle}>Resumo</Text>
                <View style={styles.resumoGrid}>
                  <View style={styles.resumoItem}>
                    <Text style={styles.resumoValor}>
                      {inspecaoDetalhe.itensEnviados}/{inspecaoDetalhe.totalItens}
                    </Text>
                    <Text style={styles.resumoLabel}>Enviados</Text>
                  </View>
                  <View style={styles.resumoItem}>
                    <Text style={[styles.resumoValor, { color: '#22C55E' }]}>
                      {inspecaoDetalhe.itensAprovados}
                    </Text>
                    <Text style={styles.resumoLabel}>OK</Text>
                  </View>
                  <View style={styles.resumoItem}>
                    <Text style={[styles.resumoValor, { color: '#F59E0B' }]}>
                      {inspecaoDetalhe.itensAtencao}
                    </Text>
                    <Text style={styles.resumoLabel}>Atenção</Text>
                  </View>
                  <View style={styles.resumoItem}>
                    <Text style={[styles.resumoValor, { color: '#EF4444' }]}>
                      {inspecaoDetalhe.itensCriticos}
                    </Text>
                    <Text style={styles.resumoLabel}>Críticos</Text>
                  </View>
                </View>
              </View>

              {/* Observações */}
              {(inspecaoDetalhe.observacoesMotorista || inspecaoDetalhe.observacoesAdmin) && (
                <View style={styles.observacoesCard}>
                  {inspecaoDetalhe.observacoesMotorista && (
                    <View style={styles.obsItem}>
                      <Text style={styles.obsLabel}>Obs. do Motorista:</Text>
                      <Text style={styles.obsText}>{inspecaoDetalhe.observacoesMotorista}</Text>
                    </View>
                  )}
                  {inspecaoDetalhe.observacoesAdmin && (
                    <View style={styles.obsItem}>
                      <Text style={styles.obsLabel}>Obs. do Avaliador:</Text>
                      <Text style={styles.obsText}>{inspecaoDetalhe.observacoesAdmin}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Lista de Itens */}
              <View style={styles.itensContainer}>
                <Text style={styles.itensTitle}>Itens Avaliados</Text>
                {loadingDetalhe ? (
                  <ActivityIndicator size="small" color="#3B82F6" style={{ marginTop: 20 }} />
                ) : (
                  itensDetalhe.map((item) => {
                    const statusConfig = STATUS_AVALIACAO_CONFIG[item.statusAvaliacao];

                    return (
                      <View key={item.id} style={styles.itemCard}>
                        {/* Thumbnail */}
                        <View style={styles.itemThumb}>
                          {item.fotoUrl ? (
                            <Image
                              source={{ uri: item.fotoUrl }}
                              style={styles.itemImage}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.itemNoImage}>
                              <Text style={styles.itemNoImageText}>-</Text>
                            </View>
                          )}
                        </View>

                        {/* Info */}
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemNome}>{item.nomeExibicao}</Text>
                          <View
                            style={[
                              styles.itemStatus,
                              { backgroundColor: statusConfig?.bg || '#1E293B' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.itemStatusText,
                                { color: statusConfig?.text || '#94A3B8' },
                              ]}
                            >
                              {statusConfig?.label || 'Pendente'}
                            </Text>
                          </View>
                          {item.observacaoAdmin && (
                            <Text style={styles.itemObs} numberOfLines={2}>
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

            {/* Botão de Exportar PDF */}
            <View style={styles.modalFooter}>
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
    justifyContent: 'space-between',
    alignItems: 'center',
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

  // Abas
  abasContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  aba: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
  },
  abaAtiva: {
    backgroundColor: '#172554',
  },
  abaTexto: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  abaTextoAtivo: {
    color: '#3B82F6',
  },
  abaBadge: {
    backgroundColor: '#172554',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  abaBadgeTexto: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3B82F6',
  },

  // Filtros do histórico
  filtrosHistorico: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filtroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    gap: 4,
  },
  filtroChipActive: {
    backgroundColor: '#172554',
  },
  filtroChipText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  filtroChipTextActive: {
    color: '#3B82F6',
    fontWeight: '500',
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },

  // Lista
  listContent: {
    padding: 16,
  },
  inspecaoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  inspecaoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inspecaoInfo: {
    flex: 1,
    marginLeft: 12,
  },
  inspecaoNome: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  inspecaoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  inspecaoPlaca: {
    fontSize: 12,
    color: '#64748B',
  },
  inspecaoSeparator: {
    fontSize: 12,
    color: '#64748B',
  },
  inspecaoSemana: {
    fontSize: 12,
    color: '#64748B',
  },
  inspecaoStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  inspecaoStatus: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  inspecaoStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  inspecaoContador: {
    fontSize: 11,
    color: '#64748B',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  badgeTextCritical: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
  },
  badgeTextWarning: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '600',
  },
  inspecaoData: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
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

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalFooter: {
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },

  // Status Card
  statusCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },

  // Info Card
  infoCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  infoText: {
    fontSize: 13,
    color: '#94A3B8',
  },

  // Resumo Card
  resumoCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  resumoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 12,
  },
  resumoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resumoItem: {
    alignItems: 'center',
  },
  resumoValor: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  resumoLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },

  // Observações
  observacoesCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  obsItem: {
    marginBottom: 12,
  },
  obsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 4,
  },
  obsText: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 18,
  },

  // Itens
  itensContainer: {
    marginTop: 8,
  },
  itensTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 12,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  itemThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemNoImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemNoImageText: {
    color: '#64748B',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemNome: {
    fontSize: 13,
    fontWeight: '500',
    color: '#E2E8F0',
  },
  itemStatus: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  itemStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  itemObs: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },

  // Botão Exportar
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