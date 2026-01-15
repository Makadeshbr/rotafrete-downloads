// app/(tabs)/maintenance.tsx
// ============================================
// ROTAFRETE - Tela de Manutenção Premium
// ============================================

import React, { useState, useCallback } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import {
  Wrench,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronRight,
  Plus,
  Calendar,
  Trash2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { Card, CardContent } from '@/components/ui';
import { MaintenanceHistoryModal, VehicleMaintenanceLottie, AgendarManutencaoModal } from '@/components/vehicle';
import { useAuth } from '@aether-baas/react-native';
import { useManutencaoStore, useDespesasStore, useAgendamentoStore } from '@/store';
import {
  PARTES_VEICULO,
  STATUS_MANUTENCAO,
  type StatusManutencao,
  type ParteVeiculo,
  formatarMoeda,
} from '@/constants';

const { width } = Dimensions.get('window');

// ============================================
// COMPONENTES AUXILIARES
// ============================================

function StatusIcon({ status }: { status: StatusManutencao }) {
  const config = STATUS_MANUTENCAO[status];
  if (status === 'OK') return <CheckCircle size={16} color={config.cor} />;
  if (status === 'ATENCAO') return <AlertTriangle size={16} color={config.cor} />;
  return <XCircle size={16} color={config.cor} />;
}

interface MaintenanceItemProps {
  parte: typeof PARTES_VEICULO[number];
  status: StatusManutencao;
  onPress: () => void;
}

function MaintenanceItem({ parte, status, onPress }: MaintenanceItemProps) {
  const config = STATUS_MANUTENCAO[status];

  return (
    <TouchableOpacity
      style={[styles.maintenanceItem, { borderLeftColor: config.cor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.maintenanceItemLeft}>
        <View style={[styles.statusDot, { backgroundColor: config.cor }]} />
        <View>
          <Text style={styles.maintenanceItemName}>{parte.nome}</Text>
          <Text style={[styles.maintenanceItemStatus, { color: config.cor }]}>
            {config.label}
          </Text>
        </View>
      </View>
      <ChevronRight size={20} color="#64748B" />
    </TouchableOpacity>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function MaintenanceScreen() {
  const { user } = useAuth();
  const {
    statusVeiculo,
    fetchStatusVeiculo,
    atualizarStatusParte,
    getContadorStatus,
  } = useManutencaoStore();

  // Store de despesas para registrar custos de manutenção
  const { adicionarDespesa, fetchDespesasPorPeriodo, despesas } = useDespesasStore();

  const [selectedPart, setSelectedPart] = useState<ParteVeiculo | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [agendarModalVisible, setAgendarModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Agendamentos
  const { agendamentos, fetchAgendamentos, getAgendamentosPendentes, deletarAgendamento } = useAgendamentoStore();

  // Handler para deletar agendamento com confirmação
  const handleDeleteAgendamento = (agendamento: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const parteInfo = PARTES_VEICULO.find(p => p.id === agendamento.parteVeiculo);

    Alert.alert(
      'Excluir Agendamento',
      `Deseja excluir o agendamento de "${parteInfo?.nome || agendamento.parteVeiculo}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletarAgendamento(agendamento.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir o agendamento');
            }
          }
        }
      ]
    );
  };

  const hoje = new Date();
  // Busca histórico dos últimos 6 meses
  const startHist = new Date(hoje.getFullYear(), hoje.getMonth() - 6, 1);
  const endHist = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  // Busca status ao focar na tela
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchStatusVeiculo(user.id);
        fetchAgendamentos(user.id);
        // Busca histórico de despesas para exibir no modal
        fetchDespesasPorPeriodo(user.id, startHist, endHist);
      }
    }, [user?.id, fetchStatusVeiculo])
  );

  // [REALTIME] Inscreve para atualizações em tempo real
  React.useEffect(() => {
    if (!user?.id) return;

    // Inicia subscrição
    const unsubscribe = useManutencaoStore.getState().subscribeToChanges(user.id);

    // Cleanup ao desmontar
    return () => {
      unsubscribe();
    };
  }, [user?.id]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (user?.id) {
      await fetchStatusVeiculo(user.id);
    }
    setRefreshing(false);
  }, [user?.id, fetchStatusVeiculo]);

  // Ao clicar em uma parte
  const handlePartPress = useCallback((parte: ParteVeiculo) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPart(parte);
    setModalVisible(true);
  }, []);

  // Ao mudar status - INTEGRADO COM DESPESAS
  const handleStatusChange = useCallback(
    async (status: StatusManutencao, custo: number, observacao: string) => {
      if (selectedPart && user?.id) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Atualiza status no banco
        await atualizarStatusParte(user.id, selectedPart, status);

        // Se tiver custo, registra como despesa de manutenção
        if (custo > 0) {
          const parteInfo = PARTES_VEICULO.find(p => p.id === selectedPart);
          const descricao = observacao || `Manutenção: ${parteInfo?.nome || selectedPart}`;

          await adicionarDespesa({
            motoristaId: user.id,
            tipo: 'MANUTENCAO',
            valor: custo,
            descricao,
            data: new Date().toISOString(),
            parteVeiculo: selectedPart,
          });

          console.log(`[MANUTENÇÃO] Despesa salva: ${parteInfo?.nome} - ${formatarMoeda(custo)}`);
        }

        setModalVisible(false);
      }
    },
    [selectedPart, user?.id, atualizarStatusParte, adicionarDespesa]
  );

  // Contadores
  const statusCounts = getContadorStatus();

  // Filtra itens por status
  const urgentItems = PARTES_VEICULO.filter((p) => statusVeiculo[p.id] === 'URGENTE');
  const warningItems = PARTES_VEICULO.filter((p) => statusVeiculo[p.id] === 'ATENCAO');

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0F172A', '#020617']} style={styles.background}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3B82F6"
              colors={['#3B82F6']}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <Wrench size={28} color="#3B82F6" />
              <Text style={styles.title}>Manutenção</Text>
            </View>
            <Text style={styles.subtitle}>Acompanhe o estado do seu veículo</Text>
          </View>

          {/* Resumo de Status */}
          <View style={styles.statusSummary}>
            <View style={[styles.statusCard, styles.statusOk]}>
              <CheckCircle size={20} color="#22C55E" />
              <Text style={styles.statusCount}>{statusCounts.OK || 0}</Text>
              <Text style={styles.statusLabel}>Em dia</Text>
            </View>
            <View style={[styles.statusCard, styles.statusWarning]}>
              <AlertTriangle size={20} color="#F59E0B" />
              <Text style={styles.statusCount}>{statusCounts.ATENCAO || 0}</Text>
              <Text style={styles.statusLabel}>Atenção</Text>
            </View>
            <View style={[styles.statusCard, styles.statusUrgent]}>
              <XCircle size={20} color="#EF4444" />
              <Text style={styles.statusCount}>{statusCounts.URGENTE || 0}</Text>
              <Text style={styles.statusLabel}>Urgente</Text>
            </View>
          </View>

          {/* Lottie Visual */}
          <VehicleMaintenanceLottie
            tipoVeiculo={(user?.metadata as any)?.tipoVeiculo || 'UTILITARIO'}
          />

          {/* Alertas Urgentes */}
          {urgentItems.length > 0 && (
            <View style={styles.alertsSection}>
              <View style={styles.alertsHeader}>
                <XCircle size={20} color="#EF4444" />
                <Text style={styles.alertsTitle}>Requer Ação Imediata</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{urgentItems.length}</Text>
                </View>
              </View>
              {urgentItems.map((parte) => (
                <MaintenanceItem
                  key={parte.id}
                  parte={parte}
                  status="URGENTE"
                  onPress={() => handlePartPress(parte.id)}
                />
              ))}
            </View>
          )}

          {/* Alertas de Atenção */}
          {warningItems.length > 0 && (
            <View style={styles.alertsSection}>
              <View style={styles.alertsHeader}>
                <AlertTriangle size={20} color="#F59E0B" />
                <Text style={styles.alertsTitle}>Verificar em Breve</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{warningItems.length}</Text>
                </View>
              </View>
              {warningItems.map((parte) => (
                <MaintenanceItem
                  key={parte.id}
                  parte={parte}
                  status="ATENCAO"
                  onPress={() => handlePartPress(parte.id)}
                />
              ))}
            </View>
          )}

          {/* Lista Premium de Peças */}
          <View style={styles.partsGrid}>
            {PARTES_VEICULO.map((parte, index) => {
              const status = statusVeiculo[parte.id];
              const config = STATUS_MANUTENCAO[status];

              return (
                <Animated.View
                  key={parte.id}
                  entering={FadeInDown.delay(index * 50).springify().damping(12)}
                  style={styles.partCardWrapper}
                >
                  <TouchableOpacity
                    onPress={() => handlePartPress(parte.id)}
                    style={[
                      styles.partCard,
                      { borderLeftColor: config.cor, borderLeftWidth: 4 }
                    ]}
                    activeOpacity={0.8}
                  >
                    <View style={styles.partCardContent}>
                      <View style={styles.partCardLeft}>
                        <View style={[styles.statusBadge, { backgroundColor: config.cor + '20' }]}>
                          <StatusIcon status={status} />
                        </View>
                        <View>
                          <Text style={styles.partName}>{parte.nome}</Text>
                          <Text style={[styles.partStatus, { color: config.cor }]}>
                            {config.label}
                          </Text>
                        </View>
                      </View>
                      <ChevronRight size={20} color="#64748B" />
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>

          {/* Agendamentos Pendentes */}
          {getAgendamentosPendentes().length > 0 && (
            <View style={styles.alertsSection}>
              <View style={styles.alertsHeader}>
                <Calendar size={20} color="#3B82F6" />
                <Text style={styles.alertsTitle}>Agendamentos Pendentes</Text>
                <View style={[styles.badge, { backgroundColor: '#3B82F620' }]}>
                  <Text style={[styles.badgeText, { color: '#3B82F6' }]}>{getAgendamentosPendentes().length}</Text>
                </View>
              </View>
              {getAgendamentosPendentes().slice(0, 3).map((agendamento) => {
                const parteInfo = PARTES_VEICULO.find(p => p.id === agendamento.parteVeiculo);
                return (
                  <TouchableOpacity
                    key={agendamento.id}
                    style={[styles.maintenanceItem, { borderLeftColor: '#3B82F6' }]}
                    onLongPress={() => handleDeleteAgendamento(agendamento)}
                    delayLongPress={500}
                    activeOpacity={0.8}
                  >
                    <View style={styles.maintenanceItemLeft}>
                      <View style={[styles.statusDot, { backgroundColor: '#3B82F6' }]} />
                      <View>
                        <Text style={styles.maintenanceItemName}>{parteInfo?.nome || agendamento.parteVeiculo}</Text>
                        <Text style={[styles.maintenanceItemStatus, { color: '#94A3B8' }]}>
                          {new Date(agendamento.dataAgendada).toLocaleDateString('pt-BR')}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <TouchableOpacity
                        onPress={() => handleDeleteAgendamento(agendamento)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Trash2 size={18} color="#EF4444" />
                      </TouchableOpacity>
                      <ChevronRight size={20} color="#64748B" />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* FAB - Agendar Manutenção */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setAgendarModalVisible(true);
          }}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#3B82F6', '#1D4ED8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <Plus size={24} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      {/* Modal de Manutenção */}
      {/* Modal de Manutenção */}
      <MaintenanceHistoryModal
        visible={modalVisible}
        parte={selectedPart}
        currentStatus={selectedPart ? statusVeiculo[selectedPart] : 'OK'}
        onClose={() => setModalVisible(false)}
        onStatusChange={handleStatusChange}
        historico={selectedPart ? despesas.filter(d => d.tipo === 'MANUTENCAO' && d.parteVeiculo === selectedPart).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()) : []}
      />

      {/* Modal de Agendamento */}
      <AgendarManutencaoModal
        visible={agendarModalVisible}
        onClose={() => setAgendarModalVisible(false)}
      />
    </View>
  );
}

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 15,
    color: '#94A3B8',
    marginLeft: 40,
  },
  statusSummary: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statusCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statusOk: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  statusWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  statusUrgent: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  statusCount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statusLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  diagramCard: {
    marginBottom: 24,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  alertsSection: {
    marginBottom: 24,
  },
  alertsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  alertsTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  maintenanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  maintenanceItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  maintenanceItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  maintenanceItemStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  partsGrid: {
    gap: 12,
    marginBottom: 24,
  },
  partCardWrapper: {
    marginBottom: 8,
  },
  partCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 16,
    padding: 16,
    backdropFilter: 'blur(10px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  partCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  partCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  statusBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  partName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  partStatus: {
    fontSize: 13,
    fontWeight: '600',
  },
  // FAB Button styles
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});