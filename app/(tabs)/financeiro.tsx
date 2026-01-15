// app/(tabs)/financeiro.tsx
// ============================================
// ROTAFRETE - Tela Financeira Unificada (NOVO)
// ============================================
// Consolida: History + Expenses + Export
// em uma única tela com navegação por abas.
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert,
    Share,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';
import {
    ChevronLeft,
    ChevronRight,
    Calendar,
    TrendingUp,
    TrendingDown,
    Fuel,
    CircleDollarSign,
    FileText,
    Download,
    MapPin,
    Clock,
    Sun,
    Moon,
    Filter,
    Trash2,
} from 'lucide-react-native';
import * as Sharing from 'expo-sharing'; // Import Sharing

import { generateExtractPDFLocal } from '@/services/pdf-generator'; // Import generator

import { useAuth } from '@aether-baas/react-native';
import { Card } from '@/components/ui';
import {
    useRotasStore,
    useDespesasStore,
    useResumoFinanceiroStore,
} from '@/store';
import { formatarMoeda, type Turno } from '@/constants/pricing';

// ============================================
// TIPOS
// ============================================

type AbaAtiva = 'resumo' | 'despesas' | 'rotas' | 'exportar';

interface SemanaNavegacao {
    inicio: Date;
    fim: Date;
    label: string;
    isAtual: boolean;
}

// ============================================
// CONSTANTES
// ============================================

const CORES = {
    FUNDO: '#0F172A',
    CARD: '#1E293B',
    BORDA: '#334155',
    TEXTO_PRIMARIO: '#FFFFFF',
    TEXTO_SECUNDARIO: '#94A3B8',
    TEXTO_MUTED: '#64748B',
    SUCESSO: '#22C55E',
    PERIGO: '#EF4444',
    INFO: '#3B82F6',
    AVISO: '#F59E0B',
    PRIMARIO: '#FF6B00',
};

// ============================================
// HELPER: Calcular semana de trabalho (Sex-Qui)
// ============================================

function calcularSemanaTrabalho(dataReferencia: Date): SemanaNavegacao {
    // Semana de trabalho: Sexta (5) a Quinta (4)
    const inicio = startOfWeek(dataReferencia, { weekStartsOn: 5 });
    const fim = endOfWeek(dataReferencia, { weekStartsOn: 5 });

    const hoje = new Date();
    const inicioAtual = startOfWeek(hoje, { weekStartsOn: 5 });
    const isAtual = inicio.getTime() === inicioAtual.getTime();

    const label = `${format(inicio, "d MMM", { locale: ptBR })} - ${format(fim, "d MMM", { locale: ptBR })}`;

    return { inicio, fim, label, isAtual };
}

// ============================================
// COMPONENTE: Navegador de Semana
// ============================================

function SemanaNavigator({
    semana,
    onAnterior,
    onProxima,
}: {
    semana: SemanaNavegacao;
    onAnterior: () => void;
    onProxima: () => void;
}) {
    const handleAnterior = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onAnterior();
    };

    const handleProxima = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onProxima();
    };

    return (
        <View style={styles.semanaNav}>
            <TouchableOpacity
                style={styles.semanaNavBtn}
                onPress={handleAnterior}
            >
                <ChevronLeft size={24} color={CORES.TEXTO_SECUNDARIO} />
            </TouchableOpacity>

            <View style={styles.semanaNavCenter}>
                <Calendar size={16} color={CORES.INFO} />
                <Text style={styles.semanaNavLabel}>{semana.label}</Text>
                {semana.isAtual && (
                    <View style={styles.badgeAtual}>
                        <Text style={styles.badgeAtualTexto}>Atual</Text>
                    </View>
                )}
            </View>

            <TouchableOpacity
                style={[styles.semanaNavBtn, semana.isAtual && styles.semanaNavBtnDisabled]}
                onPress={handleProxima}
                disabled={semana.isAtual}
            >
                <ChevronRight
                    size={24}
                    color={semana.isAtual ? CORES.BORDA : CORES.TEXTO_SECUNDARIO}
                />
            </TouchableOpacity>
        </View>
    );
}

// ============================================
// COMPONENTE: Seletor de Abas
// ============================================

