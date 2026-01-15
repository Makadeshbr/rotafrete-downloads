// src/components/ui/CalendarioPremium.tsx
// ============================================
// ROTAFRETE - Calendário Premium Inline
// ============================================
// Versão inline sem Modal (para uso dentro de outros modais)
// ============================================

import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
    ChevronLeft,
    ChevronRight,
    Calendar,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeOut,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CALENDAR_PADDING = 12;
const DAY_SIZE = (SCREEN_WIDTH - CALENDAR_PADDING * 4 - 48) / 7;

// Nomes em português
const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

interface CalendarioPremiumProps {
    value: Date;
    onChange: (date: Date) => void;
    minDate?: Date;
}

export function CalendarioPremium({
    value,
    onChange,
    minDate = new Date(),
}: CalendarioPremiumProps) {
    const [expanded, setExpanded] = useState(false);
    const [mesAtual, setMesAtual] = useState(value.getMonth());
    const [anoAtual, setAnoAtual] = useState(value.getFullYear());

    // Gera dias do mês
    const diasDoMes = useMemo(() => {
        const primeiroDia = new Date(anoAtual, mesAtual, 1);
        const ultimoDia = new Date(anoAtual, mesAtual + 1, 0);
        const diasNoMes = ultimoDia.getDate();
        const diaSemanaInicio = primeiroDia.getDay();

        const dias: (number | null)[] = [];
        for (let i = 0; i < diaSemanaInicio; i++) dias.push(null);
        for (let i = 1; i <= diasNoMes; i++) dias.push(i);
        return dias;
    }, [mesAtual, anoAtual]);

    const isDiaPassado = useCallback((dia: number) => {
        const data = new Date(anoAtual, mesAtual, dia);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        return data < hoje;
    }, [mesAtual, anoAtual]);

    const isDiaSelecionado = useCallback((dia: number) => {
        return (
            value.getDate() === dia &&
            value.getMonth() === mesAtual &&
            value.getFullYear() === anoAtual
        );
    }, [value, mesAtual, anoAtual]);

    const isHoje = useCallback((dia: number) => {
        const hoje = new Date();
        return (
            hoje.getDate() === dia &&
            hoje.getMonth() === mesAtual &&
            hoje.getFullYear() === anoAtual
        );
    }, [mesAtual, anoAtual]);

    const selecionarDia = (dia: number) => {
        if (isDiaPassado(dia)) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const novaData = new Date(anoAtual, mesAtual, dia);
        onChange(novaData);
        setExpanded(false);
    };

    const formatarData = (data: Date) => {
        return data.toLocaleDateString('pt-BR', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
        });
    };

    return (
        <View style={styles.container}>
            {/* Trigger Button */}
            <TouchableOpacity
                style={styles.trigger}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setExpanded(!expanded);
                }}
                activeOpacity={0.8}
            >
                <View style={styles.triggerContent}>
                    <Calendar size={20} color="#3B82F6" />
                    <Text style={styles.triggerText}>{formatarData(value)}</Text>
                    <View style={[styles.chevron, expanded && styles.chevronExpanded]}>
                        <ChevronRight size={18} color="#64748B" />
                    </View>
                </View>
            </TouchableOpacity>

            {/* Expanded Calendar */}
            {expanded && (
                <Animated.View
                    entering={FadeIn.duration(200)}
                    exiting={FadeOut.duration(150)}
                    style={styles.calendarContainer}
                >
                    {/* Month Navigation */}
                    <View style={styles.monthNav}>
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                if (mesAtual === 0) {
                                    setMesAtual(11);
                                    setAnoAtual(anoAtual - 1);
                                } else {
                                    setMesAtual(mesAtual - 1);
                                }
                            }}
                            style={styles.navButton}
                        >
                            <ChevronLeft size={20} color="#3B82F6" />
                        </TouchableOpacity>

                        <Text style={styles.monthText}>
                            {MESES[mesAtual]} {anoAtual}
                        </Text>

                        <TouchableOpacity
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                if (mesAtual === 11) {
                                    setMesAtual(0);
                                    setAnoAtual(anoAtual + 1);
                                } else {
                                    setMesAtual(mesAtual + 1);
                                }
                            }}
                            style={styles.navButton}
                        >
                            <ChevronRight size={20} color="#3B82F6" />
                        </TouchableOpacity>
                    </View>

                    {/* Weekday Headers */}
                    <View style={styles.weekdayRow}>
                        {DIAS_SEMANA.map((dia, index) => (
                            <View key={`${dia}-${index}`} style={styles.weekdayCell}>
                                <Text style={[
                                    styles.weekdayText,
                                    index === 0 && styles.weekdaySunday,
                                ]}>
                                    {dia}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* Days Grid */}
                    <View style={styles.daysGrid}>
                        {diasDoMes.map((dia, index) => (
                            <View key={index} style={styles.dayCell}>
                                {dia !== null ? (
                                    <TouchableOpacity
                                        onPress={() => selecionarDia(dia)}
                                        disabled={isDiaPassado(dia)}
                                        style={[
                                            styles.dayButton,
                                            isDiaSelecionado(dia) && styles.dayButtonSelected,
                                            isHoje(dia) && !isDiaSelecionado(dia) && styles.dayButtonToday,
                                            isDiaPassado(dia) && styles.dayButtonDisabled,
                                        ]}
                                        activeOpacity={0.7}
                                    >
                                        {isDiaSelecionado(dia) ? (
                                            <LinearGradient
                                                colors={['#3B82F6', '#1D4ED8']}
                                                style={styles.dayButtonGradient}
                                            >
                                                <Text style={styles.dayTextSelected}>{dia}</Text>
                                            </LinearGradient>
                                        ) : (
                                            <Text style={[
                                                styles.dayText,
                                                isHoje(dia) && styles.dayTextToday,
                                                isDiaPassado(dia) && styles.dayTextDisabled,
                                            ]}>
                                                {dia}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        ))}
                    </View>

                    {/* Quick Actions */}
                    <View style={styles.quickActions}>
                        <TouchableOpacity
                            style={styles.quickButton}
                            onPress={() => {
                                const hoje = new Date();
                                onChange(hoje);
                                setMesAtual(hoje.getMonth());
                                setAnoAtual(hoje.getFullYear());
                                setExpanded(false);
                            }}
                        >
                            <Text style={styles.quickButtonText}>Hoje</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.quickButton}
                            onPress={() => {
                                const amanha = new Date();
                                amanha.setDate(amanha.getDate() + 1);
                                onChange(amanha);
                                setExpanded(false);
                            }}
                        >
                            <Text style={styles.quickButtonText}>Amanhã</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.quickButton}
                            onPress={() => {
                                const proxSemana = new Date();
                                proxSemana.setDate(proxSemana.getDate() + 7);
                                onChange(proxSemana);
                                setExpanded(false);
                            }}
                        >
                            <Text style={styles.quickButtonText}>+7 dias</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        overflow: 'visible',
    },
    trigger: {
        backgroundColor: '#1E293B',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.3)',
        overflow: 'hidden',
    },
    triggerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        gap: 12,
    },
    triggerText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: '#F1F5F9',
        textTransform: 'capitalize',
    },
    chevron: {
        transform: [{ rotate: '90deg' }],
    },
    chevronExpanded: {
        transform: [{ rotate: '-90deg' }],
    },
    calendarContainer: {
        marginTop: 8,
        backgroundColor: '#1E293B',
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    monthNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    navButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F1F5F9',
    },
    weekdayRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    weekdayCell: {
        width: DAY_SIZE,
        alignItems: 'center',
    },
    weekdayText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
    },
    weekdaySunday: {
        color: '#EF4444',
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: DAY_SIZE,
        height: DAY_SIZE,
        padding: 2,
    },
    dayButton: {
        flex: 1,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(51, 65, 85, 0.5)',
    },
    dayButtonSelected: {
        backgroundColor: 'transparent',
    },
    dayButtonToday: {
        borderWidth: 2,
        borderColor: '#3B82F6',
        backgroundColor: 'transparent',
    },
    dayButtonDisabled: {
        backgroundColor: 'transparent',
    },
    dayButtonGradient: {
        flex: 1,
        width: '100%',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#CBD5E1',
    },
    dayTextSelected: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFF',
    },
    dayTextToday: {
        color: '#3B82F6',
        fontWeight: '700',
    },
    dayTextDisabled: {
        color: '#475569',
    },
    quickActions: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 8,
    },
    quickButton: {
        flex: 1,
        padding: 10,
        borderRadius: 8,
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        alignItems: 'center',
    },
    quickButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#3B82F6',
    },
});

export default CalendarioPremium;
