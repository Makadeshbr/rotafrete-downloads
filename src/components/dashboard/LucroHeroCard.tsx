// src/components/dashboard/LucroHeroCard.tsx
// ============================================
// ROTAFRETE - Card Hero de Lucro Líquido
// ============================================
// Componente principal do dashboard que exibe
// o lucro líquido com destaque visual máximo.
// Inclui barra de progresso da meta semanal
// e comparação com a semana anterior.
// ============================================

import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withDelay,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import {
    TrendingUp,
    TrendingDown,
    Minus,
    Target,
    ChevronRight,
    Trophy,
} from 'lucide-react-native';

// ============================================
// TIPOS
// ============================================

interface LucroHeroCardProps {
    /** Lucro líquido atual da semana */
    lucroLiquido: number;
    /** Lucro da semana anterior (para comparação) */
    lucroSemanaAnterior?: number;
    /** Valor da meta semanal (opcional) */
    metaSemanal?: number;
    /** Callback ao pressionar "Ver detalhes" */
    onPressDetalhes?: () => void;
}

// ============================================
// CONSTANTES DE CORES
// ============================================

const CORES = {
    // Gradientes por status
    POSITIVO: ['#22C55E', '#16A34A'] as const,      // Verde - lucro positivo
    NEGATIVO: ['#EF4444', '#DC2626'] as const,      // Vermelho - prejuízo
    EM_PROGRESSO: ['#3B82F6', '#2563EB'] as const,  // Azul - abaixo da meta
    QUASE_LA: ['#F59E0B', '#D97706'] as const,      // Laranja - 75-99% da meta
    META_BATIDA: ['#22C55E', '#15803D'] as const,   // Verde forte - meta atingida
    
    // Textos
    TEXTO_PRIMARIO: '#FFFFFF',
    TEXTO_SECUNDARIO: 'rgba(255, 255, 255, 0.8)',
    TEXTO_MUTED: 'rgba(255, 255, 255, 0.6)',
    
    // Elementos
    BARRA_FUNDO: 'rgba(255, 255, 255, 0.2)',
    BARRA_PROGRESSO: 'rgba(255, 255, 255, 0.9)',
};

// ============================================
// HELPER: Formatar valor monetário
// ============================================

function formatarMoeda(valor: number): string {
    const absoluto = Math.abs(valor);
    
    if (absoluto >= 1000) {
        return `R$ ${(valor / 1000).toFixed(1).replace('.', ',')}k`;
    }
    
    return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}

// ============================================
// HELPER: Calcular variação percentual
// ============================================

function calcularVariacao(atual: number, anterior: number): number {
    if (anterior === 0) return atual > 0 ? 100 : 0;
    return ((atual - anterior) / Math.abs(anterior)) * 100;
}

// ============================================
// HELPER: Determinar cores do gradiente
// ============================================