function AbaSeletor({
    abaAtiva,
    onChange,
}: {
    abaAtiva: AbaAtiva;
    onChange: (aba: AbaAtiva) => void;
}) {
    const abas: { id: AbaAtiva; label: string; icon: typeof TrendingUp }[] = [
        { id: 'resumo', label: 'Resumo', icon: TrendingUp },
        { id: 'despesas', label: 'Despesas', icon: CircleDollarSign },
        { id: 'rotas', label: 'Rotas', icon: MapPin },
        { id: 'exportar', label: 'PDF', icon: FileText },
    ];

    const handleChange = (aba: AbaAtiva) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onChange(aba);
    };

    return (
        <View style={styles.abaContainer}>
            {abas.map((aba) => {
                const Icon = aba.icon;
                const isAtiva = abaAtiva === aba.id;

                return (
                    <TouchableOpacity
                        key={aba.id}
                        style={[styles.abaBtn, isAtiva && styles.abaBtnAtiva]}
                        onPress={() => handleChange(aba.id)}
                    >
                        <Icon
                            size={16}
                            color={isAtiva ? CORES.PRIMARIO : CORES.TEXTO_MUTED}
                        />
                        <Text
                            style={[
                                styles.abaLabel,
                                isAtiva && styles.abaLabelAtiva,
                            ]}
                        >
                            {aba.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

// ============================================
// COMPONENTE: Card de Resumo Financeiro
// ============================================

function ResumoFinanceiroCards({
    totalBruto,
    totalDespesas,
    totalLiquido,
    totalKm,
    totalRotas,
    diasTrabalhados,
}: {
    totalBruto: number;
    totalDespesas: number;
    totalLiquido: number;
    totalKm: number;
    totalRotas: number;
    diasTrabalhados: number;
}) {
    const percentualDespesas = totalBruto > 0
        ? (totalDespesas / totalBruto) * 100
        : 0;

    const lucroPositivo = totalLiquido >= 0;

    return (
        <View style={styles.resumoContainer}>
            {/* Cards de valores */}
            <View style={styles.resumoRow}>
                <View style={[styles.resumoCard, styles.resumoCardBruto]}>
                    <Text style={styles.resumoCardLabel}>Bruto</Text>
                    <Text style={[styles.resumoCardValor, { color: CORES.SUCESSO }]}>
                        {formatarMoeda(totalBruto)}
                    </Text>
                </View>

                <View style={[styles.resumoCard, styles.resumoCardDespesas]}>
                    <Text style={styles.resumoCardLabel}>
                        Despesas ({percentualDespesas.toFixed(0)}%)
                    </Text>
                    <Text style={[styles.resumoCardValor, { color: CORES.PERIGO }]}>
                        - {formatarMoeda(totalDespesas)}
                    </Text>
                </View>
            </View>

            {/* Card de Lucro Líquido (destaque) */}
            <View style={[
                styles.resumoCardLiquido,
                { borderColor: lucroPositivo ? CORES.SUCESSO : CORES.PERIGO }
            ]}>
                <View style={styles.liquidoHeader}>
                    {lucroPositivo ? (
                        <TrendingUp size={24} color={CORES.SUCESSO} />
                    ) : (
                        <TrendingDown size={24} color={CORES.PERIGO} />
                    )}
                    <Text style={styles.liquidoLabel}>Lucro Líquido</Text>
                </View>
                <Text style={[
                    styles.liquidoValor,
                    { color: lucroPositivo ? CORES.SUCESSO : CORES.PERIGO }
                ]}>
                    {formatarMoeda(totalLiquido)}
                </Text>
            </View>

            {/* Estatísticas */}
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statValor}>{diasTrabalhados}</Text>
                    <Text style={styles.statLabel}>dias</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statValor}>{totalRotas}</Text>
                    <Text style={styles.statLabel}>rotas</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statValor}>{totalKm}</Text>
                    <Text style={styles.statLabel}>km</Text>
                </View>
            </View>
        </View>
    );
}

// ============================================
// COMPONENTE: Lista de Despesas
// ============================================

function ListaDespesas({
    despesas,
    onAdicionarAbastecimento,
    onAdicionarPedagio,
}: {
    despesas: any[];
    onAdicionarAbastecimento: () => void;
    onAdicionarPedagio: () => void;
}) {
    // Agrupa por tipo
    const abastecimentos = despesas.filter((d) => d.tipo === 'COMBUSTIVEL');
    const pedagios = despesas.filter((d) => d.tipo === 'PEDAGIO');
    const outros = despesas.filter((d) => !['COMBUSTIVEL', 'PEDAGIO'].includes(d.tipo));

    const totalAbastecimentos = abastecimentos.reduce((sum, d) => sum + (d.valor || 0), 0);
    const totalPedagios = pedagios.reduce((sum, d) => sum + (d.valor || 0), 0);
    const totalOutros = outros.reduce((sum, d) => sum + (d.valor || 0), 0);

    return (
        <View style={styles.despesasContainer}>
            {/* Card de Combustível */}
            <TouchableOpacity
                style={styles.despesaCard}
                onPress={onAdicionarAbastecimento}
                activeOpacity={0.7}
            >
                <View style={[styles.despesaIcone, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                    <Fuel size={24} color={CORES.AVISO} />
                </View>
                <View style={styles.despesaInfo}>
                    <Text style={styles.despesaTipo}>Combustível</Text>
                    <Text style={styles.despesaQtd}>
                        {abastecimentos.length} registro{abastecimentos.length !== 1 ? 's' : ''}
                    </Text>
                </View>
                <Text style={styles.despesaValor}>
                    {formatarMoeda(totalAbastecimentos)}
                </Text>
            </TouchableOpacity>

            {/* Card de Pedágios */}
            <TouchableOpacity
                style={styles.despesaCard}
                onPress={onAdicionarPedagio}
                activeOpacity={0.7}
            >
                <View style={[styles.despesaIcone, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                    <CircleDollarSign size={24} color={CORES.PERIGO} />
                </View>
                <View style={styles.despesaInfo}>
                    <Text style={styles.despesaTipo}>Pedágios</Text>
                    <Text style={styles.despesaQtd}>
                        {pedagios.length} registro{pedagios.length !== 1 ? 's' : ''}
                    </Text>
                </View>
                <Text style={styles.despesaValor}>
                    {formatarMoeda(totalPedagios)}
                </Text>
            </TouchableOpacity>

            {/* Card de Outros (se houver) */}
            {outros.length > 0 && (
                <View style={styles.despesaCard}>
                    <View style={[styles.despesaIcone, { backgroundColor: 'rgba(100, 116, 139, 0.15)' }]}>
                        <Filter size={24} color={CORES.TEXTO_MUTED} />
                    </View>
                    <View style={styles.despesaInfo}>
                        <Text style={styles.despesaTipo}>Outros</Text>
                        <Text style={styles.despesaQtd}>
                            {outros.length} registro{outros.length !== 1 ? 's' : ''}
                        </Text>
                    </View>
                    <Text style={styles.despesaValor}>
                        {formatarMoeda(totalOutros)}
                    </Text>
                </View>
            )}

            {/* Vazio */}
            {despesas.length === 0 && (
                <View style={styles.vazioContainer}>
                    <CircleDollarSign size={48} color={CORES.BORDA} />
                    <Text style={styles.vazioTexto}>
                        Nenhuma despesa registrada nesta semana
                    </Text>
                </View>
            )}
        </View>
    );
}

// ============================================
// COMPONENTE: Lista de Rotas
// ============================================

function ListaRotas({ rotas }: { rotas: any[] }) {
    const { deletarRota } = useRotasStore();

    const handleDeleteRota = (rota: any) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        Alert.alert(
            'Excluir Rota',
            `Deseja excluir a rota de ${rota.kmRodados} km (${formatarMoeda(rota.valorFrete)})?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deletarRota(rota.id);
                            if (Platform.OS !== 'web') {
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            }
                        } catch (error) {
                            Alert.alert('Erro', 'Não foi possível excluir a rota');
                        }
                    }
                }
            ]
        );
    };

    if (rotas.length === 0) {
        return (
            <View style={styles.vazioContainer}>
                <MapPin size={48} color={CORES.BORDA} />
                <Text style={styles.vazioTexto}>
                    Nenhuma rota registrada nesta semana
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.rotasContainer}>
            {rotas.map((rota) => {
                let horario = '--:--';
                try {
                    if (rota.createdAt) {
                        horario = format(new Date(rota.createdAt), 'HH:mm');
                    }
                } catch {
                    // Ignora erro de formatação
                }

                const dataFormatada = rota.data
                    ? format(new Date(rota.data + 'T12:00:00'), "EEE, d MMM", { locale: ptBR })
                    : '--';

                return (
                    <TouchableOpacity
                        key={rota.id}
                        style={styles.rotaCard}
                        onLongPress={() => handleDeleteRota(rota)}
                        delayLongPress={500}
                        activeOpacity={0.8}
                    >
                        <View style={styles.rotaHeader}>
                            <View style={styles.rotaData}>
                                <Calendar size={14} color={CORES.TEXTO_MUTED} />
                                <Text style={styles.rotaDataTexto}>{dataFormatada}</Text>
                            </View>
                            <View style={styles.rotaTurno}>
                                {rota.turno === 'AM' ? (
                                    <Sun size={14} color={CORES.AVISO} />
                                ) : (
                                    <Moon size={14} color="#6366F1" />
                                )}
                                <Text style={styles.rotaHorario}>{horario}</Text>
                            </View>
                        </View>

                        <View style={styles.rotaBody}>
                            <View style={styles.rotaInfo}>
                                <Text style={styles.rotaKm}>{rota.kmRodados} km</Text>
                                {rota.quantidadeParadas > 0 && (
                                    <Text style={styles.rotaParadas}>
                                        • {rota.quantidadeParadas} parada{rota.quantidadeParadas > 1 ? 's' : ''}
                                    </Text>
                                )}
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <Text style={styles.rotaValor}>
                                    {formatarMoeda(rota.valorFrete)}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => handleDeleteRota(rota)}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Trash2 size={18} color={CORES.PERIGO} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

// ============================================
// COMPONENTE: Tela de Exportar
// ============================================

function TelaExportar({
    semana,
    totalBruto,
    totalDespesas,
    totalLiquido,
    rotas,
    despesas,
    allRotas,
    allDespesas,
}: {
    semana: SemanaNavegacao;
    totalBruto: number;
    totalDespesas: number;
    totalLiquido: number;
    rotas: any[];
    despesas: any[];
    allRotas: any[];
    allDespesas: any[];
}) {
    const [exportando, setExportando] = useState(false);
    const [tipoPeriodo, setTipoPeriodo] = useState<'semanal' | 'mensal'>('semanal');
    const [mesSelecionado, setMesSelecionado] = useState(new Date());

    // Gerar lista de meses disponíveis (últimos 12 meses)
    const mesesDisponiveis = Array.from({ length: 12 }, (_, i) => {
        const data = new Date();
        data.setMonth(data.getMonth() - i);
        return data;
    });

    // Filtrar dados baseado no período selecionado
    const getDadosFiltrados = () => {
        if (tipoPeriodo === 'semanal') {
            return { rotasFiltradas: rotas, despesasFiltradas: despesas };
        }

        // Mensal: filtrar por mês selecionado
        const mesNum = mesSelecionado.getMonth();
        const anoNum = mesSelecionado.getFullYear();

        const rotasFiltradas = allRotas.filter((r) => {
            const dataStr = r.data || r.createdAt?.split('T')[0] || '';
            if (!dataStr) return false;
            const dataRota = new Date(dataStr + 'T12:00:00');
            return dataRota.getMonth() === mesNum && dataRota.getFullYear() === anoNum;
        });

        const despesasFiltradas = allDespesas.filter((d) => {
            const dataStr = d.dataRegistro?.split('T')[0] || d.data?.split('T')[0] || d.createdAt?.split('T')[0] || '';
            if (!dataStr) return false;
            const dataDespesa = new Date(dataStr + 'T12:00:00');
            return dataDespesa.getMonth() === mesNum && dataDespesa.getFullYear() === anoNum;
        });

        return { rotasFiltradas, despesasFiltradas };
    };

    const { rotasFiltradas, despesasFiltradas } = getDadosFiltrados();
    const totalBrutoCalc = rotasFiltradas.reduce((sum, r) => sum + (r.valorFrete || 0), 0);
    const totalDespesasCalc = despesasFiltradas.reduce((sum, d) => sum + (d.valor || 0), 0);
    const totalLiquidoCalc = totalBrutoCalc - totalDespesasCalc;

    const getPeriodLabel = () => {
        if (tipoPeriodo === 'semanal') {
            return `Semanal: ${semana.label}`;
        }
        return `Mensal: ${format(mesSelecionado, "MMMM 'de' yyyy", { locale: ptBR })}`;
    };

    const handleExportarPDF = async () => {
        setExportando(true);

        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        try {
            if (!Platform.OS || Platform.OS === 'web') {
                Alert.alert('Info', 'Geração de PDF disponível apenas no App Móvel');
                return;
            }

            const result = await generateExtractPDFLocal({
                userId: 'user-id-placeholder',
                month: tipoPeriodo === 'mensal' ? mesSelecionado.getMonth() + 1 : semana.inicio.getMonth() + 1,
                year: tipoPeriodo === 'mensal' ? mesSelecionado.getFullYear() : semana.inicio.getFullYear(),
                periodLabel: `Relatório ${getPeriodLabel()}`,
                rotas: rotasFiltradas,
                despesas: despesasFiltradas
            });

            if (result.success && result.uri) {
                await Sharing.shareAsync(result.uri);
            } else {
                throw new Error(result.error || 'Erro desconhecido');
            }

        } catch (error: any) {
            Alert.alert('Erro', error?.message || 'Não foi possível exportar o relatório');
        } finally {
            setExportando(false);
        }
    };

    const handleTipoPeriodoChange = (tipo: 'semanal' | 'mensal') => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        setTipoPeriodo(tipo);
    };

    const handleMesAnterior = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        const novaData = new Date(mesSelecionado);
        novaData.setMonth(novaData.getMonth() - 1);
        setMesSelecionado(novaData);
    };

    const handleMesProximo = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        const novaData = new Date(mesSelecionado);
        novaData.setMonth(novaData.getMonth() + 1);
        // Não permitir selecionar mês futuro
        if (novaData <= new Date()) {
            setMesSelecionado(novaData);
        }
    };

    const isMesAtual = mesSelecionado.getMonth() === new Date().getMonth() &&
        mesSelecionado.getFullYear() === new Date().getFullYear();

    return (
        <View style={styles.exportarContainer}>
            {/* Toggle Semanal/Mensal */}
            <View style={styles.periodoToggleContainer}>
                <TouchableOpacity
                    style={[
                        styles.periodoToggleBtn,
                        tipoPeriodo === 'semanal' && styles.periodoToggleBtnAtivo
                    ]}
                    onPress={() => handleTipoPeriodoChange('semanal')}
                >
                    <Calendar size={18} color={tipoPeriodo === 'semanal' ? '#FFF' : CORES.TEXTO_MUTED} />
                    <Text style={[
                        styles.periodoToggleTexto,
                        tipoPeriodo === 'semanal' && styles.periodoToggleTextoAtivo
                    ]}>Semanal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.periodoToggleBtn,
                        tipoPeriodo === 'mensal' && styles.periodoToggleBtnAtivo
                    ]}
                    onPress={() => handleTipoPeriodoChange('mensal')}
                >
                    <FileText size={18} color={tipoPeriodo === 'mensal' ? '#FFF' : CORES.TEXTO_MUTED} />
                    <Text style={[
                        styles.periodoToggleTexto,
                        tipoPeriodo === 'mensal' && styles.periodoToggleTextoAtivo
                    ]}>Mensal</Text>
                </TouchableOpacity>
            </View>

            {/* Seletor de Mês (apenas para mensal) */}
            {tipoPeriodo === 'mensal' && (
                <View style={styles.mesSeletorContainer}>
                    <TouchableOpacity style={styles.mesSeletorBtn} onPress={handleMesAnterior}>
                        <ChevronLeft size={24} color={CORES.TEXTO_SECUNDARIO} />
                    </TouchableOpacity>
                    <View style={styles.mesSeletorCenter}>
                        <Text style={styles.mesSeletorTexto}>
                            {format(mesSelecionado, "MMMM 'de' yyyy", { locale: ptBR })}
                        </Text>
                        {isMesAtual && (
                            <View style={styles.mesSeletorBadge}>
                                <Text style={styles.mesSeletorBadgeTexto}>Atual</Text>
                            </View>
                        )}
                    </View>
                    <TouchableOpacity
                        style={[styles.mesSeletorBtn, isMesAtual && styles.mesSeletorBtnDisabled]}
                        onPress={handleMesProximo}
                        disabled={isMesAtual}
                    >
                        <ChevronRight size={24} color={isMesAtual ? CORES.BORDA : CORES.TEXTO_SECUNDARIO} />
                    </TouchableOpacity>
                </View>
            )}

            {/* Card Principal */}
            <View style={styles.exportarCard}>
                <View style={styles.exportarIconWrapper}>
                    <FileText size={48} color={CORES.INFO} />
                </View>
                <Text style={styles.exportarTitulo}>
                    Relatório {tipoPeriodo === 'semanal' ? 'Semanal' : 'Mensal'}
                </Text>
                <Text style={styles.exportarDescricao}>
                    {tipoPeriodo === 'semanal'
                        ? `Período: ${semana.label}`
                        : `Período: ${format(mesSelecionado, "MMMM 'de' yyyy", { locale: ptBR })}`
                    }
                </Text>

                {/* Resumo dos valores filtrados */}
                <View style={styles.exportarResumoGrid}>
                    <View style={styles.exportarResumoItem}>
                        <Text style={styles.exportarResumoLabel}>Bruto</Text>
                        <Text style={[styles.exportarResumoValor, { color: CORES.SUCESSO }]}>
                            {formatarMoeda(tipoPeriodo === 'semanal' ? totalBruto : totalBrutoCalc)}
                        </Text>
                    </View>
                    <View style={styles.exportarResumoDivider} />
                    <View style={styles.exportarResumoItem}>
                        <Text style={styles.exportarResumoLabel}>Despesas</Text>
                        <Text style={[styles.exportarResumoValor, { color: CORES.PERIGO }]}>
                            {formatarMoeda(tipoPeriodo === 'semanal' ? totalDespesas : totalDespesasCalc)}
                        </Text>
                    </View>
                    <View style={styles.exportarResumoDivider} />
                    <View style={styles.exportarResumoItem}>
                        <Text style={styles.exportarResumoLabel}>Líquido</Text>
                        <Text style={[
                            styles.exportarResumoValor,
                            { color: (tipoPeriodo === 'semanal' ? totalLiquido : totalLiquidoCalc) >= 0 ? CORES.SUCESSO : CORES.PERIGO }
                        ]}>
                            {formatarMoeda(tipoPeriodo === 'semanal' ? totalLiquido : totalLiquidoCalc)}
                        </Text>
                    </View>
                </View>

                {/* Estatísticas */}
                <View style={styles.exportarStats}>
                    <Text style={styles.exportarStatsTexto}>
                        📊 {rotasFiltradas.length} rotas • 💰 {despesasFiltradas.length} despesas
                    </Text>
                </View>

                {/* Botão de exportar */}
                <TouchableOpacity
                    style={styles.exportarBtn}
                    onPress={handleExportarPDF}
                    disabled={exportando}
                >
                    {exportando ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <>
                            <Download size={20} color="#FFF" />
                            <Text style={styles.exportarBtnTexto}>Gerar PDF</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function FinanceiroScreen() {
    const { user } = useAuth();
    const router = require('expo-router').useRouter();

    // Stores
    const { rotas, fetchRotas, isLoading: isLoadingRotas } = useRotasStore();
    const { despesas, fetchDespesasSemana, isLoading: isLoadingDespesas } = useDespesasStore();

    // Estado local
    const [semanaRef, setSemanaRef] = useState(new Date());
    const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>('resumo');
    const [refreshing, setRefreshing] = useState(false);

    const semana = calcularSemanaTrabalho(semanaRef);
    const isLoading = isLoadingRotas || isLoadingDespesas;

    // Carrega dados quando a tela ganha foco ou semana muda
    useFocusEffect(
        useCallback(() => {
            if (user?.id) {
                fetchRotas(user.id);
                fetchDespesasSemana(user.id, semanaRef);
            }
        }, [user?.id, semanaRef])
    );

    // Pull to refresh
    const onRefresh = useCallback(async () => {
        if (!user?.id) return;
        setRefreshing(true);
        await Promise.all([
            fetchRotas(user.id),
            fetchDespesasSemana(user.id, semanaRef),
        ]);
        setRefreshing(false);
    }, [user?.id, semanaRef]);

    // Navegação de semana
    const irParaSemanaAnterior = () => {
        setSemanaRef((prev) => subWeeks(prev, 1));
    };

    const irParaProximaSemana = () => {
        if (!semana.isAtual) {
            setSemanaRef((prev) => addWeeks(prev, 1));
        }
    };

    // Filtra dados da semana selecionada
    const inicioStr = format(semana.inicio, 'yyyy-MM-dd');
    const fimStr = format(semana.fim, 'yyyy-MM-dd');

    const rotasSemana = rotas.filter((r) => {
        const dataStr = r.data || r.createdAt?.split('T')[0] || '';
        return dataStr >= inicioStr && dataStr <= fimStr;
    });

    const despesasSemana = despesas.filter((d) => {
        const dataStr = d.dataRegistro?.split('T')[0] || d.data?.split('T')[0] || d.createdAt?.split('T')[0] || '';
        return dataStr >= inicioStr && dataStr <= fimStr;
    });

    // Calcula totais
    const totalBruto = rotasSemana.reduce((sum, r) => sum + (r.valorFrete || 0), 0);
    const totalDespesas = despesasSemana.reduce((sum, d) => sum + (d.valor || 0), 0);
    const totalLiquido = totalBruto - totalDespesas;
    const totalKm = rotasSemana.reduce((sum, r) => sum + (r.kmRodados || 0), 0);
    const diasTrabalhados = new Set(rotasSemana.map((r) => r.data)).size;

    // Handlers de navegação para despesas
    const handleAdicionarAbastecimento = () => {
        router.push('/fuel');
    };

    const handleAdicionarPedagio = () => {
        router.push('/tolls');
    };

    // Renderiza conteúdo da aba ativa
    const renderizarConteudo = () => {
        switch (abaAtiva) {
            case 'resumo':
                return (
                    <ResumoFinanceiroCards
                        totalBruto={totalBruto}
                        totalDespesas={totalDespesas}
                        totalLiquido={totalLiquido}
                        totalKm={totalKm}
                        totalRotas={rotasSemana.length}
                        diasTrabalhados={diasTrabalhados}
                    />
                );
            case 'despesas':
                return (
                    <ListaDespesas
                        despesas={despesasSemana}
                        onAdicionarAbastecimento={handleAdicionarAbastecimento}
                        onAdicionarPedagio={handleAdicionarPedagio}
                    />
                );
            case 'rotas':
                return <ListaRotas rotas={rotasSemana} />;
            case 'exportar':
                return (
                    <TelaExportar
                        semana={semana}
                        totalBruto={totalBruto}
                        totalDespesas={totalDespesas}
                        totalLiquido={totalLiquido}
                        rotas={rotasSemana}
                        despesas={despesasSemana}
                        allRotas={rotas}
                        allDespesas={despesas}
                    />
                );
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.titulo}>Financeiro</Text>
            </View>

            {/* Navegador de semana */}
            <SemanaNavigator
                semana={semana}
                onAnterior={irParaSemanaAnterior}
                onProxima={irParaProximaSemana}
            />

            {/* Seletor de abas */}
            <AbaSeletor abaAtiva={abaAtiva} onChange={setAbaAtiva} />

            {/* Conteúdo */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={false}
            >
                {isLoading && !refreshing ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={CORES.INFO} />
                    </View>
                ) : (
                    renderizarConteudo()
                )}
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
        backgroundColor: CORES.FUNDO,
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    titulo: {
        fontSize: 28,
        fontWeight: '800',
        color: CORES.TEXTO_PRIMARIO,
        letterSpacing: -0.5,
    },

    // Navegador de semana
    semanaNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: CORES.CARD,
        marginHorizontal: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    semanaNavBtn: {
        padding: 8,
    },
    semanaNavBtnDisabled: {
        opacity: 0.3,
    },
    semanaNavCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    semanaNavLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: CORES.TEXTO_PRIMARIO,
    },
    badgeAtual: {
        backgroundColor: CORES.SUCESSO,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    badgeAtualTexto: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFF',
    },

    // Seletor de abas
    abaContainer: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 16,
        backgroundColor: CORES.CARD,
        borderRadius: 12,
        padding: 4,
    },
    abaBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        gap: 4,
    },
    abaBtnAtiva: {
        backgroundColor: CORES.FUNDO,
    },
    abaLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: CORES.TEXTO_MUTED,
    },
    abaLabelAtiva: {
        color: CORES.PRIMARIO,
    },

    // ScrollView
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },
    loadingContainer: {
        paddingVertical: 48,
        alignItems: 'center',
    },

    // Resumo financeiro
    resumoContainer: {
        gap: 12,
    },
    resumoRow: {
        flexDirection: 'row',
        gap: 12,
    },
    resumoCard: {
        flex: 1,
        backgroundColor: CORES.CARD,
        borderRadius: 12,
        padding: 16,
    },
    resumoCardBruto: {},
    resumoCardDespesas: {},
    resumoCardLabel: {
        fontSize: 12,
        color: CORES.TEXTO_SECUNDARIO,
        marginBottom: 4,
    },
    resumoCardValor: {
        fontSize: 20,
        fontWeight: '700',
    },
    resumoCardLiquido: {
        backgroundColor: CORES.CARD,
        borderRadius: 16,
        padding: 20,
        borderWidth: 2,
        alignItems: 'center',
    },
    liquidoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    liquidoLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: CORES.TEXTO_SECUNDARIO,
    },
    liquidoValor: {
        fontSize: 36,
        fontWeight: '800',
        letterSpacing: -1,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: CORES.CARD,
        borderRadius: 12,
        padding: 16,
        gap: 24,
    },
    statItem: {
        alignItems: 'center',
    },
    statValor: {
        fontSize: 20,
        fontWeight: '700',
        color: CORES.TEXTO_PRIMARIO,
    },
    statLabel: {
        fontSize: 12,
        color: CORES.TEXTO_MUTED,
    },
    statDivider: {
        width: 1,
        height: 32,
        backgroundColor: CORES.BORDA,
    },

    // Lista de despesas
    despesasContainer: {
        gap: 12,
    },
    despesaCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CORES.CARD,
        borderRadius: 12,
        padding: 16,
        gap: 12,
    },
    despesaIcone: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    despesaInfo: {
        flex: 1,
    },
    despesaTipo: {
        fontSize: 16,
        fontWeight: '600',
        color: CORES.TEXTO_PRIMARIO,
    },
    despesaQtd: {
        fontSize: 12,
        color: CORES.TEXTO_MUTED,
    },
    despesaValor: {
        fontSize: 18,
        fontWeight: '700',
        color: CORES.PERIGO,
    },

    // Lista de rotas
    rotasContainer: {
        gap: 12,
    },
    rotaCard: {
        backgroundColor: CORES.CARD,
        borderRadius: 12,
        padding: 16,
    },
    rotaHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    rotaData: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    rotaDataTexto: {
        fontSize: 13,
        color: CORES.TEXTO_SECUNDARIO,
        textTransform: 'capitalize',
    },
    rotaTurno: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    rotaHorario: {
        fontSize: 13,
        color: CORES.TEXTO_MUTED,
    },
    rotaBody: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    rotaInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rotaKm: {
        fontSize: 18,
        fontWeight: '700',
        color: CORES.TEXTO_PRIMARIO,
    },
    rotaParadas: {
        fontSize: 14,
        color: CORES.TEXTO_MUTED,
        marginLeft: 8,
    },
    rotaValor: {
        fontSize: 18,
        fontWeight: '700',
        color: CORES.SUCESSO,
    },

    // Exportar
    exportarContainer: {
        flex: 1,
        paddingVertical: 24,
    },
    exportarCard: {
        backgroundColor: CORES.CARD,
        borderRadius: 20,
        padding: 32,
        alignItems: 'center',
    },
    exportarTitulo: {
        fontSize: 22,
        fontWeight: '700',
        color: CORES.TEXTO_PRIMARIO,
        marginTop: 16,
        marginBottom: 8,
    },
    exportarDescricao: {
        fontSize: 14,
        color: CORES.TEXTO_SECUNDARIO,
        textAlign: 'center',
        marginBottom: 24,
    },
    exportarResumo: {
        backgroundColor: CORES.FUNDO,
        borderRadius: 12,
        padding: 16,
        width: '100%',
        marginBottom: 24,
    },
    exportarResumoTexto: {
        fontSize: 14,
        color: CORES.TEXTO_SECUNDARIO,
        textAlign: 'center',
        marginBottom: 4,
    },
    exportarBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: CORES.INFO,
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
        width: '100%',
    },
    exportarBtnTexto: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
    },

    // Vazio
    vazioContainer: {
        alignItems: 'center',
        paddingVertical: 48,
    },
    vazioTexto: {
        fontSize: 14,
        color: CORES.TEXTO_MUTED,
        textAlign: 'center',
        marginTop: 16,
    },

    // Period Toggle (Semanal/Mensal)
    periodoToggleContainer: {
        flexDirection: 'row',
        backgroundColor: CORES.CARD,
        borderRadius: 16,
        padding: 4,
        marginBottom: 16,
    },
    periodoToggleBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        gap: 8,
    },
    periodoToggleBtnAtivo: {
        backgroundColor: CORES.INFO,
    },
    periodoToggleTexto: {
        fontSize: 14,
        fontWeight: '600',
        color: CORES.TEXTO_MUTED,
    },
    periodoToggleTextoAtivo: {
        color: '#FFF',
    },

    // Month Selector
    mesSeletorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: CORES.CARD,
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
    },
    mesSeletorBtn: {
        padding: 8,
    },
    mesSeletorBtnDisabled: {
        opacity: 0.3,
    },
    mesSeletorCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    mesSeletorTexto: {
        fontSize: 16,
        fontWeight: '600',
        color: CORES.TEXTO_PRIMARIO,
        textTransform: 'capitalize',
    },
    mesSeletorBadge: {
        backgroundColor: CORES.SUCESSO,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    mesSeletorBadgeTexto: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFF',
    },

    // Enhanced Export Card
    exportarIconWrapper: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    exportarResumoGrid: {
        flexDirection: 'row',
        backgroundColor: CORES.FUNDO,
        borderRadius: 12,
        padding: 16,
        width: '100%',
        marginBottom: 16,
    },
    exportarResumoItem: {
        flex: 1,
        alignItems: 'center',
    },
    exportarResumoLabel: {
        fontSize: 12,
        color: CORES.TEXTO_MUTED,
        marginBottom: 4,
    },
    exportarResumoValor: {
        fontSize: 16,
        fontWeight: '700',
    },
    exportarResumoDivider: {
        width: 1,
        height: '100%',
        backgroundColor: CORES.BORDA,
    },
    exportarStats: {
        backgroundColor: 'rgba(100, 116, 139, 0.1)',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    exportarStatsTexto: {
        fontSize: 13,
        color: CORES.TEXTO_SECUNDARIO,
        textAlign: 'center',
    },
});
