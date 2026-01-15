// src/components/dashboard/StreakCounter.tsx
// ============================================
// ROTAFRETE - Contador de Streak (Dias Consecutivos)
// ============================================
// Exibe quantos dias seguidos o motorista
// trabalhou, com feedback visual progressivo
// e animações motivacionais.
// ============================================

import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    withSpring,
    Easing,
} from 'react-native-reanimated';
import { Flame, Zap, Star, Trophy, Award, Target } from 'lucide-react-native';

// ============================================
// TIPOS
// ============================================

interface StreakCounterProps {
    /** Número de dias consecutivos trabalhados */
    dias: number;
    /** Callback ao pressionar o contador */
    onPress?: () => void;
    /** Variante de exibição */
    variante?: 'compacto' | 'padrao' | 'celebracao';
}

interface NivelStreak {
    minDias: number;
    maxDias: number;
    nome: string;
    icone: typeof Flame;
    cor: string;
    corFundo: string;
    mensagem: string;
}

// ============================================
// NÍVEIS DE STREAK
// ============================================

const NIVEIS_STREAK: NivelStreak[] = [
    {
        minDias: 0,
        maxDias: 2,
        nome: 'Iniciante',
        icone: Flame,
        cor: '#64748B',
        corFundo: '#1E293B',
        mensagem: 'Continue assim!',
    },
    {
        minDias: 3,
        maxDias: 6,
        nome: 'Bom começo',
        icone: Zap,
        cor: '#22C55E',
        corFundo: 'rgba(34, 197, 94, 0.15)',
        mensagem: 'Bom começo!',
    },
    {
        minDias: 7,
        maxDias: 13,
        nome: 'Firme e forte',
        icone: Target,
        cor: '#EAB308',
        corFundo: 'rgba(234, 179, 8, 0.15)',
        mensagem: 'Firme e forte!',
    },
    {
        minDias: 14,
        maxDias: 29,
        nome: 'Em chamas',
        icone: Flame,
        cor: '#F97316',
        corFundo: 'rgba(249, 115, 22, 0.15)',
        mensagem: 'Em chamas! 🔥',
    },
    {
        minDias: 30,
        maxDias: 59,
        nome: 'Épico',
        icone: Star,
        cor: '#A855F7',
        corFundo: 'rgba(168, 85, 247, 0.15)',
        mensagem: 'Épico!',
    },
    {
        minDias: 60,
        maxDias: Infinity,
        nome: 'Lendário',
        icone: Trophy,
        cor: '#F59E0B',
        corFundo: 'rgba(245, 158, 11, 0.2)',
        mensagem: 'Lendário! 🏆',
    },
];

// ============================================
// HELPER: Obter nível atual do streak
// ============================================

