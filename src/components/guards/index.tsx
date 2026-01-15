// src/components/guards/index.tsx
// ============================================
// ROTAFRETE - Guards de Autenticação
// ============================================
// Componentes de guarda para proteção de rotas.
// Re-exporta guards do SDK com customizações.
// ============================================

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Truck } from 'lucide-react-native';

// Re-exporta os guards do SDK para uso direto
export { AuthGuard, GuestGuard, RoleGuard } from '@aether-baas/react-native';

// ============================================
// LOADING SCREEN
// ============================================

/**
 * Tela de loading estilizada para o RotaFrete.
 * Usada como fallback nos guards de autenticação.
 * 
 * @example
 * ```tsx
 * <AuthGuard loadingComponent={<LoadingScreen />}>
 *   <ProtectedContent />
 * </AuthGuard>
 * ```
 */
export function LoadingScreen() {
    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0F172A', '#020617']}
                style={styles.gradient}
            >
                <View style={styles.content}>
                    {/* Logo animado */}
                    <View style={styles.logoContainer}>
                        <LinearGradient
                            colors={['#FF6B00', '#EA580C']}
                            style={styles.logoGradient}
                        >
                            <Truck size={40} color="#FFFFFF" />
                        </LinearGradient>
                    </View>

                    {/* Nome do app */}
                    <Text style={styles.appName}>RotaFrete</Text>

                    {/* Indicador de carregamento */}
                    <ActivityIndicator
                        size="large"
                        color="#FF6B00"
                        style={styles.loader}
                    />

                    {/* Texto de status */}
                    <Text style={styles.statusText}>Carregando...</Text>
                </View>

                {/* Versão no footer */}
                <Text style={styles.version}>v1.0.0</Text>
            </LinearGradient>
        </View>
    );
}

// ============================================
// SPLASH SCREEN CUSTOMIZADA
// ============================================

interface SplashProps {
    /** Mensagem de status opcional */
    message?: string;
}

/**
 * Splash screen customizada para estados de transição.
 * 
 * @param message - Mensagem opcional a exibir
 */
export function SplashScreen({ message = 'Preparando sua experiência...' }: SplashProps) {
    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0F172A', '#020617']}
                style={styles.gradient}
            >
                <View style={styles.content}>
                    {/* Logo */}
                    <View style={styles.logoContainer}>
                        <LinearGradient
                            colors={['#FF6B00', '#EA580C']}
                            style={styles.logoGradient}
                        >
                            <Truck size={48} color="#FFFFFF" />
                        </LinearGradient>
                    </View>

                    {/* Nome do app */}
                    <Text style={styles.appNameLarge}>RotaFrete</Text>
                    <Text style={styles.tagline}>Seu frete, sua rota, seu controle.</Text>

                    {/* Loader */}
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="small" color="#FF6B00" />
                        <Text style={styles.loaderText}>{message}</Text>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Powered by Aether Platform</Text>
                    <Text style={styles.version}>v1.0.0</Text>
                </View>
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
    gradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
    },

    // Logo
    logoContainer: {
        marginBottom: 24,
        shadowColor: '#FF6B00',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 12,
    },
    logoGradient: {
        width: 80,
        height: 80,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // App Name
    appName: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 32,
        letterSpacing: 1,
    },
    appNameLarge: {
        fontSize: 36,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 8,
        letterSpacing: 1,
    },
    tagline: {
        fontSize: 14,
        color: '#94A3B8',
        marginBottom: 48,
    },

    // Loader
    loader: {
        marginBottom: 16,
    },
    statusText: {
        fontSize: 14,
        color: '#64748B',
    },
    loaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#1E293B',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
    },
    loaderText: {
        fontSize: 14,
        color: '#94A3B8',
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 48,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        color: '#475569',
        marginBottom: 4,
    },
    version: {
        position: 'absolute',
        bottom: 24,
        fontSize: 12,
        color: '#334155',
    },
});
