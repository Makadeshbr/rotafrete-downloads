// src/components/expenses/WeeklyHistory.tsx
// ============================================
// Componente de Histórico Semanal Reutilizável
// ============================================

import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    LayoutAnimation,
    UIManager,
    Platform,
} from 'react-native';
import { format, startOfWeek, endOfWeek, subWeeks, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronDown, ChevronRight, Calendar, TrendingDown } from 'lucide-react-native';
import { formatarMoeda } from '@/constants';
import { Despesa } from '@/store/useDespesasStore';

// Habilita LayoutAnimation no Android
if (Platform.OS === 'android') {
    UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

interface WeeklyHistoryProps {
    despesas: Despesa[];
    tipo: 'COMBUSTIVEL' | 'PEDAGIO';
    renderItem: (item: Despesa) => React.ReactNode;
    weeksToShow?: number;
    accentColor?: string;
}

interface WeekData {
    weekNumber: number;
    startDate: Date;
    endDate: Date;
    items: Despesa[];
    total: number;
    isCurrentWeek: boolean;
}

export function WeeklyHistory({
    despesas,
    tipo,
    renderItem,
    weeksToShow = 8,
    accentColor = '#FF6B00',
}: WeeklyHistoryProps) {
    const [expandedWeek, setExpandedWeek] = useState<number | null>(0); // Primeira semana expandida por padrão

    // Gera as últimas N semanas
    const weeks = useMemo(() => {
        const hoje = new Date();
        const result: WeekData[] = [];

        for (let i = 0; i < weeksToShow; i++) {
            const refDate = subWeeks(hoje, i);
            const weekStart = startOfWeek(refDate, { weekStartsOn: 5 }); // Sexta
            const weekEnd = endOfWeek(refDate, { weekStartsOn: 5 });

            // Filtra despesas desta semana
            const weekItems = despesas.filter(d => {
                if (d.tipo !== tipo) return false;
                const dateStr = d.dataRegistro || d.data || d.createdAt;
                if (!dateStr) return false;
                try {
                    const itemDate = typeof dateStr === 'string' && dateStr.includes('T')
                        ? parseISO(dateStr)
                        : new Date(dateStr);
                    return isWithinInterval(itemDate, { start: weekStart, end: weekEnd });
                } catch {
                    return false;
                }
            }).sort((a, b) => {
                const dateA = a.dataRegistro || a.data || a.createdAt || '';
                const dateB = b.dataRegistro || b.data || b.createdAt || '';
                return new Date(dateB).getTime() - new Date(dateA).getTime();
            });

            result.push({
                weekNumber: i + 1,
                startDate: weekStart,
                endDate: weekEnd,
                items: weekItems,
                total: weekItems.reduce((sum, item) => sum + item.valor, 0),
                isCurrentWeek: i === 0,
            });
        }

        return result;
    }, [despesas, tipo, weeksToShow]);

    const toggleWeek = (index: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedWeek(expandedWeek === index ? null : index);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Calendar size={20} color="#94A3B8" />
                <Text style={styles.headerTitle}>Histórico Semanal</Text>
            </View>

            {weeks.map((week, index) => {
                const isExpanded = expandedWeek === index;
                const hasItems = week.items.length > 0;

                return (
                    <View key={index} style={styles.weekContainer}>
                        <TouchableOpacity
                            style={[
                                styles.weekHeader,
                                isExpanded && styles.weekHeaderExpanded,
                                week.isCurrentWeek && { borderLeftColor: accentColor, borderLeftWidth: 3 },
                            ]}
                            onPress={() => toggleWeek(index)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.weekHeaderLeft}>
                                {isExpanded ? (
                                    <ChevronDown size={20} color={accentColor} />
                                ) : (
                                    <ChevronRight size={20} color="#64748B" />
                                )}
                                <View style={styles.weekInfo}>
                                    <Text style={[styles.weekTitle, isExpanded && { color: '#FFFFFF' }]}>
                                        {week.isCurrentWeek ? 'Esta Semana' : `Semana ${week.weekNumber}`}
                                    </Text>
                                    <Text style={styles.weekDates}>
                                        {format(week.startDate, 'd MMM', { locale: ptBR })} - {format(week.endDate, 'd MMM', { locale: ptBR })}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.weekHeaderRight}>
                                <Text style={[styles.weekTotal, hasItems && { color: '#EF4444' }]}>
                                    {hasItems ? formatarMoeda(week.total) : 'R$ 0,00'}
                                </Text>
                                {hasItems && (
                                    <View style={styles.weekCount}>
                                        <Text style={styles.weekCountText}>{week.items.length}</Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>

                        {isExpanded && (
                            <View style={styles.weekContent}>
                                {week.items.length === 0 ? (
                                    <View style={styles.emptyWeek}>
                                        <Text style={styles.emptyWeekText}>Nenhum registro nesta semana</Text>
                                    </View>
                                ) : (
                                    week.items.map((item) => (
                                        <View key={item.id} style={styles.itemWrapper}>
                                            {renderItem(item)}
                                        </View>
                                    ))
                                )}
                            </View>
                        )}
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    weekContainer: {
        marginBottom: 8,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#1E293B',
    },
    weekHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#1E293B',
    },
    weekHeaderExpanded: {
        backgroundColor: '#1E293B',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    weekHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    weekInfo: {
        gap: 2,
    },
    weekTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#94A3B8',
    },
    weekDates: {
        fontSize: 12,
        color: '#64748B',
    },
    weekHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    weekTotal: {
        fontSize: 16,
        fontWeight: '700',
        color: '#64748B',
    },
    weekCount: {
        backgroundColor: '#334155',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 3,
        minWidth: 24,
        alignItems: 'center',
    },
    weekCountText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94A3B8',
    },
    weekContent: {
        padding: 12,
        paddingTop: 8,
        backgroundColor: '#0F172A',
    },
    emptyWeek: {
        padding: 16,
        alignItems: 'center',
    },
    emptyWeekText: {
        fontSize: 14,
        color: '#64748B',
        fontStyle: 'italic',
    },
    itemWrapper: {
        marginBottom: 8,
    },
});
