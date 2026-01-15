
// app/(tabs)/extrato.tsx
// ============================================
// ROTAFRETE - Extrato Mensal de Despesas
// ============================================
// Visão consolidada de todos os gastos do mês
// com navegação por semanas
// ============================================

import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    RefreshControl,
    Dimensions,
    Alert, // Added Alert
    ActivityIndicator, // Added ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import {
    Receipt,
    ChevronLeft,
    ChevronRight,
    Fuel,
    Wrench,
    CircleDollarSign,
    TrendingDown,
    Calendar,
    PieChart,
    DatabaseBackup,
    Trash2,
} from 'lucide-react-native';
import { format, startOfMonth, endOfMonth, addMonths, startOfWeek, endOfWeek, eachWeekOfInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';

import { useDespesasStore, useRotasStore, useResumoFinanceiroStore } from '@/store';
import { useAuth } from '@aether-baas/react-native';
import { formatarMoeda } from '@/constants';

const { width } = Dimensions.get('window');

// ============================================
// COMPONENTES AUXILIARES
// ============================================

// Card de categoria de despesa
function CategoryCard({
    label,
    value,
    percentage,
    icon: Icon,
    iconColor,
    bgColor,
}: {
    label: string;
    value: number;
    percentage: number;
    icon: React.FC<any>;
    iconColor: string;
    bgColor: string;
}) {
    return (
        <View style={[styles.categoryCard, { backgroundColor: bgColor }]}>
            <View style={styles.categoryCardHeader}>
                <Icon size={24} color={iconColor} />
                <Text style={styles.categoryCardLabel}>{label}</Text>
            </View>
            <Text style={[styles.categoryCardValue, { color: iconColor }]}>
                {formatarMoeda(value)}
            </Text>
            <View style={styles.categoryCardProgress}>
                <View
                    style={[
                        styles.categoryCardProgressBar,
                        { width: `${Math.min(percentage, 100)}%`, backgroundColor: iconColor }
                    ]}
                />
            </View>
            <Text style={styles.categoryCardPercentage}>{percentage.toFixed(0)}%</Text>
        </View>
    );
}

// Card de resumo da semana
function WeekSummaryCard({
    weekNumber,
    startDate,
    endDate,
    total,
    isCurrentWeek,
    isSelected,
    onPress,
}: {
    weekNumber: number;
    startDate: Date;
    endDate: Date;
    total: number;
    isCurrentWeek: boolean;
    isSelected?: boolean;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity
            style={[
                styles.weekCard,
                isCurrentWeek && styles.weekCardCurrent,
                isSelected && styles.weekCardSelected
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.weekCardLeft}>
                <Text style={[styles.weekCardNumber, isSelected && { color: '#FFFFFF' }]}>
                    Semana {weekNumber}
                </Text>
                <Text style={[styles.weekCardDates, isSelected && { color: 'rgba(255, 255, 255, 0.8)' }]}>
                    {format(startDate, 'd MMM', { locale: ptBR })} - {format(endDate, 'd MMM', { locale: ptBR })}
                </Text>
                {isCurrentWeek && !isSelected && (
                    <View style={styles.currentWeekBadge}>
                        <Text style={styles.currentWeekBadgeText}>Atual</Text>
                    </View>
                )}
                {isCurrentWeek && isSelected && (
                    <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 6, alignSelf: 'flex-start' }}>
                        <Text style={{ fontSize: 10, color: '#FFFFFF', fontWeight: '600' }}>Atual</Text>
                    </View>
                )}
            </View>
            <View style={styles.weekCardRight}>
                <Text style={[styles.weekCardTotal, isSelected && { color: '#FFFFFF' }]}>
                    {formatarMoeda(total)}
                </Text>
                <TrendingDown size={16} color={isSelected ? '#FFFFFF' : '#EF4444'} />
            </View>
        </TouchableOpacity>
    );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function ExpensesIndexScreen() {
    const router = useRouter();
    const { user } = useAuth();
    // [REALTIME] Adicionado lastUpdated para forçar re-render quando dados mudam
    const { despesas, fetchDespesasPorPeriodo, isLoading, lastUpdated, deletarDespesa } = useDespesasStore();
    const { rotas, fetchRotas } = useRotasStore();

    // Handler para deletar despesa com confirmação
    const handleDeleteDespesa = (despesa: any) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        Alert.alert(
            'Excluir Despesa',
            `Deseja excluir "${despesa.descricao || despesa.tipo}" (${formatarMoeda(despesa.valor)})?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deletarDespesa(despesa.id);
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        } catch (error) {
                            Alert.alert('Erro', 'Não foi possível excluir a despesa');
                        }
                    }
                }
            ]
        );
    };

    // [DEBUG] Verificar se lastUpdated está mudando
    React.useEffect(() => {
        console.log('[Expenses UI] ⚡ lastUpdated mudou para:', lastUpdated,
            'despesas:', despesas.length,
            'primeiro valor:', despesas[0]?.valor);
    }, [lastUpdated, despesas]);

    const [refreshing, setRefreshing] = useState(false);
    const [monthOffset, setMonthOffset] = useState(0);
    const [selectedWeekIndex, setSelectedWeekIndex] = useState<number | null>(null);

    // Data de referência baseada no offset
    const currentDate = monthOffset === 0 ? new Date() : addMonths(new Date(), monthOffset);
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);

    // Semanas do mês (Calculadas antes para usar no fetch)
    const weeksOfMonth = eachWeekOfInterval(
        { start: monthStart, end: monthEnd },
        { weekStartsOn: 5 }
    );

    // Ajusta o período de busca para cobrir TODAS as semanas completas (incluindo overlap com mes anterior/seguinte)
    const fetchStart = weeksOfMonth.length > 0 ? weeksOfMonth[0] : monthStart;
    const fetchEnd = weeksOfMonth.length > 0 ? endOfWeek(weeksOfMonth[weeksOfMonth.length - 1], { weekStartsOn: 5 }) : monthEnd;

    // Busca dados ao focar na tela
    useFocusEffect(
        useCallback(() => {
            if (user?.id) {
                // Busca período estendido
                fetchDespesasPorPeriodo(user.id, fetchStart, fetchEnd);
                fetchRotas(user.id);

                // Auto-selecionar a semana atual
                const today = new Date();
                const currentWeekIndex = weeksOfMonth.findIndex(weekStart => {
                    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 5 });
                    return today >= weekStart && today <= weekEnd;
                });

                if (currentWeekIndex !== -1) {
                    setSelectedWeekIndex(currentWeekIndex);
                } else {
                    setSelectedWeekIndex(null);
                }
            }
        }, [user?.id, monthOffset])
    );

    // ============================================
    // REALTIME SUBSCRIPTION
    // ============================================
    // ============================================
    // REALTIME SUBSCRIPTION
    // ============================================

    // 1. Hook de Estado (Top Level) - Verifica mudanças no resumo
    const resumoSemanal = useResumoFinanceiroStore((state: any) => state.resumoSemanal);

    React.useEffect(() => {
        if (!user?.id) return;

        // Subscribe Despesas
        const unsubDespesas = useDespesasStore.getState().subscribeToChanges(user.id);

        // Subscribe Rotas (Ganhos)
        const unsubRotas = useRotasStore.getState().subscribeToChanges(user.id);

        // Subscribe unificado (Global Watcher)
        const unsubResumo = useResumoFinanceiroStore.getState().subscribeToChanges(user.id);

        return () => {
            unsubDespesas();
            unsubRotas();
            unsubResumo();
        };
    }, [user?.id]);

    const handleMigration = async () => {
        if (!user?.id) return;

        Alert.alert(
            "Recuperar Dados Antigos",
            "Deseja importar abastecimentos e pedágios das versões anteriores?\n\n⚠️ Se já tentou antes e as datas ficaram erradas, isso irá LIMPAR os dados migrados incorretamente e reimportar corretamente.",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Sim, Recuperar",
                    onPress: async () => {
                        try {
                            // Primeiro limpa dados migrados anteriormente (para corrigir datas erradas)
                            const limpos = await useDespesasStore.getState().limparDadosMigrados(user.id);
                            console.log(`[EXTRATO] Limpos ${limpos} registros migrados anteriormente`);

                            // Agora migra novamente com as datas corretas
                            const total = await useDespesasStore.getState().migrarDadosLegados(user.id);

                            if (total > 0) {
                                Alert.alert("✅ Sucesso", `${total} registros antigos foram recuperados com as datas originais.`);
                                onRefresh();
                            } else if (limpos > 0) {
                                Alert.alert("⚠️ Aviso", "Os dados migrados incorretamente foram removidos, mas não encontramos novos dados nas collections antigas.");
                                onRefresh();
                            } else {
                                Alert.alert("Info", "Nenhum dado encontrado para importar.");
                            }
                        } catch (error: any) {
                            Alert.alert("❌ Erro", error?.message || "Falha na migração");
                        }
                    }
                }
            ]
        );
    };

    const onRefresh = async () => {
        setRefreshing(true);
        if (user?.id) {
            await Promise.all([
                fetchDespesasPorPeriodo(user.id, fetchStart, fetchEnd),
                fetchRotas(user.id)
            ]);
        }
        setRefreshing(false);
    };

    // [NOVO] Trigger de refresh baseado no Global Watcher
    // (Inserido aqui pois onRefresh já foi definido)
    React.useEffect(() => {
        if (user?.id) {
            console.log('[Extrato] 🔄 Resumo atualizado, recarregando listas...');
            onRefresh();
        }
    }, [resumoSemanal, user?.id]);

    // Determina o período de filtro (Mês inteiro ou Semana selecionada)
    const filterStart = selectedWeekIndex !== null ? weeksOfMonth[selectedWeekIndex] : monthStart;
    const filterEnd = selectedWeekIndex !== null ? endOfWeek(weeksOfMonth[selectedWeekIndex], { weekStartsOn: 5 }) : monthEnd;

    // Filtra despesas para exibição nos CARDS DE CATEGORIA
    const despesasFiltradas = despesas.filter(d => {
        const raws = [d.dataRegistro, d.data, d.createdAt].filter(Boolean);
        if (raws.length === 0) return false;

        try {
            const dDate = parseISO(raws[0] as string);
            // Normalizar data da despesa para evitar problemas de horas
            const dDateCheck = new Date(dDate.getFullYear(), dDate.getMonth(), dDate.getDate(), 12, 0, 0);

            // Normalizar filtros
            const startCheck = new Date(filterStart.getFullYear(), filterStart.getMonth(), filterStart.getDate(), 0, 0, 0);
            const endCheck = new Date(filterEnd.getFullYear(), filterEnd.getMonth(), filterEnd.getDate(), 23, 59, 59);

            return dDateCheck >= startCheck && dDateCheck <= endCheck;
        } catch {
            return false;
        }
    });

    // Calcula totais por categoria (baseado no filtro)
    const totalCombustivel = despesasFiltradas
        .filter(d => d.tipo === 'COMBUSTIVEL')
        .reduce((sum, d) => sum + d.valor, 0);

    const totalPedagio = despesasFiltradas
        .filter(d => d.tipo === 'PEDAGIO')
        .reduce((sum, d) => sum + d.valor, 0);

    const totalManutencao = despesasFiltradas
        .filter(d => d.tipo === 'MANUTENCAO')
        .reduce((sum, d) => sum + d.valor, 0);

    // [DEBUG] Verificar se o valor está chegando na UI
    console.log('[Expenses UI] despesas.length:', despesas.length,
        'filtradas.length:', despesasFiltradas.length,
        'totalManutencao:', totalManutencao,
        'valores:', despesasFiltradas.map(d => ({ tipo: d.tipo, valor: d.valor })));

    const totalOutros = despesasFiltradas
        .filter(d => d.tipo === 'OUTROS')
        .reduce((sum, d) => sum + d.valor, 0);

    const totalDespesas = totalCombustivel + totalPedagio + totalManutencao + totalOutros;

    // Percentuais
    const percCombustivel = totalDespesas > 0 ? (totalCombustivel / totalDespesas) * 100 : 0;
    const percPedagio = totalDespesas > 0 ? (totalPedagio / totalDespesas) * 100 : 0;
    const percManutencao = totalDespesas > 0 ? (totalManutencao / totalDespesas) * 100 : 0;

    // Ganhos do mês (de rotas) - TABÉM FILTRADO se selecionar semana
    const rotasFiltradas = rotas.filter(r => {
        const raws = [r.data, r.createdAt].filter(Boolean);
        if (raws.length === 0) return false;

        try {
            const rotaDate = parseISO(raws[0] as string);
            return rotaDate >= filterStart && rotaDate <= filterEnd;
        } catch {
            return false;
        }
    });
    const totalGanhos = rotasFiltradas.reduce((sum, r) => sum + r.valorFrete, 0);
    const lucroLiquido = totalGanhos - totalDespesas;

    // Calcular despesas por semana
    const despesasPorSemana = weeksOfMonth.map((weekStart, index) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 5 });
        const despesasDaSemana = despesas.filter(d => {
            const raws = [d.dataRegistro, d.data, d.createdAt].filter(Boolean);
            if (raws.length === 0) return false;

            try {
                const dDate = parseISO(raws[0] as string);
                return dDate >= weekStart && dDate <= weekEnd;
            } catch {
                return false;
            }
        });
        const total = despesasDaSemana.reduce((sum, d) => sum + d.valor, 0);
        const isCurrentWeek = new Date() >= weekStart && new Date() <= weekEnd;
        const isSelected = selectedWeekIndex === index;

        return {
            weekNumber: index + 1,
            startDate: weekStart,
            endDate: weekEnd,
            total,
            isCurrentWeek,
            isSelected
        };
    });

    const navegarMes = (direction: 'prev' | 'next') => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setMonthOffset(direction === 'prev' ? monthOffset - 1 : monthOffset + 1);
        setSelectedWeekIndex(null);
    };

    const handleSelectWeek = (index: number) => {
        Haptics.selectionAsync();
        if (selectedWeekIndex === index) {
            setSelectedWeekIndex(null); // Deselecionar se clicar no mesmo
        } else {
            setSelectedWeekIndex(index);
        }
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
                            tintColor="#EF4444"
                            colors={['#EF4444']}
                        />
                    }
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <Receipt size={28} color="#EF4444" />
                            <Text style={styles.title}>Extrato</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                                style={styles.migrateBtn}
                                onPress={handleMigration}
                                activeOpacity={0.7}
                            >
                                <DatabaseBackup size={16} color="#3B82F6" />
                                <Text style={styles.migrateText}>Recuperar</Text>
                            </TouchableOpacity>
                            <View style={styles.headerBadge}>
                                <PieChart size={14} color="#EF4444" />
                                <Text style={styles.headerBadgeText}>
                                    {selectedWeekIndex !== null ? 'Semanal' : 'Mensal'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Navegação de Mês */}
                    <View style={styles.monthNav}>
                        <TouchableOpacity onPress={() => navegarMes('prev')} style={styles.navButton}>
                            <ChevronLeft size={24} color="#94A3B8" />
                        </TouchableOpacity>

                        <View style={styles.monthInfo}>
                            <Text style={styles.monthText}>
                                {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
                            </Text>
                            {monthOffset === 0 && (
                                <View style={styles.currentBadge}>
                                    <Text style={styles.currentBadgeText}>Atual</Text>
                                </View>
                            )}
                        </View>

                        <TouchableOpacity
                            onPress={() => navegarMes('next')}
                            style={styles.navButton}
                            disabled={monthOffset >= 0}
                        >
                            <ChevronRight size={24} color={monthOffset >= 0 ? '#334155' : '#94A3B8'} />
                        </TouchableOpacity>
                    </View>

                    {/* Card de Resumo do Mês (ou Semana Selecionada) */}
                    <LinearGradient
                        colors={['#1E293B', '#0F172A']}
                        style={styles.summaryCard}
                    >
                        <View style={styles.summaryRow}>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>Ganhos</Text>
                                <Text style={styles.summaryValuePositive}>{formatarMoeda(totalGanhos)}</Text>
                            </View>
                            <View style={styles.summaryDivider} />
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>Despesas</Text>
                                <Text style={styles.summaryValueNegative}>{formatarMoeda(totalDespesas)}</Text>
                            </View>
                        </View>

                        <View style={styles.summaryHr} />

                        <View style={styles.liquidoContainer}>
                            <Text style={styles.liquidoLabel}>
                                Lucro Líquido {selectedWeekIndex !== null ? 'da Semana' : 'do Mês'}
                            </Text>
                            <Text style={[
                                styles.liquidoValue,
                                { color: lucroLiquido >= 0 ? '#22C55E' : '#EF4444' }
                            ]}>
                                {formatarMoeda(lucroLiquido)}
                            </Text>
                        </View>
                    </LinearGradient>

                    {/* Breakdown por Categoria (Filtrado) */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            Despesas por Categoria {selectedWeekIndex !== null ? '(Semana)' : '(Total)'}
                        </Text>
                        <View style={styles.categoriesGrid}>
                            <CategoryCard
                                label="Combustível"
                                value={totalCombustivel}
                                percentage={percCombustivel}
                                icon={Fuel}
                                iconColor="#F59E0B"
                                bgColor="rgba(245, 158, 11, 0.1)"
                            />
                            <CategoryCard
                                label="Pedágios"
                                value={totalPedagio}
                                percentage={percPedagio}
                                icon={CircleDollarSign}
                                iconColor="#3B82F6"
                                bgColor="rgba(59, 130, 246, 0.1)"
                            />
                            <CategoryCard
                                label="Manutenção"
                                value={totalManutencao}
                                percentage={percManutencao}
                                icon={Wrench}
                                iconColor="#EF4444"
                                bgColor="rgba(239, 68, 68, 0.1)"
                            />
                        </View>
                    </View>

                    {/* Semanas do Mês (Seletor) */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Selecionar Semana</Text>
                        {despesasPorSemana.map((week, index) => (
                            <WeekSummaryCard
                                key={week.weekNumber}
                                weekNumber={week.weekNumber}
                                startDate={week.startDate}
                                endDate={week.endDate}
                                total={week.total}
                                isCurrentWeek={week.isCurrentWeek}
                                isSelected={selectedWeekIndex === index}
                                onPress={() => handleSelectWeek(index)}
                            />
                        ))}
                    </View>

                    {/* Últimas Despesas (Filtradas) */}
                    {despesasFiltradas.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Registros no Período</Text>
                            {despesasFiltradas
                                .sort((a, b) => new Date(b.data || b.createdAt || '').getTime() - new Date(a.data || a.createdAt || '').getTime())
                                .slice(0, 10)
                                .map((despesa) => (
                                    <TouchableOpacity
                                        key={despesa.id}
                                        style={styles.despesaItem}
                                        onLongPress={() => handleDeleteDespesa(despesa)}
                                        delayLongPress={500}
                                        activeOpacity={0.8}
                                    >
                                        <View style={styles.despesaItemLeft}>
                                            {despesa.tipo === 'COMBUSTIVEL' && <Fuel size={18} color="#F59E0B" />}
                                            {despesa.tipo === 'PEDAGIO' && <CircleDollarSign size={18} color="#3B82F6" />}
                                            {despesa.tipo === 'MANUTENCAO' && <Wrench size={18} color="#EF4444" />}
                                            <View style={styles.despesaItemInfo}>
                                                <Text style={styles.despesaItemDesc}>{despesa.descricao || despesa.tipo}</Text>
                                                <Text style={styles.despesaItemDate}>
                                                    {format(new Date(despesa.dataRegistro || despesa.data || despesa.createdAt || ''), "d 'de' MMMM", { locale: ptBR })}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                            <Text style={styles.despesaItemValue}>{formatarMoeda(despesa.valor)}</Text>
                                            <TouchableOpacity
                                                onPress={() => handleDeleteDespesa(despesa)}
                                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                            >
                                                <Trash2 size={16} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                        </View>
                    )}

                    {/* Ações Rápidas */}
                    <View style={styles.actionsSection}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => router.push('/fuel')}
                        >
                            <Fuel size={20} color="#F59E0B" />
                            <Text style={styles.actionButtonText}>Novo Abastecimento</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => router.push('/tolls')}
                        >
                            <CircleDollarSign size={20} color="#3B82F6" />
                            <Text style={styles.actionButtonText}>Novo Pedágio</Text>
                        </TouchableOpacity>
                    </View>
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
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    headerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    headerBadgeText: {
        color: '#EF4444',
        fontSize: 12,
        fontWeight: '600',
    },
    monthNav: {
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
    monthInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    monthText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        textTransform: 'capitalize',
    },
    currentBadge: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    currentBadgeText: {
        fontSize: 11,
        color: '#EF4444',
        fontWeight: '600',
    },

    // Summary Card
    summaryCard: {
        borderRadius: 20,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
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

    // Sections
    section: {
        marginBottom: 24,
    },
    migrateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.3)',
    },
    migrateText: {
        color: '#3B82F6',
        fontSize: 12,
        fontWeight: '600',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 12,
    },

    // Categories Grid
    categoriesGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    categoryCard: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    categoryCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    categoryCardLabel: {
        fontSize: 12,
        color: '#94A3B8',
        flex: 1,
    },
    categoryCardValue: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    categoryCardProgress: {
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 4,
    },
    categoryCardProgressBar: {
        height: '100%',
        borderRadius: 2,
    },
    categoryCardPercentage: {
        fontSize: 11,
        color: '#64748B',
        textAlign: 'right',
    },

    // Week Cards
    weekCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1E293B',
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#334155',
    },
    weekCardSelected: {
        backgroundColor: '#FF6B00', // Laranja vibrante
        borderColor: '#FF6B00',
        borderWidth: 1,
    },
    weekCardCurrent: {
        borderColor: '#FF6B00',
        backgroundColor: 'rgba(255, 107, 0, 0.1)', // Laranja suave transparente
    },
    weekCardLeft: {
        flex: 1,
    },
    weekCardNumber: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    weekCardDates: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    currentWeekBadge: {
        backgroundColor: 'rgba(255, 107, 0, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 6,
        alignSelf: 'flex-start',
    },
    currentWeekBadgeText: {
        fontSize: 10,
        color: '#FF6B00',
        fontWeight: '600',
    },
    weekCardRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    weekCardTotal: {
        fontSize: 16,
        fontWeight: '700',
        color: '#EF4444', // Vermelho padrão para despesa
    },

    // Despesa Items
    despesaItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1E293B',
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
    },
    despesaItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    despesaItemInfo: {
        flex: 1,
        alignItems: 'center',
    },
    despesaItemDesc: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    despesaItemDate: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    despesaItemValue: {
        fontSize: 15,
        fontWeight: '700',
        color: '#EF4444',
    },

    // Actions
    actionsSection: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8, // Added gap based on context inference from previous styles
        backgroundColor: '#1E293B',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#334155',
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    }
});
