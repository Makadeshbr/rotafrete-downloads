// app/(tabs)/history.tsx
// ============================================
// ROTAFRETE - Tela de Histórico Financeiro
// ============================================
// Mostra ganhos e despesas da semana com
// breakdown por categoria
// ============================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Fuel,
  Wrench,
  CircleDollarSign,
  MapPin,
  Sun,
  Moon,
  DollarSign,
} from 'lucide-react-native';
import { format, startOfWeek, endOfWeek, addWeeks, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';

import { Card, CardContent } from '@/components/ui';
import { useRotasStore, useDespesasStore } from '@/store';
import { useAuth } from '@aether-baas/react-native';
import { formatarMoeda } from '@/constants';

const { width } = Dimensions.get('window');

// ============================================
// COMPONENTES AUXILIARES
// ============================================

// Card de estatística
function StatCard({
  label,
  value,
  icon: Icon,
  iconColor,
  trend,
}: {
  label: string;
  value: string;
  icon: React.FC<any>;
  iconColor: string;
  trend?: 'up' | 'down' | null;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${iconColor}15` }]}>
        <Icon size={20} color={iconColor} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueRow}>
        <Text style={styles.statValue}>{value}</Text>
        {trend && (
          <View style={[styles.trendBadge, trend === 'up' ? styles.trendUp : styles.trendDown]}>
            {trend === 'up' ? (
              <TrendingUp size={12} color="#22C55E" />
            ) : (
              <TrendingDown size={12} color="#EF4444" />
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// Card de despesa por categoria
function ExpenseCard({
  label,
  value,
  icon: Icon,
  iconColor,
  bgColor,
}: {
  label: string;
  value: number;
  icon: React.FC<any>;
  iconColor: string;
  bgColor: string;
}) {
  return (
    <View style={[styles.expenseCard, { backgroundColor: bgColor }]}>
      <Icon size={18} color={iconColor} />
      <View style={styles.expenseCardInfo}>
        <Text style={styles.expenseCardLabel}>{label}</Text>
        <Text style={[styles.expenseCardValue, { color: iconColor }]}>
          {formatarMoeda(value)}
        </Text>
      </View>
    </View>
  );
}

// Card de dia na semana
function DayCard({
  date,
  rotas,
  totalFrete,
  totalKm,
  isToday,
  isSelected,
  onPress,
}: {
  date: Date;
  rotas: number;
  totalFrete: number;
  totalKm: number;
  isToday: boolean;
  isSelected: boolean;
  onPress: () => void;
}) {
  const dayName = format(date, 'EEE', { locale: ptBR });
  const dayNumber = format(date, 'd');
  const hasData = rotas > 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.dayCard,
        isToday && styles.dayCardToday,
        isSelected && styles.dayCardSelected,
        !hasData && styles.dayCardEmpty
      ]}
    >
      <Text style={[styles.dayName, isToday && styles.dayNameToday, isSelected && styles.dayNameToday]}>{dayName}</Text>
      <Text style={[styles.dayNumber, isToday && styles.dayNumberToday, isSelected && styles.dayNumberToday]}>{dayNumber}</Text>
      {hasData ? (
        <>
          <Text style={styles.dayValue}>{formatarMoeda(totalFrete)}</Text>
          <Text style={styles.dayKm}>{totalKm}km</Text>
        </>
      ) : (
        <Text style={styles.dayEmpty}>-</Text>
      )}
    </TouchableOpacity>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function HistoryScreen() {
  const { user } = useAuth();
  const { rotas, fetchRotas, isLoading: isLoadingRotas } = useRotasStore();
  const { despesas, fetchDespesasSemana, isLoading: isLoadingDespesas } = useDespesasStore();

  const [refreshing, setRefreshing] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Data de referência baseada no offset
  const currentDate = weekOffset === 0 ? new Date() : addWeeks(new Date(), weekOffset);

  // Semana: Sexta a Quinta
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 5 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 5 });
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Busca dados ao focar na tela
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchRotas(user.id);
        fetchDespesasSemana(user.id, currentDate);
      }
    }, [user?.id, weekOffset])
  );

  // ============================================
  // REALTIME SUBSCRIPTION
  // ============================================
  React.useEffect(() => {
    if (!user?.id) return;

    const unsubscribeDespesas = useDespesasStore.getState().subscribeToChanges(user.id);
    const unsubscribeRotas = useRotasStore.getState().subscribeToChanges(user.id);

    return () => {
      unsubscribeDespesas();
      unsubscribeRotas();
    };
  }, [user?.id]);


  const onRefresh = async () => {
    setRefreshing(true);
    if (user?.id) {
      await Promise.all([
        fetchRotas(user.id),
        fetchDespesasSemana(user.id, currentDate)
      ]);
    }
    setRefreshing(false);
  };

  // Helper para obter data da rota
  const getRotaDate = (rota: typeof rotas[0]): Date => {
    try {
      if (rota.data && typeof rota.data === 'string') {
        return parseISO(rota.data);
      } else if (rota.createdAt && typeof rota.createdAt === 'string') {
        return parseISO(rota.createdAt);
      }
    } catch (e) {
      console.warn('[Histórico] Erro ao parsear data:', e);
    }
    return new Date();
  };

  // Filtra rotas da semana
  const weekStartNorm = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
  const weekEndNorm = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate(), 23, 59, 59);

  const rotasDaSemana = rotas.filter(rota => {
    const rotaDate = getRotaDate(rota);
    const rotaDateNorm = new Date(rotaDate.getFullYear(), rotaDate.getMonth(), rotaDate.getDate());
    return rotaDateNorm >= weekStartNorm && rotaDateNorm <= weekEndNorm;
  });

  // [REAL-TIME FIX] Calcula despesas localmente para garantir reatividade
  // Filtra despesas da semana selecionada
  const despesasDaSemana = despesas.filter(d => {
    // Tenta obter data válida de qualquer campo disponível
    const raws = [d.dataRegistro, d.data, d.createdAt, new Date().toISOString()].filter(Boolean);
    const validDateStr = raws[0] as string;

    // Garante parse correto (safeguard para datas inválidas)
    let dDate: Date;
    try {
      dDate = parseISO(validDateStr);
    } catch {
      dDate = new Date();
    }

    // Normaliza para comparação (zera horas)
    const dDateNorm = new Date(dDate.getFullYear(), dDate.getMonth(), dDate.getDate());

    return dDateNorm >= weekStartNorm && dDateNorm <= weekEndNorm;
  });

  // Calcula totais
  const totalBruto = rotasDaSemana.reduce((sum, r) => sum + r.valorFrete, 0);
  const totalKm = rotasDaSemana.reduce((sum, r) => sum + r.kmRodados, 0);

  // Totais de despesas (Calculados on-the-fly)
  const totalDespesas = despesasDaSemana.reduce((sum, d) => sum + d.valor, 0);
  const despesaCombustivel = despesasDaSemana.filter(d => d.tipo === 'COMBUSTIVEL').reduce((sum, d) => sum + d.valor, 0);
  const despesaPedagio = despesasDaSemana.filter(d => d.tipo === 'PEDAGIO').reduce((sum, d) => sum + d.valor, 0);
  const despesaManutencao = despesasDaSemana.filter(d => d.tipo === 'MANUTENCAO').reduce((sum, d) => sum + d.valor, 0);

  // Lucro líquido
  const lucroLiquido = totalBruto - totalDespesas;

  // Dias trabalhados
  const getRotaDayKey = (rota: typeof rotas[0]): string => {
    if (rota.data) return rota.data;
    if (rota.createdAt && typeof rota.createdAt === 'string') {
      return rota.createdAt.split('T')[0];
    }
    return 'sem-data';
  };

  const diasTrabalhados = new Set(rotasDaSemana.map(r => getRotaDayKey(r))).size;
  const mediaDiaria = diasTrabalhados > 0 ? lucroLiquido / diasTrabalhados : 0;

  // Agrupa rotas por dia
  const rotasPorDia = new Map<string, typeof rotas>();
  rotasDaSemana.forEach(rota => {
    const dayKey = getRotaDayKey(rota);
    const existing = rotasPorDia.get(dayKey) || [];
    rotasPorDia.set(dayKey, [...existing, rota]);
  });

  const navegarSemana = (direction: 'prev' | 'next') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWeekOffset(direction === 'prev' ? weekOffset - 1 : weekOffset + 1);
  };

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
              tintColor="#FF6B00"
              colors={['#FF6B00']}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Histórico</Text>
            <View style={styles.headerBadge}>
              <Calendar size={16} color="#FF6B00" />
              <Text style={styles.headerBadgeText}>Semanal</Text>
            </View>
          </View>

          {/* Navegação de Semana */}
          <View style={styles.weekNav}>
            <TouchableOpacity onPress={() => navegarSemana('prev')} style={styles.navButton}>
              <ChevronLeft size={24} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.weekInfo}>
              <Text style={styles.weekText}>
                {format(weekStart, "d MMM", { locale: ptBR })} - {format(weekEnd, "d MMM", { locale: ptBR })}
              </Text>
              {weekOffset === 0 && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>Atual</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={() => navegarSemana('next')}
              style={styles.navButton}
              disabled={weekOffset >= 0}
            >
              <ChevronRight size={24} color={weekOffset >= 0 ? '#334155' : '#94A3B8'} />
            </TouchableOpacity>
          </View>

          {/* Card Principal - Resumo Financeiro */}
          <Card style={styles.summaryCard}>
            <CardContent style={styles.summaryContent}>
              {/* Ganhos */}
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Ganhos Brutos</Text>
                  <Text style={styles.summaryValuePositive}>{formatarMoeda(totalBruto)}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Despesas</Text>
                  <Text style={styles.summaryValueNegative}>-{formatarMoeda(totalDespesas)}</Text>
                </View>
              </View>

              {/* Linha divisória */}
              <View style={styles.summaryHr} />

              {/* Lucro Líquido */}
              <View style={styles.liquidoContainer}>
                <Text style={styles.liquidoLabel}>Lucro Líquido da Semana</Text>
                <Text style={[
                  styles.liquidoValue,
                  { color: lucroLiquido >= 0 ? '#22C55E' : '#EF4444' }
                ]}>
                  {formatarMoeda(lucroLiquido)}
                </Text>
              </View>

              {/* Info adicional */}
              <View style={styles.summaryFooter}>
                <Text style={styles.summaryFooterText}>
                  {diasTrabalhados} dias • {totalKm} km • Média: {formatarMoeda(mediaDiaria)}/dia
                </Text>
              </View>
            </CardContent>
          </Card>

          {/* Breakdown de Despesas */}
          {totalDespesas > 0 && (
            <View style={styles.expensesSection}>
              <Text style={styles.sectionTitle}>Despesas da Semana</Text>
              <View style={styles.expensesGrid}>
                <ExpenseCard
                  label="Combustível"
                  value={despesaCombustivel}
                  icon={Fuel}
                  iconColor="#F59E0B"
                  bgColor="rgba(245, 158, 11, 0.1)"
                />
                <ExpenseCard
                  label="Pedágios"
                  value={despesaPedagio}
                  icon={CircleDollarSign}
                  iconColor="#3B82F6"
                  bgColor="rgba(59, 130, 246, 0.1)"
                />
                <ExpenseCard
                  label="Manutenção"
                  value={despesaManutencao}
                  icon={Wrench}
                  iconColor="#EF4444"
                  bgColor="rgba(239, 68, 68, 0.1)"
                />
              </View>
            </View>
          )}

          {/* Estatísticas Rápidas */}
          <View style={styles.statsGrid}>
            <StatCard
              label="Média/dia"
              value={formatarMoeda(mediaDiaria)}
              icon={TrendingUp}
              iconColor="#22C55E"
            />
            <StatCard
              label="Total KM"
              value={`${totalKm}`}
              icon={MapPin}
              iconColor="#3B82F6"
            />
            <StatCard
              label="Rotas"
              value={`${rotasDaSemana.length}`}
              icon={Calendar}
              iconColor="#A855F7"
            />
            <StatCard
              label="Dias"
              value={`${diasTrabalhados}/6`}
              icon={Sun}
              iconColor="#F59E0B"
            />
          </View>

          {/* Calendário da Semana */}
          <View style={styles.weekCalendar}>
            <Text style={styles.sectionTitle}>Por Dia</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.daysContainer}
            >
              {daysOfWeek.map((day, index) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const dayRotas = rotasPorDia.get(dayStr) || [];
                const dayTotal = dayRotas.reduce((sum, r) => sum + r.valorFrete, 0);
                const dayKm = dayRotas.reduce((sum, r) => sum + r.kmRodados, 0);
                const isToday = isSameDay(day, new Date());

                return (
                  <DayCard
                    key={index}
                    date={day}
                    rotas={dayRotas.length}
                    totalFrete={dayTotal}
                    totalKm={dayKm}
                    isToday={isToday}
                    isSelected={selectedDay ? isSameDay(day, selectedDay) : false}
                    onPress={() => setSelectedDay(isSameDay(day, selectedDay ?? new Date(0)) ? null : day)}
                  />
                );
              })}
            </ScrollView>
          </View>

          {/* Lista de Rotas */}
          {rotasDaSemana.length > 0 && (
            <View style={styles.rotasSection}>
              <Text style={styles.sectionTitle}>Rotas da Semana</Text>
              {rotasDaSemana
                .sort((a, b) => {
                  const dateA = a.data || a.createdAt || '';
                  const dateB = b.data || b.createdAt || '';
                  return new Date(dateB).getTime() - new Date(dateA).getTime();
                })
                .slice(0, 10) // Limita a 10 mais recentes
                .map((rota) => {
                  const rotaDateStr = rota.data || rota.createdAt || new Date().toISOString();
                  const rotaDate = parseISO(rotaDateStr);

                  return (
                    <View key={rota.id} style={styles.rotaItem}>
                      <View style={styles.rotaItemLeft}>
                        <View style={styles.rotaItemDate}>
                          <Text style={styles.rotaItemDay}>
                            {format(rotaDate, 'EEE', { locale: ptBR })}
                          </Text>
                          <Text style={styles.rotaItemDateNum}>
                            {format(rotaDate, 'd/MM')}
                          </Text>
                        </View>
                        <View style={styles.rotaItemTurno}>
                          {rota.turno === 'AM' ? (
                            <Sun size={14} color="#F59E0B" />
                          ) : (
                            <Moon size={14} color="#8B5CF6" />
                          )}
                        </View>
                      </View>
                      <View style={styles.rotaItemRight}>
                        <Text style={styles.rotaItemFrete}>
                          {formatarMoeda(rota.valorFrete)}
                        </Text>
                        <Text style={styles.rotaItemKm}>{rota.kmRodados} km</Text>
                      </View>
                    </View>
                  );
                })}
            </View>
          )}

          {/* Empty state */}
          {rotasDaSemana.length === 0 && (
            <View style={styles.emptyState}>
              <Calendar size={48} color="#334155" />
              <Text style={styles.emptyTitle}>Nenhuma rota registrada</Text>
              <Text style={styles.emptySubtitle}>
                As rotas desta semana aparecerão aqui
              </Text>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  headerBadgeText: {
    color: '#FF6B00',
    fontSize: 12,
    fontWeight: '600',
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weekText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  currentBadge: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  currentBadgeText: {
    fontSize: 11,
    color: '#FF6B00',
    fontWeight: '600',
  },

  // Summary Card
  summaryCard: {
    marginBottom: 20,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  summaryContent: {
    padding: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#334155',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 6,
  },
  summaryValuePositive: {
    fontSize: 22,
    fontWeight: '700',
    color: '#22C55E',
  },
  summaryValueNegative: {
    fontSize: 22,
    fontWeight: '700',
    color: '#EF4444',
  },
  summaryHr: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 16,
  },
  liquidoContainer: {
    alignItems: 'center',
  },
  liquidoLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
  },
  liquidoValue: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  summaryFooter: {
    marginTop: 12,
    alignItems: 'center',
  },
  summaryFooterText: {
    fontSize: 13,
    color: '#64748B',
  },

  // Expenses Section
  expensesSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  expensesGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  expenseCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  expenseCardInfo: {
    flex: 1,
  },
  expenseCardLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  expenseCardValue: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: (width - 52) / 2,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  trendBadge: {
    width: 20,
    height: 20,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendUp: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  trendDown: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },

  // Week Calendar
  weekCalendar: {
    marginBottom: 24,
  },
  daysContainer: {
    gap: 10,
    paddingRight: 20,
  },
  dayCard: {
    width: 80,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  dayCardToday: {
    borderColor: '#FF6B00',
    backgroundColor: 'rgba(255, 107, 0, 0.08)',
  },
  dayCardEmpty: {
    opacity: 0.6,
  },
  dayCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  dayName: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  dayNameToday: {
    color: '#FF6B00',
  },
  dayNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  dayNumberToday: {
    color: '#FF6B00',
  },
  dayValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22C55E',
    marginBottom: 2,
  },
  dayKm: {
    fontSize: 10,
    color: '#64748B',
  },
  dayEmpty: {
    fontSize: 14,
    color: '#475569',
    marginTop: 8,
  },

  // Rotas Section
  rotasSection: {
    marginBottom: 24,
  },
  rotaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  rotaItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rotaItemDate: {
    alignItems: 'center',
  },
  rotaItemDay: {
    fontSize: 11,
    color: '#64748B',
    textTransform: 'capitalize',
  },
  rotaItemDateNum: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rotaItemTurno: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotaItemRight: {
    alignItems: 'flex-end',
  },
  rotaItemFrete: {
    fontSize: 16,
    fontWeight: '700',
    color: '#22C55E',
  },
  rotaItemKm: {
    fontSize: 12,
    color: '#64748B',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
});
