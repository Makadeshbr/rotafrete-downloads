// src/components/dashboard/ConquistasCard.tsx
// ============================================
// ROTAFRETE - Card de Conquistas
// ============================================
// Exibe conquistas desbloqueadas e em progresso
// com barras de progresso e animações.
// Inclui toast de celebração para novas conquistas.
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
import * as Haptics from 'expo-haptics';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withDelay,
    withSequence,
    withTiming,
    runOnJS,
    FadeIn,
    FadeOut,
    SlideInRight,
} from 'react-native-reanimated';
import { Award, ChevronRight, Lock, CheckCircle } from 'lucide-react-native';

import type { Conquista } from '@/store/useMetasStore';

// ============================================
// TIPOS
// ============================================

interface ConquistasCardProps {
    /** Lista de conquistas do usuário */
    conquistas: Conquista[];
    /** Máximo de conquistas a exibir */
    maxExibir?: number;
    /** Callback ao pressionar "Ver todas" */
    onPressVerTodas?: () => void;
}

interface NovaConquistaToastProps {
    /** Conquista recém-desbloqueada */
    conquista: Conquista;
    /** Callback ao dispensar o toast */
    onDismiss: () => void;
}

// ============================================
// CONSTANTES
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CORES = {
    FUNDO_CARD: '#1E293B',
    FUNDO_ITEM: '#0F172A',
    BORDA: '#334155',
    TEXTO_PRIMARIO: '#FFFFFF',
    TEXTO_SECUNDARIO: '#94A3B8',
    TEXTO_MUTED: '#64748B',
    PROGRESSO_FUNDO: '#334155',
    PROGRESSO_BARRA: '#3B82F6',
    DESBLOQUEADA: '#22C55E',
    BLOQUEADA: '#475569',
};

// ============================================
// COMPONENTE: Item de Conquista Individual
// ============================================

interface ConquistaItemProps {
    conquista: Conquista;
    indice: number;
}

function ConquistaItem({ conquista, indice }: ConquistaItemProps) {
    const desbloqueada = conquista.desbloqueadaEm !== null;
    const animacaoEntrada = useSharedValue(0);

    useEffect(() => {
        animacaoEntrada.value = withDelay(
            indice * 100,
            withSpring(1, { damping: 15, stiffness: 100 })
        );
    }, []);

    const estiloAnimado = useAnimatedStyle(() => ({
        opacity: animacaoEntrada.value,
        transform: [
            { translateX: (1 - animacaoEntrada.value) * 30 },
        ],
    }));

    return (
        <Animated.View style={[styles.conquistaItem, estiloAnimado]}>
            {/* Ícone da conquista */}
            <View style={[
                styles.conquistaIcone,
                desbloqueada ? styles.conquistaIconeDesbloqueada : styles.conquistaIconeBloqueada,
            ]}>
                <Text style={styles.conquistaEmoji}>{conquista.icone}</Text>
                {desbloqueada && (
                    <View style={styles.checkBadge}>
                        <CheckCircle size={12} color="#FFF" />
                    </View>
                )}
            </View>

            {/* Info da conquista */}
            <View style={styles.conquistaInfo}>
                <Text style={[
                    styles.conquistaNome,
                    !desbloqueada && styles.conquistaNomeBloqueada,
                ]}>
                    {conquista.nome}
                </Text>
                <Text style={styles.conquistaDescricao} numberOfLines={1}>
                    {conquista.descricao}
                </Text>

                {/* Barra de progresso (só se não desbloqueada) */}
                {!desbloqueada && conquista.progresso > 0 && (
                    <View style={styles.progressoContainer}>
                        <View style={styles.progressoFundo}>
                            <View
                                style={[
                                    styles.progressoBarra,
                                    { width: `${Math.min(conquista.progresso, 100)}%` },
                                ]}
                            />
                        </View>
                        <Text style={styles.progressoTexto}>
                            {Math.round(conquista.progresso)}%
                        </Text>
                    </View>
                )}
            </View>

            {/* Status */}
            {desbloqueada ? (
                <View style={styles.statusDesbloqueada}>
                    <CheckCircle size={16} color={CORES.DESBLOQUEADA} />
                </View>
            ) : (
                <Lock size={16} color={CORES.BLOQUEADA} />
            )}
        </Animated.View>
    );
}

// ============================================
// COMPONENTE PRINCIPAL: Card de Conquistas
// ============================================

export function ConquistasCard({
    conquistas,
    maxExibir = 3,
    onPressVerTodas,
}: ConquistasCardProps) {
    // Ordena: desbloqueadas primeiro, depois por progresso
    const conquistasOrdenadas = [...conquistas].sort((a, b) => {
        // Desbloqueadas primeiro
        if (a.desbloqueadaEm && !b.desbloqueadaEm) return -1;
        if (!a.desbloqueadaEm && b.desbloqueadaEm) return 1;
        
        // Por progresso (maior primeiro)
        return b.progresso - a.progresso;
    });

    const conquistasVisiveis = conquistasOrdenadas.slice(0, maxExibir);
    const totalDesbloqueadas = conquistas.filter(c => c.desbloqueadaEm).length;
    const totalConquistas = conquistas.length;
    const temMais = conquistas.length > maxExibir;

    const handleVerTodas = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPressVerTodas?.();
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Award size={20} color="#F59E0B" />
                    <Text style={styles.titulo}>Conquistas</Text>
                    <View style={styles.contadorBadge}>
                        <Text style={styles.contadorTexto}>
                            {totalDesbloqueadas}/{totalConquistas}
                        </Text>
                    </View>
                </View>

                {temMais && onPressVerTodas && (
                    <TouchableOpacity
                        style={styles.verTodasBtn}
                        onPress={handleVerTodas}
                    >
                        <Text style={styles.verTodasTexto}>Ver todas</Text>
                        <ChevronRight size={16} color="#3B82F6" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Lista de conquistas */}
            <View style={styles.lista}>
                {conquistasVisiveis.map((conquista, index) => (
                    <ConquistaItem
                        key={conquista.id}
                        conquista={conquista}
                        indice={index}
                    />
                ))}
            </View>

            {/* Mensagem se nenhuma conquista */}
            {conquistasVisiveis.length === 0 && (
                <View style={styles.vazioContainer}>
                    <Lock size={24} color={CORES.TEXTO_MUTED} />
                    <Text style={styles.vazioTexto}>
                        Registre rotas para desbloquear conquistas!
                    </Text>
                </View>
            )}
        </View>
    );
}

