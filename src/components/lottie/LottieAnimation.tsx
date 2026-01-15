// src/components/lottie/LottieAnimation.tsx
// ============================================
// ROTAFRETE - Componente Base de Animação Lottie
// ============================================
// Wrapper reutilizável para animações Lottie
// ============================================

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';
import { LOTTIE_FILES, type LottieFileKey } from './lottieFiles';

interface LottieAnimationProps {
    /** Nome do arquivo Lottie (sem extensão) */
    name: LottieFileKey;
    /** Largura da animação */
    width?: number;
    /** Altura da animação */
    height?: number;
    /** Se deve rodar automaticamente (padrão: true) */
    autoPlay?: boolean;
    /** Se deve repetir (padrão: true) */
    loop?: boolean;
    /** Velocidade da animação (1 = normal) */
    speed?: number;
    /** Estilo adicional do container */
    style?: ViewStyle;
}

export function LottieAnimation({
    name,
    width = 100,
    height = 100,
    autoPlay = true,
    loop = true,
    speed = 1,
    style,
}: LottieAnimationProps) {
    const source = LOTTIE_FILES[name];

    console.log('[LottieAnimation] Rendering:', { name, hasSource: !!source, width, height });

    if (!source) {
        console.warn(`[LottieAnimation] Arquivo não encontrado: ${name}`);
        console.warn('[LottieAnimation] Arquivos disponíveis:', Object.keys(LOTTIE_FILES));
        return (
            <View style={[styles.container, { width, height }, style]}>
                <Text style={{ color: 'red', fontSize: 10 }}>
                    Lottie não encontrado: {name}
                </Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { width, height }, style]}>
            <LottieView
                source={source}
                autoPlay={autoPlay}
                loop={loop}
                speed={speed}
                style={{ width, height }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});
