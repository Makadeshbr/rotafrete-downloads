// app/(admin)/index.tsx
// ============================================
// ROTAFRETE - Dashboard Administrativo
// ============================================
// Tela principal do admin com visão geral das
// inspeções, alertas urgentes e estatísticas.
// ============================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  LayoutDashboard,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  ClipboardCheck,
  ChevronRight,
  TrendingUp,
  Calendar,
  type LucideIcon,
} from 'lucide-react-native';

// Store
import { useAdminStore } from '@/store/useAdminStore';
import { getSemanaISO, formatarSemanaISO } from '@/constants/inspection';
import type { InspecaoVeicular, ItemInspecao } from '@/types/inspection';

// ============================================
// COMPONENTES LOCAIS
// ============================================

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  onPress?: () => void;
  trend?: { value: number; isPositive: boolean };
}

function StatCard({ title, value, icon: Icon, color, bgColor, onPress, trend }: StatCardProps) {
  return (
    <TouchableOpacity
      style={[styles.statCard, { backgroundColor: bgColor }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.statHeader}>
        <Icon size={20} color={color} />
        {onPress && <ChevronRight size={16} color="#64748B" />}
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {trend && (
        <View style={styles.statTrend}>
          <TrendingUp
            size={12}
            color={trend.isPositive ? '#22C55E' : '#EF4444'}
            style={!trend.isPositive && { transform: [{ rotate: '180deg' }] }}
          />
          <Text
            style={[
              styles.statTrendText,
              { color: trend.isPositive ? '#22C55E' : '#EF4444' },
            ]}
          >
            {trend.value}%
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

interface AlertItemProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  onPress: () => void;
}

function AlertItem({ title, subtitle, icon: Icon, color, bgColor, onPress }: AlertItemProps) {
  return (
    <TouchableOpacity
      style={[styles.alertItem, { borderLeftColor: color }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.alertIcon, { backgroundColor: bgColor }]}>
        <Icon size={18} color={color} />
      </View>
      <View style={styles.alertContent}>
        <Text style={styles.alertTitle}>{title}</Text>
        <Text style={styles.alertSubtitle}>{subtitle}</Text>
      </View>
      <ChevronRight size={18} color="#64748B" />
    </TouchableOpacity>
  );
}

interface InspecaoItemProps {
  inspecao: InspecaoVeicular;
  onPress: () => void;
}

function InspecaoItem({ inspecao, onPress }: InspecaoItemProps) {
  const statusColors: Record<string, { color: string; bg: string }> = {
    ENVIADA: { color: '#3B82F6', bg: '#172554' },
    EM_ANALISE: { color: '#8B5CF6', bg: '#2E1065' },
    PENDENTE: { color: '#F59E0B', bg: '#422006' },
  };

  const statusConfig = statusColors[inspecao.status] || statusColors.PENDENTE;

  return (
    <TouchableOpacity
      style={styles.inspecaoItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.inspecaoInfo}>
        <Text style={styles.inspecaoNome}>{inspecao.motorista?.nome || 'Motorista não ident.'}</Text>
        <Text style={styles.inspecaoPlaca}>{inspecao.veiculo?.placa || 'Sem placa'}</Text>
      </View>
      <View style={styles.inspecaoMeta}>
        <View
          style={[styles.inspecaoStatus, { backgroundColor: statusConfig.bg }]}
        >
          <Text style={[styles.inspecaoStatusText, { color: statusConfig.color }]}>
            {inspecao.status === 'ENVIADA' ? 'Aguardando' : inspecao.status}
          </Text>
        </View>
        <Text style={styles.inspecaoData}>
          {inspecao.dataEnvio
            ? new Date(inspecao.dataEnvio).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })
            : '-'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function AdminDashboard() {
  // Store admin
  const {
    resumo,
    inspecoesPendentes,
    itensCriticos,
    isLoading,
    error,
    carregarDashboard,
    carregarInspecoesPendentes,
    carregarItensCriticos,
  } = useAdminStore();

  // Estado local
  const [refreshing, setRefreshing] = useState(false);

  // Semana atual
  const semanaAtual = getSemanaISO();

  // ─── Carrega dados iniciais ──────────────
  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    await Promise.all([
      carregarDashboard(),
      carregarInspecoesPendentes(),
      carregarItensCriticos(),
    ]);
  };

  // ─── Pull to refresh ─────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await carregarDados();
    setRefreshing(false);
  }, []);

  // ─── Handlers ────────────────────────────

  const handleVerInspecoesPendentes = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(admin)/inspecoes');
  };

  const handleVerMotoristas = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(admin)/motoristas');
  };

  const handleAbrirInspecao = (inspecao: InspecaoVeicular) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/(admin)/avaliar/[inspecaoId]',
      params: { inspecaoId: inspecao.id },
    });
  };

  const handleVerItensCriticos = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(admin)/inspecoes?filtro=criticos');
  };

  // ─── Renderização ────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Painel Admin</Text>
          <Text style={styles.headerSubtitle}>
            {formatarSemanaISO(semanaAtual)}
          </Text>
        </View>
        <View style={styles.headerBadge}>
          <Calendar size={16} color="#3B82F6" />
          <Text style={styles.headerBadgeText}>
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
            })}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
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
        {/* Cards de Estatísticas */}
        <View style={styles.statsGrid}>
          <StatCard
            title="Para Analisar"
            value={resumo?.inspecoesParaAnalisar ?? 0}
            icon={ClipboardCheck}
            color="#3B82F6"
            bgColor="#172554"
            onPress={handleVerInspecoesPendentes}
          />
          <StatCard
            title="Itens Críticos"
            value={resumo?.itensCriticosPendentes ?? 0}
            icon={XCircle}
            color="#EF4444"
            bgColor="#450A0A"
            onPress={handleVerItensCriticos}
          />
          <StatCard
            title="Pendentes"
            value={resumo?.inspecoesPendentes ?? 0}
            icon={Clock}
            color="#F59E0B"
            bgColor="#422006"
          />
          <StatCard
            title="Motoristas"
            value={resumo?.totalMotoristas ?? 0}
            icon={Users}
            color="#22C55E"
            bgColor="#052E16"
            onPress={handleVerMotoristas}
          />
        </View>

        {/* Alertas Urgentes */}
        {((resumo?.itensCriticosPendentes ?? 0) > 0 ||
          (resumo?.itensVencendoHoje ?? 0) > 0 ||
          (resumo?.inspecoesAtrasadas ?? 0) > 0) && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <AlertTriangle size={18} color="#EF4444" />
                <Text style={styles.sectionTitleDanger}>Alertas Urgentes</Text>
              </View>

              {(resumo?.itensVencendoHoje ?? 0) > 0 && (
                <AlertItem
                  title={`${resumo!.itensVencendoHoje} itens com prazo hoje`}
                  subtitle="Prazo de manutenção expirando"
                  icon={Clock}
                  color="#EF4444"
                  bgColor="#450A0A"
                  onPress={handleVerItensCriticos}
                />
              )}

              {(resumo?.inspecoesAtrasadas ?? 0) > 0 && (
                <AlertItem
                  title={`${resumo!.inspecoesAtrasadas} inspeções atrasadas`}
                  subtitle="Motoristas não enviaram no prazo"
                  icon={AlertTriangle}
                  color="#F59E0B"
                  bgColor="#422006"
                  onPress={handleVerMotoristas}
                />
              )}

              {(resumo?.itensCriticosPendentes ?? 0) > 0 && (
                <AlertItem
                  title={`${resumo!.itensCriticosPendentes} itens críticos pendentes`}
                  subtitle="Aguardando reenvio de fotos"
                  icon={XCircle}
                  color="#EF4444"
                  bgColor="#450A0A"
                  onPress={handleVerItensCriticos}
                />
              )}
            </View>
          )}

        {/* Inspeções Aguardando Análise */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ClipboardCheck size={18} color="#3B82F6" />
            <Text style={styles.sectionTitle}>Aguardando Análise</Text>
            {inspecoesPendentes.length > 0 && (
              <TouchableOpacity onPress={handleVerInspecoesPendentes}>
                <Text style={styles.sectionLink}>Ver todas</Text>
              </TouchableOpacity>
            )}
          </View>

          {inspecoesPendentes.length > 0 ? (
            <View style={styles.inspecoesList}>
              {inspecoesPendentes.slice(0, 5).map((inspecao) => (
                <InspecaoItem
                  key={inspecao.id}
                  inspecao={inspecao}
                  onPress={() => handleAbrirInspecao(inspecao)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <CheckCircle size={40} color="#22C55E" />
              <Text style={styles.emptyStateTitle}>Tudo em dia!</Text>
              <Text style={styles.emptyStateText}>
                Não há inspeções aguardando análise no momento.
              </Text>
            </View>
          )}
        </View>

        {/* Itens Críticos Recentes */}
        {itensCriticos.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <XCircle size={18} color="#EF4444" />
              <Text style={styles.sectionTitleDanger}>Itens Críticos</Text>
              <TouchableOpacity onPress={handleVerItensCriticos}>
                <Text style={styles.sectionLink}>Ver todos</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.criticosList}>
              {itensCriticos.slice(0, 3).map((item) => (
                <View key={item.id} style={styles.criticoItem}>
                  <View style={styles.criticoInfo}>
                    <Text style={styles.criticoNome}>{item.nomeExibicao}</Text>
                    <Text style={styles.criticoObs} numberOfLines={1}>
                      {item.observacaoAdmin || 'Sem observação'}
                    </Text>
                  </View>
                  {item.prazoManutencao && (
                    <View style={styles.criticoPrazo}>
                      <Clock size={12} color="#F59E0B" />
                      <Text style={styles.criticoPrazoText}>
                        {new Date(item.prazoManutencao).toLocaleDateString('pt-BR')}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Espaço inferior */}
        <View style={styles.bottomSpacer} />
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
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#172554',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  headerBadgeText: {
    fontSize: 12,
    color: '#3B82F6',
    marginLeft: 6,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  statTitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  statTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statTrendText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#E2E8F0',
    marginLeft: 8,
    flex: 1,
  },
  sectionTitleDanger: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    marginLeft: 8,
    flex: 1,
  },
  sectionLink: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '500',
  },

  // Alertas
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertContent: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  alertSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },

  // Lista de Inspeções
  inspecoesList: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    overflow: 'hidden',
  },
  inspecaoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  inspecaoInfo: {
    flex: 1,
  },
  inspecaoNome: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  inspecaoPlaca: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  inspecaoMeta: {
    alignItems: 'flex-end',
  },
  inspecaoStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  inspecaoStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  inspecaoData: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#1E293B',
    borderRadius: 12,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22C55E',
    marginTop: 12,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },

  // Lista de Críticos
  criticosList: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    overflow: 'hidden',
  },
  criticoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  criticoInfo: {
    flex: 1,
  },
  criticoNome: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F1F5F9',
  },
  criticoObs: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  criticoPrazo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#422006',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  criticoPrazoText: {
    fontSize: 11,
    color: '#F59E0B',
    marginLeft: 4,
    fontWeight: '500',
  },

  bottomSpacer: {
    height: 100,
  },
});