function obterCoresGradiente(
    lucro: number,
    meta: number | undefined,
    progresso: number
): readonly [string, string] {
    // Prejuízo = vermelho
    if (lucro < 0) return CORES.NEGATIVO;
    
    // Sem meta definida = azul padrão
    if (!meta || meta <= 0) return CORES.EM_PROGRESSO;
    
    // Meta batida = verde vibrante
    if (progresso >= 100) return CORES.META_BATIDA;
    
    // Quase lá (75-99%) = laranja
    if (progresso >= 75) return CORES.QUASE_LA;
    
    // Em progresso = azul
    return CORES.EM_PROGRESSO;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function LucroHeroCard({
    lucroLiquido,
    lucroSemanaAnterior = 0,
    metaSemanal = 0,
    onPressDetalhes,
}: LucroHeroCardProps) {
    // Animações
    const animacaoEntrada = useSharedValue(0);
    const animacaoProgresso = useSharedValue(0);

    // Cálculos
    const variacao = calcularVariacao(lucroLiquido, lucroSemanaAnterior);
    const progressoMeta = metaSemanal > 0
        ? Math.min((lucroLiquido / metaSemanal) * 100, 100)
        : 0;
    const metaAtingida = progressoMeta >= 100;
    const coresGradiente = obterCoresGradiente(lucroLiquido, metaSemanal, progressoMeta);

    // Efeito de entrada
    useEffect(() => {
        animacaoEntrada.value = withSpring(1, {
            damping: 15,
            stiffness: 100,
        });
        
        // Anima barra de progresso com delay
        animacaoProgresso.value = withDelay(
            300,
            withSpring(progressoMeta / 100, {
                damping: 20,
                stiffness: 80,
            })
        );
    }, [progressoMeta]);

    // Estilo animado do container
    const estiloAnimado = useAnimatedStyle(() => ({
        opacity: animacaoEntrada.value,
        transform: [
            {
                translateY: interpolate(
                    animacaoEntrada.value,
                    [0, 1],
                    [30, 0],
                    Extrapolation.CLAMP
                ),
            },
            {
                scale: interpolate(
                    animacaoEntrada.value,
                    [0, 1],
                    [0.95, 1],
                    Extrapolation.CLAMP
                ),
            },
        ],
    }));

    // Estilo animado da barra de progresso
    const estiloBarraProgresso = useAnimatedStyle(() => ({
        width: `${animacaoProgresso.value * 100}%`,
    }));

    // Handler de press com haptic
    const handlePress = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPressDetalhes?.();
    };

    // Ícone de tendência
    const IconeTendencia = variacao > 0
        ? TrendingUp
        : variacao < 0
            ? TrendingDown
            : Minus;

    return (
        <Animated.View style={[styles.container, estiloAnimado]}>
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={handlePress}
                disabled={!onPressDetalhes}
            >
                <LinearGradient
                    colors={coresGradiente}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradiente}
                >
                    {/* Badge de meta atingida */}
                    {metaAtingida && (
                        <View style={styles.badgeMeta}>
                            <Trophy size={14} color="#FFF" />
                            <Text style={styles.badgeMetaTexto}>META ATINGIDA!</Text>
                        </View>
                    )}

                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.label}>Lucro Líquido da Semana</Text>
                        {onPressDetalhes && (
                            <ChevronRight size={20} color={CORES.TEXTO_SECUNDARIO} />
                        )}
                    </View>

                    {/* Valor principal */}
                    <Text style={styles.valor}>
                        {lucroLiquido < 0 ? '- ' : ''}
                        {formatarMoeda(Math.abs(lucroLiquido))}
                    </Text>

                    {/* Comparação com semana anterior */}
                    {lucroSemanaAnterior !== 0 && (
                        <View style={styles.comparacaoContainer}>
                            <IconeTendencia
                                size={16}
                                color={variacao >= 0 ? '#86EFAC' : '#FCA5A5'}
                            />
                            <Text style={[
                                styles.comparacaoTexto,
                                { color: variacao >= 0 ? '#86EFAC' : '#FCA5A5' }
                            ]}>
                                {variacao >= 0 ? '+' : ''}{variacao.toFixed(1)}% vs semana anterior
                            </Text>
                        </View>
                    )}

                    {/* Barra de progresso da meta */}
                    {metaSemanal > 0 && (
                        <View style={styles.metaContainer}>
                            <View style={styles.metaHeader}>
                                <View style={styles.metaLabelContainer}>
                                    <Target size={14} color={CORES.TEXTO_SECUNDARIO} />
                                    <Text style={styles.metaLabel}>
                                        Meta: {formatarMoeda(metaSemanal)}
                                    </Text>
                                </View>
                                <Text style={styles.metaProgresso}>
                                    {Math.round(progressoMeta)}%
                                </Text>
                            </View>
                            
                            <View style={styles.barraFundo}>
                                <Animated.View
                                    style={[styles.barraProgresso, estiloBarraProgresso]}
                                />
                            </View>
                        </View>
                    )}
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
}

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 20,
        // Sombra iOS
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        // Sombra Android
        elevation: 12,
    },
    gradiente: {
        padding: 20,
        borderRadius: 20,
        minHeight: 160,
    },
    badgeMeta: {
        position: 'absolute',
        top: 12,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    badgeMetaTexto: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: {
        color: CORES.TEXTO_SECUNDARIO,
        fontSize: 14,
        fontWeight: '600',
    },
    valor: {
        color: CORES.TEXTO_PRIMARIO,
        fontSize: 42,
        fontWeight: '800',
        letterSpacing: -1,
        marginBottom: 8,
    },
    comparacaoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 16,
    },
    comparacaoTexto: {
        fontSize: 13,
        fontWeight: '600',
    },
    metaContainer: {
        marginTop: 8,
    },
    metaHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    metaLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaLabel: {
        color: CORES.TEXTO_SECUNDARIO,
        fontSize: 13,
        fontWeight: '500',
    },
    metaProgresso: {
        color: CORES.TEXTO_PRIMARIO,
        fontSize: 14,
        fontWeight: '700',
    },
    barraFundo: {
        height: 8,
        backgroundColor: CORES.BARRA_FUNDO,
        borderRadius: 4,
        overflow: 'hidden',
    },
    barraProgresso: {
        height: '100%',
        backgroundColor: CORES.BARRA_PROGRESSO,
        borderRadius: 4,
    },
});

export default LucroHeroCard;
