// app/(tabs)/index.tsx
// ============================================
// ROTAFRETE - Tela Home (REDESIGN v2)
// ============================================
// [NOVO] Integração com sistema de gamificação
// [NOVO] LucroHeroCard com destaque visual
// [NOVO] StreakCounter para dias consecutivos
// [NOVO] ConquistasCard com sistema de badges
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    RefreshControl,
    Alert,
    ActivityIndicator,
    Animated,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';
import {
    Sun,
    Moon,
    Fuel,
    CircleDollarSign,
    Plus,
    MapPin,
    Package,
    ChevronRight,
    Target,
} from 'lucide-react-native';

import { useAuth } from '@aether-baas/react-native';
import { Card, Button } from '@/components/ui';
import {
    LucroHeroCard,
    StreakCounter,
    ConquistasCard,
    NovaConquistaToast,
} from '@/components/dashboard';
import {
    useRotasStore,
    useResumoFinanceiroStore,
    useDespesasStore,
    useMetasStore,
} from '@/store';
import type { Conquista } from '@/store/useMetasStore';
import {
    calcularFreteCompleto,
    formatarMoeda,
    type Turno,
    type TipoVeiculo,
} from '@/constants/pricing';

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
// COMPONENTE DE ANIMAÇÃO DE PACOTES
// ============================================

function BouncingPackages({ count = 3 }: { count: number }) {
    const bounceAnims = React.useRef(
        Array.from({ length: count }, () => new Animated.Value(0))
    ).current;

    React.useEffect(() => {
        const animations = bounceAnims.map((anim, index) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.delay(index * 200),
                    Animated.timing(anim, {
                        toValue: 1,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim, {
                        toValue: 0,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                ])
            );
        });

        Animated.parallel(animations).start();
    }, [count]);

    return (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end', height: 80 }}>
            {bounceAnims.slice(0, count).map((anim, index) => {
                const translateY = anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -20],
                });

                return (
                    <Animated.View
                        key={index}
                        style={{ transform: [{ translateY }] }}
                    >
                        <Text style={{ fontSize: 48 }}>📦</Text>
                    </Animated.View>
                );
            })}
        </View>
    );
}

// ============================================
// COMPONENTES INTERNOS
// ============================================

/**
 * Card de estatísticas do dia
 */
function StatCard({
    icon,
    label,
    value,
    color,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    color: string;
}) {
    return (
        <View style={[styles.statCard, { borderLeftColor: color }]}>
            <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
                {icon}
            </View>
            <View style={styles.statContent}>
                <Text style={styles.statLabel}>{label}</Text>
                <Text style={styles.statValue}>{value}</Text>
            </View>
        </View>
    );
}

/**
 * Card de rota registrada
 */
function RotaCard({
    kmRodados,
    valorFrete,
    turno,
    horario,
    quantidadeParadas = 0,
}: {
    kmRodados: number;
    valorFrete: number;
    turno: Turno;
    horario: string;
    quantidadeParadas?: number;
}) {
    return (
        <View style={styles.rotaCard}>
            <View style={styles.rotaHeader}>
                <View style={styles.rotaKmContainer}>
                    <MapPin size={14} color={CORES.INFO} />
                    <Text style={styles.rotaKm}>{kmRodados} km</Text>
                    {quantidadeParadas > 0 && (
                        <Text style={styles.rotaParadas}>
                            • {quantidadeParadas} parada{quantidadeParadas > 1 ? 's' : ''}
                        </Text>
                    )}
                </View>
                <View style={styles.rotaTurno}>
                    {turno === 'AM' ? (
                        <Sun size={14} color={CORES.AVISO} />
                    ) : (
                        <Moon size={14} color="#6366F1" />
                    )}
                    <Text style={styles.rotaHorario}>{horario}</Text>
                </View>
            </View>

            <Text style={styles.rotaValor}>{formatarMoeda(valorFrete)}</Text>
        </View>
    );
}

