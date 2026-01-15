// src/components/common/AssistenteFAB.tsx
// ============================================
// ROTAFRETE - Floating Action Button do Assistente IA
// ============================================
// Botão flutuante que aparece em todas as telas
// para acesso rápido ao assistente de IA.
// Posicionado acima da tab bar.
// ============================================

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    Dimensions,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withRepeat,
    withSequence,
    withTiming,
    Easing,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import { MessageCircle, X, Sparkles } from 'lucide-react-native';

// ============================================
// TIPOS
// ============================================

interface AssistenteFABProps {
    /** Ocultar em certas telas */
    ocultarEm?: string[];
}

// ============================================
// CONSTANTES
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FAB_SIZE = 60;
const FAB_MARGIN = 16;

// Posição acima da tab bar
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 70;
const FAB_BOTTOM = TAB_BAR_HEIGHT + 16;

const CORES = {
    PRIMARIO: '#8B5CF6',      // Roxo (cor do assistente)
    PRIMARIO_ESCURO: '#7C3AED',
    FUNDO: '#1E293B',
    TEXTO: '#FFFFFF',
    BRILHO: '#A78BFA',
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function AssistenteFAB({ ocultarEm = [] }: AssistenteFABProps) {
    const router = useRouter();
    const pathname = usePathname();
    
    // Animações
    const escala = useSharedValue(1);
    const rotacao = useSharedValue(0);
    const brilho = useSharedValue(0);

    // Verifica se deve ocultar na tela atual
    const deveOcultar = ocultarEm.some((rota) => pathname.includes(rota));
    
    // Já está na tela de assistente
    const naTelaAssistente = pathname.includes('assistant');

    // Animação de pulso sutil
    useEffect(() => {
        // Pulso de "atenção" a cada 5 segundos
        const interval = setInterval(() => {
            brilho.value = withSequence(
                withTiming(1, { duration: 300 }),
                withTiming(0, { duration: 300 })
            );
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    // Estilo animado do FAB
    const estiloAnimado = useAnimatedStyle(() => ({
        transform: [
            { scale: escala.value },
            { rotate: `${rotacao.value}deg` },
        ],
    }));

    // Estilo do brilho
    const estiloBrilho = useAnimatedStyle(() => ({
        opacity: interpolate(brilho.value, [0, 1], [0, 0.6]),
        transform: [{ scale: interpolate(brilho.value, [0, 1], [1, 1.3]) }],
    }));

    // Handler de press
    const handlePress = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        // Animação de feedback
        escala.value = withSequence(
            withTiming(0.9, { duration: 100 }),
            withSpring(1, { damping: 10 })
        );

        // Navega para o assistente
        router.push('/(tabs)/assistant');
    };

    // Não renderiza se deve ocultar ou já está na tela
    if (deveOcultar || naTelaAssistente) {
        return null;
    }

    return (
        <View style={styles.container}>
            {/* Efeito de brilho */}
            <Animated.View style={[styles.brilhoCirculo, estiloBrilho]} />
            
            {/* FAB principal */}
            <Animated.View style={[styles.fabContainer, estiloAnimado]}>
                <TouchableOpacity
                    style={styles.fab}
                    onPress={handlePress}
                    activeOpacity={0.8}
                >
                    {/* Ícone de sparkles no canto */}
                    <View style={styles.sparklesBadge}>
                        <Sparkles size={12} color="#FFF" />
                    </View>
                    
                    <MessageCircle
                        size={28}
                        color={CORES.TEXTO}
                        fill={CORES.TEXTO}
                        strokeWidth={0}
                    />
                </TouchableOpacity>
            </Animated.View>

            {/* Label "IA" */}
            <View style={styles.labelContainer}>
                <Text style={styles.label}>IA</Text>
            </View>
        </View>
    );
}

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        right: FAB_MARGIN,
        bottom: FAB_BOTTOM,
        alignItems: 'center',
        zIndex: 1000,
    },
    fabContainer: {
        // Sombra
        shadowColor: CORES.PRIMARIO,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    fab: {
        width: FAB_SIZE,
        height: FAB_SIZE,
        borderRadius: FAB_SIZE / 2,
        backgroundColor: CORES.PRIMARIO,
        justifyContent: 'center',
        alignItems: 'center',
        // Gradiente simulado com borda
        borderWidth: 2,
        borderColor: CORES.BRILHO,
    },
    sparklesBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: CORES.PRIMARIO_ESCURO,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: CORES.BRILHO,
    },
    brilhoCirculo: {
        position: 'absolute',
        width: FAB_SIZE + 20,
        height: FAB_SIZE + 20,
        borderRadius: (FAB_SIZE + 20) / 2,
        backgroundColor: CORES.PRIMARIO,
        top: -10,
    },
    labelContainer: {
        marginTop: 4,
        backgroundColor: CORES.FUNDO,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    label: {
        color: CORES.TEXTO,
        fontSize: 10,
        fontWeight: '700',
    },
});

export default AssistenteFAB;