function obterNivelStreak(dias: number): NivelStreak {
    for (const nivel of NIVEIS_STREAK) {
        if (dias >= nivel.minDias && dias <= nivel.maxDias) {
            return nivel;
        }
    }
    return NIVEIS_STREAK[0];
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function StreakCounter({
    dias,
    onPress,
    variante = 'padrao',
}: StreakCounterProps) {
    // Animações
    const escala = useSharedValue(1);
    const rotacao = useSharedValue(0);

    const nivel = obterNivelStreak(dias);
    const Icone = nivel.icone;

    // Animação de pulso para streaks altos
    useEffect(() => {
        if (dias >= 7) {
            // Pulso contínuo para streaks significativos
            escala.value = withRepeat(
                withSequence(
                    withTiming(1.05, { duration: 800, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
                ),
                -1, // Infinito
                true // Reverso
            );
        }
        
        if (dias >= 30) {
            // Leve rotação para streaks épicos
            rotacao.value = withRepeat(
                withSequence(
                    withTiming(3, { duration: 1500 }),
                    withTiming(-3, { duration: 1500 })
                ),
                -1,
                true
            );
        }
    }, [dias]);

    // Estilo animado
    const estiloAnimado = useAnimatedStyle(() => ({
        transform: [
            { scale: escala.value },
            { rotate: `${rotacao.value}deg` },
        ],
    }));

    // Handler de press com haptic
    const handlePress = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress?.();
    };

    // Renderização compacta (para usar em headers)
    if (variante === 'compacto') {
        return (
            <TouchableOpacity
                style={[styles.containerCompacto, { backgroundColor: nivel.corFundo }]}
                onPress={handlePress}
                activeOpacity={0.8}
            >
                <Icone size={14} color={nivel.cor} />
                <Text style={[styles.diasCompacto, { color: nivel.cor }]}>
                    {dias}
                </Text>
            </TouchableOpacity>
        );
    }

    // Renderização padrão
    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={handlePress}
            disabled={!onPress}
        >
            <Animated.View
                style={[
                    styles.container,
                    { backgroundColor: nivel.corFundo, borderColor: nivel.cor },
                    estiloAnimado,
                ]}
            >
                {/* Ícone */}
                <View style={[styles.iconeContainer, { backgroundColor: nivel.cor }]}>
                    <Icone size={20} color="#FFF" />
                </View>

                {/* Conteúdo */}
                <View style={styles.conteudo}>
                    <View style={styles.diasContainer}>
                        <Text style={[styles.diasNumero, { color: nivel.cor }]}>
                            {dias}
                        </Text>
                        <Text style={styles.diasLabel}>
                            {dias === 1 ? 'dia' : 'dias'} seguidos
                        </Text>
                    </View>
                    
                    <Text style={[styles.mensagem, { color: nivel.cor }]}>
                        {nivel.mensagem}
                    </Text>
                </View>

                {/* Indicador de nível */}
                {dias >= 7 && (
                    <View style={[styles.badge, { backgroundColor: nivel.cor }]}>
                        <Text style={styles.badgeTexto}>{nivel.nome}</Text>
                    </View>
                )}
            </Animated.View>
        </TouchableOpacity>
    );
}

// ============================================
// COMPONENTE: Modal de Milestone do Streak
// ============================================

interface StreakMilestoneProps {
    dias: number;
    visivel: boolean;
    onFechar: () => void;
}

export function StreakMilestone({ dias, visivel, onFechar }: StreakMilestoneProps) {
    const nivel = obterNivelStreak(dias);
    const Icone = nivel.icone;

    if (!visivel) return null;

    return (
        <View style={styles.milestoneOverlay}>
            <View style={[styles.milestoneCard, { borderColor: nivel.cor }]}>
                <View style={[styles.milestoneIcone, { backgroundColor: nivel.cor }]}>
                    <Icone size={48} color="#FFF" />
                </View>
                
                <Text style={styles.milestoneNumero}>{dias}</Text>
                <Text style={styles.milestoneDias}>dias consecutivos!</Text>
                <Text style={[styles.milestoneNivel, { color: nivel.cor }]}>
                    {nivel.nome}
                </Text>
                <Text style={styles.milestoneMensagem}>
                    Parabéns! Você está construindo um hábito incrível de trabalho consistente.
                </Text>

                <TouchableOpacity
                    style={[styles.milestoneBotao, { backgroundColor: nivel.cor }]}
                    onPress={onFechar}
                >
                    <Text style={styles.milestoneBotaoTexto}>Continuar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
    // Container padrão
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginVertical: 8,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        gap: 12,
    },
    
    // Container compacto
    containerCompacto: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 4,
    },
    diasCompacto: {
        fontSize: 14,
        fontWeight: '700',
    },

    // Ícone
    iconeContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Conteúdo
    conteudo: {
        flex: 1,
    },
    diasContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
    },
    diasNumero: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -1,
    },
    diasLabel: {
        fontSize: 14,
        color: '#94A3B8',
        fontWeight: '500',
    },
    mensagem: {
        fontSize: 13,
        fontWeight: '600',
        marginTop: 2,
    },

    // Badge de nível
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeTexto: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // Milestone overlay
    milestoneOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    milestoneCard: {
        backgroundColor: '#1E293B',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        marginHorizontal: 24,
        borderWidth: 2,
    },
    milestoneIcone: {
        width: 96,
        height: 96,
        borderRadius: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    milestoneNumero: {
        fontSize: 64,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: -2,
    },
    milestoneDias: {
        fontSize: 18,
        color: '#94A3B8',
        fontWeight: '600',
        marginBottom: 8,
    },
    milestoneNivel: {
        fontSize: 20,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
    },
    milestoneMensagem: {
        fontSize: 14,
        color: '#CBD5E1',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    milestoneBotao: {
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 12,
    },
    milestoneBotaoTexto: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default StreakCounter;