/**
 * Botão de ação rápida
 */
function QuickActionButton({
    icon,
    label,
    onPress,
}: {
    icon: React.ReactNode;
    label: string;
    onPress: () => void;
}) {
    const handlePress = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress();
    };

    return (
        <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={handlePress}
            activeOpacity={0.7}
        >
            {icon}
            <Text style={styles.quickActionText}>{label}</Text>
        </TouchableOpacity>
    );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function HomeScreen() {
    const router = useRouter();
    const { user } = useAuth();

    // Stores de dados
    const {
        rotasDoDia,
        rotas,
        fetchRotasDoDia,
        fetchRotas,
        criarRota,
        isLoading: isLoadingRotas,
    } = useRotasStore();

    const { fetchResumoSemanal } = useResumoFinanceiroStore();
    const { despesas, fetchDespesasSemana } = useDespesasStore();

    // [NOVO] Store de gamificação
    const {
        metaSemanal,
        streakDias,
        conquistas,
        atualizarProgresso,
        registrarDiaTrabalho,
        verificarConquistas,
        inicializarParaUsuario,
    } = useMetasStore();

    // Estado local
    const [refreshing, setRefreshing] = useState(false);
    const [kmInput, setKmInput] = useState('');
    const [paradasInput, setParadasInput] = useState('');
    const [turnoSelecionado, setTurnoSelecionado] = useState<Turno>('AM');
    const [novaConquista, setNovaConquista] = useState<Conquista | null>(null);

    // Data atual
    const hoje = new Date();
    const diaFormatado = format(hoje, "EEEE, d 'de' MMMM", { locale: ptBR });

    // Tipo de veículo do usuário
    const tipoVeiculo: TipoVeiculo = (user as any)?.tipoVeiculo || 'UTILITARIO';

    // ========================================
    // CÁLCULOS DA SEMANA (Single Source of Truth)
    // ========================================

    // Calcula semana de trabalho (Sexta a Quinta)
    const diaSemana = hoje.getDay();
    let inicioSemana: Date;
    let fimSemana: Date;

    if (diaSemana === 4) {
        fimSemana = new Date(hoje);
        inicioSemana = new Date(hoje);
        inicioSemana.setDate(inicioSemana.getDate() - 6);
    } else if (diaSemana === 5) {
        inicioSemana = new Date(hoje);
        fimSemana = new Date(hoje);
        fimSemana.setDate(fimSemana.getDate() + 6);
    } else {
        const diasParaSexta = diaSemana >= 5 ? diaSemana - 5 : diaSemana + 2;
        inicioSemana = new Date(hoje);
        inicioSemana.setDate(inicioSemana.getDate() - diasParaSexta);
        fimSemana = new Date(inicioSemana);
        fimSemana.setDate(fimSemana.getDate() + 6);
    }

    const inicioStr = format(inicioSemana, 'yyyy-MM-dd');
    const fimStr = format(fimSemana, 'yyyy-MM-dd');

    // Filtra rotas e despesas da semana
    const rotasSemana = rotas.filter((r) => {
        const dataStr = r.data || r.createdAt?.split('T')[0] || '';
        return dataStr >= inicioStr && dataStr <= fimStr;
    });

    const despesasSemana = despesas.filter((d) => {
        const dataStr = d.dataRegistro?.split('T')[0] || d.data?.split('T')[0] || d.createdAt?.split('T')[0] || '';
        return dataStr >= inicioStr && dataStr <= fimStr;
    });

    // Totais da semana
    const totalBrutoSemana = rotasSemana.reduce((sum, r) => sum + (r.valorFrete || 0), 0);
    const totalDespesasSemana = despesasSemana.reduce((sum, d) => sum + (d.valor || 0), 0);
    const totalLiquidoSemana = totalBrutoSemana - totalDespesasSemana;

    // Totais do dia
    const totalKmDia = rotasDoDia.reduce((sum, r) => sum + r.kmRodados, 0);
    const totalParadasDia = rotasDoDia.reduce((sum, r) => sum + (r.quantidadeParadas || 0), 0);
    const totalBrutoDia = rotasDoDia.reduce((sum, r) => sum + r.valorFrete, 0);

    // Preview do input
    const kmPreview = parseInt(kmInput) || 0;
    const paradasPreview = parseInt(paradasInput) || 0;
    const previewCalc = kmPreview > 0
        ? calcularFreteCompleto(kmPreview, tipoVeiculo, turnoSelecionado, hoje, paradasPreview)
        : null;

    // ========================================
    // EFEITOS
    // ========================================

    // Carrega dados quando a tela ganha foco
    useFocusEffect(
        useCallback(() => {
            if (user?.id) {
                fetchRotasDoDia(user.id, hoje);
                fetchRotas(user.id);
                fetchDespesasSemana(user.id, hoje);
                fetchResumoSemanal(user.id, hoje);
            }
        }, [user?.id])
    );

    // [NOVO] Inicializa metas/conquistas quando muda de usuário
    useEffect(() => {
        if (user?.id) {
            inicializarParaUsuario(user.id);
        }
    }, [user?.id]);

    // [REALTIME] Ativa listeners globais (Rotas e Despesas)
    useEffect(() => {
        if (!user?.id) return;

        // Inscreve para receber atualizações em tempo real
        // Como a Home é mantida montada nas tabs, isso garante realtime em todo o app durante a sessão
        const unsubRotas = useRotasStore.getState().subscribeToChanges(user.id);
        const unsubDespesas = useDespesasStore.getState().subscribeToChanges(user.id);

        return () => {
            unsubRotas();
            unsubDespesas();
        };
    }, [user?.id]);

    // [NOVO] Atualiza progresso da meta quando lucro muda
    useEffect(() => {
        if (totalLiquidoSemana !== 0) {
            atualizarProgresso(totalLiquidoSemana);
        }
    }, [totalLiquidoSemana]);

    // [NOVO] Verifica conquistas quando dados mudam
    useEffect(() => {
        if (rotas.length > 0) {
            const dados = {
                lucroSemanal: totalLiquidoSemana,
                despesasPercentual: totalBrutoSemana > 0
                    ? (totalDespesasSemana / totalBrutoSemana) * 100
                    : 0,
                rotasDoDia: rotasDoDia.length,
                maiorRota: Math.max(...rotas.map((r) => r.kmRodados || 0), 0),
                diasConsecutivos: streakDias,
                totalRotas: rotas.length,
                totalKm: rotas.reduce((sum, r) => sum + (r.kmRodados || 0), 0),
            };

            const novas = verificarConquistas(dados);
            if (novas.length > 0) {
                setNovaConquista(novas[0]);
            }
        }
    }, [rotas, totalLiquidoSemana, rotasDoDia.length]);

    // Pull to refresh
    const onRefresh = useCallback(async () => {
        if (!user?.id) return;
        setRefreshing(true);
        await Promise.all([
            fetchRotasDoDia(user.id, hoje),
            fetchRotas(user.id),
            fetchDespesasSemana(user.id, hoje),
            fetchResumoSemanal(user.id, hoje),
        ]);
        setRefreshing(false);
    }, [user?.id]);

    // ========================================
    // HANDLERS
    // ========================================

    const handleNavigateToFuel = () => {
        router.push('/fuel');
    };

    const handleNavigateToTolls = () => {
        router.push('/tolls');
    };

    const handleNavigateToPreview = () => {
        router.push('/(tabs)/preview');
    };

    const handleNavigateToFinanceiro = () => {
        router.push('/(tabs)/financeiro');
    };

    const handleRegistrarRota = async () => {
        if (!user?.id || kmPreview < 1) {
            Alert.alert('Erro', 'Informe a quilometragem válida');
            return;
        }

        if (!previewCalc) {
            Alert.alert('Erro', 'Não foi possível calcular o frete');
            return;
        }

        try {
            if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }

            await criarRota(
                user.id,
                {
                    data: format(hoje, 'yyyy-MM-dd'),
                    origem: 'Ponto Inicial',
                    destino: 'Ponto Final',
                    kmRodados: kmPreview,
                    turno: turnoSelecionado,
                    quantidadeParadas: paradasPreview,
                },
                tipoVeiculo
            );

            // [NOVO] Registra dia de trabalho para streak
            registrarDiaTrabalho();

            // Limpa inputs
            setKmInput('');
            setParadasInput('');

            // Recarrega dados
            fetchRotasDoDia(user.id, hoje);
            fetchRotas(user.id);
            fetchResumoSemanal(user.id, hoje);

            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }

            Alert.alert('Sucesso', 'Rota registrada com sucesso!');
        } catch (error: any) {
            Alert.alert('Erro', error.message || 'Erro ao registrar rota');
        }
    };

    // ========================================
    // RENDER
    // ========================================

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>
                            Olá, {user?.name?.split(' ')[0] || 'Motorista'}!
                        </Text>
                        <Text style={styles.date}>{diaFormatado}</Text>
                    </View>

                    {/* [NOVO] Streak compacto no header */}
                    <StreakCounter dias={streakDias} variante="compacto" />
                </View>

                {/* [NOVO] Card Hero de Lucro Líquido */}
                <LucroHeroCard
                    lucroLiquido={totalLiquidoSemana}
                    lucroSemanaAnterior={0} // TODO: calcular semana anterior
                    metaSemanal={metaSemanal?.valorAlvo || 0}
                    onPressDetalhes={handleNavigateToFinanceiro}
                />

                {/* [NOVO] Streak Counter completo */}
                {streakDias >= 3 && (
                    <StreakCounter dias={streakDias} variante="padrao" />
                )}

                {/* [NOVO] Card de Conquistas */}
                {conquistas.some((c) => c.desbloqueadaEm || c.progresso > 0) && (
                    <ConquistasCard conquistas={conquistas} maxExibir={3} />
                )}

                {/* Estatísticas do dia */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Hoje</Text>
                </View>

                <View style={styles.statsRow}>
                    <StatCard
                        icon={<MapPin size={20} color={CORES.INFO} />}
                        label="KM"
                        value={`${totalKmDia}`}
                        color={CORES.INFO}
                    />
                    <StatCard
                        icon={<Package size={20} color="#8B5CF6" />}
                        label="Paradas"
                        value={`${totalParadasDia}`}
                        color="#8B5CF6"
                    />
                    <StatCard
                        icon={<CircleDollarSign size={20} color={CORES.SUCESSO} />}
                        label="Ganhos"
                        value={formatarMoeda(totalBrutoDia)}
                        color={CORES.SUCESSO}
                    />
                </View>

                {/* Botões de ação rápida */}
                <View style={styles.quickActions}>
                    <QuickActionButton
                        icon={<Fuel size={24} color={CORES.AVISO} />}
                        label="Combustível"
                        onPress={handleNavigateToFuel}
                    />
                    <QuickActionButton
                        icon={<CircleDollarSign size={24} color={CORES.PERIGO} />}
                        label="Pedágio"
                        onPress={handleNavigateToTolls}
                    />
                    <QuickActionButton
                        icon={<MapPin size={24} color={CORES.INFO} />}
                        label="Prévia"
                        onPress={handleNavigateToPreview}
                    />
                </View>

                {/* Card de registro de KM e Paradas */}
                <Card variant="default" style={styles.registroCard}>
                    <Text style={styles.registroTitle}>Registrar Rota</Text>

                    {/* Seletor de Turno */}
                    <View style={styles.turnoContainer}>
                        <TouchableOpacity
                            style={[
                                styles.turnoBtn,
                                turnoSelecionado === 'AM' && styles.turnoBtnActive,
                            ]}
                            onPress={() => setTurnoSelecionado('AM')}
                        >
                            <Sun size={18} color={turnoSelecionado === 'AM' ? '#FFF' : CORES.AVISO} />
                            <Text
                                style={[
                                    styles.turnoText,
                                    turnoSelecionado === 'AM' && styles.turnoTextActive,
                                ]}
                            >
                                Manhã
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.turnoBtn,
                                turnoSelecionado === 'PM' && styles.turnoBtnActive,
                            ]}
                            onPress={() => setTurnoSelecionado('PM')}
                        >
                            <Moon size={18} color={turnoSelecionado === 'PM' ? '#FFF' : '#6366F1'} />
                            <Text
                                style={[
                                    styles.turnoText,
                                    turnoSelecionado === 'PM' && styles.turnoTextActive,
                                ]}
                            >
                                Tarde
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Input de KM */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Quilômetros Rodados</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.inputNative}
                                value={kmInput}
                                onChangeText={setKmInput}
                                placeholder="0"
                                keyboardType="numeric"
                                placeholderTextColor={CORES.TEXTO_MUTED}
                            />
                            <Text style={styles.inputSuffix}>km</Text>
                        </View>
                    </View>

                    {/* Input de Paradas */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Quantidade de Paradas</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.inputNative}
                                value={paradasInput}
                                onChangeText={setParadasInput}
                                placeholder="0"
                                keyboardType="numeric"
                                placeholderTextColor={CORES.TEXTO_MUTED}
                            />
                            <Text style={styles.inputSuffix}>entregas</Text>
                        </View>

                        {paradasPreview > 0 && (
                            <View style={styles.lottieContainer}>
                                <BouncingPackages count={Math.min(paradasPreview, 3)} />
                            </View>
                        )}
                    </View>

                    {/* Preview do cálculo */}
                    {previewCalc && (
                        <View style={styles.previewContainer}>
                            <View style={styles.previewRow}>
                                <Text style={styles.previewLabel}>Valor KM:</Text>
                                <Text style={styles.previewValue}>
                                    {formatarMoeda(previewCalc.valorKm)}
                                </Text>
                            </View>
                            {paradasPreview > 0 && (
                                <View style={styles.previewRow}>
                                    <Text style={styles.previewLabel}>Valor Paradas:</Text>
                                    <Text style={styles.previewValue}>
                                        {formatarMoeda(previewCalc.valorParadas)}
                                    </Text>
                                </View>
                            )}
                            <View style={[styles.previewRow, styles.previewTotal]}>
                                <Text style={styles.previewTotalLabel}>TOTAL:</Text>
                                <Text style={styles.previewTotalValue}>
                                    {formatarMoeda(previewCalc.valorTotal)}
                                </Text>
                            </View>
                            <Text style={styles.previewInfo}>
                                Faixa: {previewCalc.faixaKm} • {previewCalc.tipoDia}
                            </Text>
                        </View>
                    )}

                    {/* Botão de registrar */}
                    <Button
                        onPress={handleRegistrarRota}
                        disabled={kmPreview < 1 || isLoadingRotas}
                        loading={isLoadingRotas}
                        icon={<Plus size={20} color="#FFF" />}
                        iconPosition="left"
                    >
                        Registrar Rota
                    </Button>
                </Card>

                {/* Lista de rotas do dia */}
                {rotasDoDia.length > 0 && (
                    <View style={styles.rotasSection}>
                        <Text style={styles.sectionTitle}>Rotas de Hoje</Text>
                        {rotasDoDia.map((rota) => {
                            let horario = '--:--';
                            try {
                                if (rota.createdAt) {
                                    horario = format(new Date(rota.createdAt), 'HH:mm');
                                }
                            } catch {
                                horario = '--:--';
                            }
                            return (
                                <RotaCard
                                    key={rota.id}
                                    kmRodados={rota.kmRodados}
                                    valorFrete={rota.valorFrete}
                                    turno={rota.turno}
                                    horario={horario}
                                    quantidadeParadas={rota.quantidadeParadas}
                                />
                            );
                        })}
                    </View>
                )}
            </ScrollView>

            {/* [NOVO] Toast de Nova Conquista */}
            {novaConquista && (
                <NovaConquistaToast
                    conquista={novaConquista}
                    onDismiss={() => setNovaConquista(null)}
                />
            )}
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 120,
    },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    greeting: {
        fontSize: 24,
        fontWeight: '700',
        color: CORES.TEXTO_PRIMARIO,
    },
    date: {
        fontSize: 14,
        color: CORES.TEXTO_SECUNDARIO,
        marginTop: 4,
        textTransform: 'capitalize',
    },

    // Section
    sectionHeader: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: CORES.TEXTO_PRIMARIO,
    },

    // Stats
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: CORES.CARD,
        borderRadius: 12,
        padding: 12,
        borderLeftWidth: 3,
    },
    statIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statContent: {},
    statLabel: {
        fontSize: 11,
        color: CORES.TEXTO_MUTED,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '700',
        color: CORES.TEXTO_PRIMARIO,
    },

    // Quick Actions
    quickActions: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 16,
        gap: 12,
    },
    quickActionBtn: {
        flex: 1,
        backgroundColor: CORES.CARD,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: CORES.BORDA,
    },
    quickActionText: {
        fontSize: 12,
        fontWeight: '600',
        color: CORES.TEXTO_SECUNDARIO,
        marginTop: 8,
    },

    // Registro Card
    registroCard: {
        marginHorizontal: 16,
        padding: 16,
        backgroundColor: CORES.CARD,
    },
    registroTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: CORES.TEXTO_PRIMARIO,
        marginBottom: 16,
    },

    // Turno
    turnoContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        gap: 12,
    },
    turnoBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: CORES.FUNDO,
        gap: 8,
    },
    turnoBtnActive: {
        backgroundColor: CORES.PRIMARIO,
    },
    turnoText: {
        fontSize: 14,
        fontWeight: '600',
        color: CORES.TEXTO_SECUNDARIO,
    },
    turnoTextActive: {
        color: '#FFF',
    },

    // Input
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: CORES.TEXTO_SECUNDARIO,
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CORES.FUNDO,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: CORES.BORDA,
    },
    inputNative: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 18,
        fontWeight: '600',
        color: CORES.TEXTO_PRIMARIO,
    },
    inputSuffix: {
        paddingRight: 16,
        fontSize: 14,
        color: CORES.TEXTO_MUTED,
    },
    lottieContainer: {
        alignItems: 'center',
        marginTop: 8,
    },

    // Preview
    previewContainer: {
        backgroundColor: CORES.FUNDO,
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
    },
    previewRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    previewLabel: {
        fontSize: 14,
        color: CORES.TEXTO_SECUNDARIO,
    },
    previewValue: {
        fontSize: 14,
        fontWeight: '600',
        color: CORES.TEXTO_PRIMARIO,
    },
    previewTotal: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: CORES.BORDA,
    },
    previewTotalLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: CORES.TEXTO_PRIMARIO,
    },
    previewTotalValue: {
        fontSize: 18,
        fontWeight: '700',
        color: CORES.SUCESSO,
    },
    previewInfo: {
        fontSize: 11,
        color: CORES.TEXTO_MUTED,
        textAlign: 'center',
        marginTop: 8,
    },

    // Rotas Section
    rotasSection: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    rotaCard: {
        backgroundColor: CORES.CARD,
        borderRadius: 12,
        padding: 16,
        marginTop: 12,
    },
    rotaHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    rotaKmContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    rotaKm: {
        fontSize: 16,
        fontWeight: '600',
        color: CORES.TEXTO_PRIMARIO,
    },
    rotaParadas: {
        fontSize: 14,
        color: CORES.TEXTO_MUTED,
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
    rotaValor: {
        fontSize: 20,
        fontWeight: '700',
        color: CORES.SUCESSO,
    },
});