// ============================================
// COMPONENTE: Toast de Nova Conquista
// ============================================

export function NovaConquistaToast({ conquista, onDismiss }: NovaConquistaToastProps) {
    const [visivel, setVisivel] = useState(true);

    useEffect(() => {
        // Haptic de celebração
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        // Auto-dismiss após 4 segundos
        const timer = setTimeout(() => {
            setVisivel(false);
            setTimeout(onDismiss, 300); // Aguarda animação de saída
        }, 4000);

        return () => clearTimeout(timer);
    }, []);

    if (!visivel) {
        return null;
    }

    return (
        <Animated.View
            entering={SlideInRight.springify().damping(15)}
            exiting={FadeOut.duration(200)}
            style={styles.toastContainer}
        >
            <TouchableOpacity
                style={styles.toast}
                onPress={onDismiss}
                activeOpacity={0.9}
            >
                {/* Ícone */}
                <View style={styles.toastIcone}>
                    <Text style={styles.toastEmoji}>{conquista.icone}</Text>
                </View>

                {/* Conteúdo */}
                <View style={styles.toastConteudo}>
                    <Text style={styles.toastLabel}>CONQUISTA DESBLOQUEADA!</Text>
                    <Text style={styles.toastNome}>{conquista.nome}</Text>
                </View>

                {/* Indicador de dismiss */}
                <View style={styles.toastDismiss}>
                    <Text style={styles.toastDismissTexto}>✕</Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
    // Container principal
    container: {
        backgroundColor: CORES.FUNDO_CARD,
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: CORES.BORDA,
    },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    titulo: {
        fontSize: 16,
        fontWeight: '700',
        color: CORES.TEXTO_PRIMARIO,
    },
    contadorBadge: {
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    contadorTexto: {
        fontSize: 12,
        fontWeight: '700',
        color: '#F59E0B',
    },
    verTodasBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    verTodasTexto: {
        fontSize: 13,
        fontWeight: '600',
        color: '#3B82F6',
    },

    // Lista
    lista: {
        gap: 12,
    },

    // Item de conquista
    conquistaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CORES.FUNDO_ITEM,
        padding: 12,
        borderRadius: 12,
        gap: 12,
    },
    conquistaIcone: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    conquistaIconeDesbloqueada: {
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
    },
    conquistaIconeBloqueada: {
        backgroundColor: 'rgba(71, 85, 105, 0.3)',
    },
    conquistaEmoji: {
        fontSize: 22,
    },
    checkBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: CORES.DESBLOQUEADA,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: CORES.FUNDO_ITEM,
    },
    conquistaInfo: {
        flex: 1,
    },
    conquistaNome: {
        fontSize: 14,
        fontWeight: '700',
        color: CORES.TEXTO_PRIMARIO,
        marginBottom: 2,
    },
    conquistaNomeBloqueada: {
        color: CORES.TEXTO_SECUNDARIO,
    },
    conquistaDescricao: {
        fontSize: 12,
        color: CORES.TEXTO_MUTED,
    },

    // Progresso
    progressoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 6,
    },
    progressoFundo: {
        flex: 1,
        height: 4,
        backgroundColor: CORES.PROGRESSO_FUNDO,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressoBarra: {
        height: '100%',
        backgroundColor: CORES.PROGRESSO_BARRA,
        borderRadius: 2,
    },
    progressoTexto: {
        fontSize: 11,
        fontWeight: '600',
        color: CORES.TEXTO_SECUNDARIO,
        minWidth: 32,
        textAlign: 'right',
    },

    // Status
    statusDesbloqueada: {
        opacity: 1,
    },

    // Vazio
    vazioContainer: {
        alignItems: 'center',
        paddingVertical: 24,
        gap: 8,
    },
    vazioTexto: {
        fontSize: 14,
        color: CORES.TEXTO_MUTED,
        textAlign: 'center',
    },

    // Toast
    toastContainer: {
        position: 'absolute',
        top: 60,
        left: 16,
        right: 16,
        zIndex: 9999,
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#15803D',
        borderRadius: 16,
        padding: 16,
        gap: 12,
        // Sombra
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 16,
    },
    toastIcone: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    toastEmoji: {
        fontSize: 28,
    },
    toastConteudo: {
        flex: 1,
    },
    toastLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: 'rgba(255, 255, 255, 0.8)',
        letterSpacing: 1,
        marginBottom: 2,
    },
    toastNome: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
    },
    toastDismiss: {
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    toastDismissTexto: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.6)',
    },
});

export default ConquistasCard;
