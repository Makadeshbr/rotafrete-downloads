// src/components/ui/UpdateModal.tsx
// ============================================
// ROTAFRETE - Modal de Atualização Disponível
// ============================================
// Modal premium para informar sobre nova versão:
// - Changelog com notas de atualização
// - Progresso de download
// - Opções: atualizar agora, depois, pular versão
// ============================================

import React, { memo, useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Animated,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Download,
    X,
    Sparkles,
    AlertTriangle,
    CheckCircle,
    Clock,
    FileDown,
    ExternalLink,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import {
    appUpdateService,
    type AppVersion,
    type DownloadProgress,
} from '@/services/app-update-service';

// ============================================
// TIPOS
// ============================================

interface UpdateModalProps {
    /** Se o modal está visível */
    visible: boolean;
    /** Versão disponível para atualização */
    version: AppVersion | null;
    /** Versão atual do app */
    currentVersion: string;
    /** Callback para fechar o modal */
    onClose: () => void;
    /** Callback quando skip é pressionado */
    onSkip?: () => void;
    /** Callback quando atualização é concluída */
    onUpdateComplete?: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================
// COMPONENTE
// ============================================

export const UpdateModal = memo(function UpdateModal({
    visible,
    version,
    currentVersion,
    onClose,
    onSkip,
    onUpdateComplete,
}: UpdateModalProps) {
    const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>({
        downloadedBytes: 0,
        totalBytes: 0,
        progress: 0,
        status: 'idle',
    });
    const [scaleAnim] = useState(new Animated.Value(0.9));
    const [opacityAnim] = useState(new Animated.Value(0));

    // Animação de entrada
    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            scaleAnim.setValue(0.9);
            opacityAnim.setValue(0);
        }
    }, [visible]);

    // Subscribe ao progresso do download
    useEffect(() => {
        const unsubscribe = appUpdateService.addProgressListener((progress) => {
            setDownloadProgress(progress);
        });
        return unsubscribe;
    }, []);

    // Auto-instala quando download completa
    useEffect(() => {
        if (downloadProgress.status === 'completed' && version) {
            const autoInstall = async () => {
                try {
                    await appUpdateService.installVersion(version);
                } catch (error) {
                    console.error('[UpdateModal] Erro ao auto-instalar:', error);
                }
            };
            autoInstall();
        }
    }, [downloadProgress.status, version]);

    if (!version) return null;

    // ─── Handlers ─────────────────────────────
    const handleDownload = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            // 1. Primeiro, solicita permissão para instalar apps de fontes desconhecidas
            await appUpdateService.requestInstallPermission();

            // 2. Pequeno delay para dar tempo do usuário retornar
            await new Promise(resolve => setTimeout(resolve, 500));

            // 3. Baixa o APK
            const fileUri = await appUpdateService.downloadUpdate(version);

            // 4. Quando download completar, tenta instalar
            if (fileUri) {
                await appUpdateService.installUpdate(fileUri);
            }

            onUpdateComplete?.();
        } catch (error: any) {
            console.error('[UpdateModal] Erro:', error);

            // Mostra erro específico para APK corrompido
            if (error.message?.includes('corrompido') || error.message?.includes('inválido')) {
                setDownloadProgress({
                    ...downloadProgress,
                    status: 'failed',
                    error: 'APK corrompido. O download pode ter sido interrompido.',
                });
                return;
            }

            // Se download/instalação falhar, oferece abrir no navegador
            try {
                await appUpdateService.openDownloadUrl(version);
            } catch {
                // Ignora
            }
        }
    };

    const handleOpenBrowser = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await appUpdateService.openDownloadUrl(version);
            onClose();
        } catch (error) {
            console.error('[UpdateModal] Erro ao abrir URL:', error);
        }
    };

    const handleSkip = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await appUpdateService.skipVersion(version.version);
        onSkip?.();
        onClose();
    };

    const handleLater = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onClose();
    };

    const handleCancel = async () => {
        await appUpdateService.cancelDownload();
        setDownloadProgress({
            downloadedBytes: 0,
            totalBytes: 0,
            progress: 0,
            status: 'idle',
        });
    };

    // ─── Formatar tamanho do arquivo ──────────
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        }
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // ─── Render de conteúdo baseado no status ─
    const renderContent = () => {
        const { status, progress, downloadedBytes, totalBytes } = downloadProgress;

        // Downloading
        if (status === 'downloading') {
            return (
                <View style={styles.downloadingContainer}>
                    <View style={styles.progressCircle}>
                        <Text style={styles.progressText}>{progress}%</Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                        <View style={[styles.progressBar, { width: `${progress}%` }]} />
                    </View>
                    <Text style={styles.progressLabel}>
                        {formatFileSize(downloadedBytes)} / {formatFileSize(totalBytes)}
                    </Text>
                    <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                        <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        // Completed
        if (status === 'completed') {
            return (
                <View style={styles.completedContainer}>
                    <CheckCircle size={64} color="#10B981" />
                    <Text style={styles.completedText}>                        Download concluído!
                    </Text>
                    <Text style={styles.completedSubtext}>
                        Toque abaixo para instalar.
                    </Text>
                    <TouchableOpacity
                        style={[styles.downloadButton, { marginTop: 20, width: '100%' }]}
                        onPress={() => version && appUpdateService.installVersion(version).catch(() => { })}
                    >
                        <LinearGradient
                            colors={['#10B981', '#059669']}
                            style={styles.downloadButtonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Download size={20} color="#FFF" />
                            <Text style={styles.downloadButtonText}>Instalar Agora</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            );
        }

        // Failed
        if (status === 'failed') {
            return (
                <View style={styles.failedContainer}>
                    <AlertTriangle size={48} color="#EF4444" />
                    <Text style={styles.failedText}>Falha no download</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={handleDownload}>
                        <Text style={styles.retryButtonText}>Tentar novamente</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.browserButton} onPress={handleOpenBrowser}>
                        <ExternalLink size={16} color="#64748B" />
                        <Text style={styles.browserButtonText}>Baixar no navegador</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        // Idle - Mostra info da versão
        return (
            <>
                {/* Info da versão */}
                <View style={styles.versionInfo}>
                    <View style={styles.versionRow}>
                        <Text style={styles.versionLabel}>Atual:</Text>
                        <Text style={styles.versionValue}>{currentVersion}</Text>
                    </View>
                    <View style={styles.versionArrow}>
                        <Text style={styles.versionArrowText}>→</Text>
                    </View>
                    <View style={styles.versionRow}>
                        <Text style={styles.versionLabel}>Nova:</Text>
                        <Text style={[styles.versionValue, styles.versionHighlight]}>
                            {version.version}
                        </Text>
                    </View>
                </View>

                {/* Tamanho do arquivo */}
                <View style={styles.fileSizeRow}>
                    <FileDown size={14} color="#64748B" />
                    <Text style={styles.fileSizeText}>
                        {formatFileSize(version.fileSize)}
                    </Text>
                </View>

                {/* Release notes */}
                {version.releaseNotes && (
                    <View style={styles.releaseNotesContainer}>
                        <Text style={styles.releaseNotesTitle}>Novidades:</Text>
                        <ScrollView style={styles.releaseNotesScroll} nestedScrollEnabled>
                            <Text style={styles.releaseNotesText}>{version.releaseNotes}</Text>
                        </ScrollView>
                    </View>
                )}

                {/* Botões de ação */}
                <View style={styles.actionsContainer}>
                    {/* Botão principal: Download */}
                    <TouchableOpacity
                        style={styles.downloadButton}
                        onPress={handleDownload}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#FF6B00', '#EA580C']}
                            style={styles.downloadButtonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Download size={20} color="#FFF" />
                            <Text style={styles.downloadButtonText}>Atualizar Agora</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Opção: Abrir no navegador */}
                    <TouchableOpacity style={styles.browserButton} onPress={handleOpenBrowser}>
                        <ExternalLink size={16} color="#64748B" />
                        <Text style={styles.browserButtonText}>Baixar no navegador</Text>
                    </TouchableOpacity>

                    {/* Opções secundárias */}
                    <View style={styles.secondaryActions}>
                        {!version.isMandatory && (
                            <>
                                <TouchableOpacity style={styles.secondaryButton} onPress={handleLater}>
                                    <Clock size={14} color="#94A3B8" />
                                    <Text style={styles.secondaryButtonText}>Depois</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.secondaryButton} onPress={handleSkip}>
                                    <X size={14} color="#94A3B8" />
                                    <Text style={styles.secondaryButtonText}>Pular versão</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={version?.isMandatory ? undefined : onClose}
        >
            <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
                <Animated.View
                    style={[
                        styles.container,
                        { transform: [{ scale: scaleAnim }] },
                    ]}
                >
                    {/* Header */}
                    <LinearGradient
                        colors={['#FF6B00', '#EA580C']}
                        style={styles.header}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Sparkles size={32} color="#FFF" />
                        <Text style={styles.headerTitle}>Nova Versão Disponível!</Text>
                        <Text style={styles.headerSubtitle}>
                            {version.isMandatory
                                ? 'Atualização obrigatória'
                                : 'Atualize para novas funcionalidades'}
                        </Text>
                    </LinearGradient>

                    {/* Botão de fechar (se não obrigatório) */}
                    {!version.isMandatory && downloadProgress.status === 'idle' && (
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <X size={20} color="#94A3B8" />
                        </TouchableOpacity>
                    )}

                    {/* Conteúdo */}
                    <View style={styles.content}>{renderContent()}</View>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
});

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    container: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#1E293B',
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#334155',
    },

    // Header
    header: {
        padding: 24,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFF',
        marginTop: 12,
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 4,
    },

    // Close button
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Content
    content: {
        padding: 20,
    },

    // Version info
    versionInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0F172A',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    versionRow: {
        alignItems: 'center',
    },
    versionLabel: {
        fontSize: 12,
        color: '#64748B',
    },
    versionValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#E2E8F0',
        marginTop: 4,
    },
    versionHighlight: {
        color: '#FF6B00',
    },
    versionArrow: {
        marginHorizontal: 20,
    },
    versionArrowText: {
        fontSize: 24,
        color: '#64748B',
    },

    // File size
    fileSizeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 16,
    },
    fileSizeText: {
        fontSize: 13,
        color: '#64748B',
    },

    // Release notes
    releaseNotesContainer: {
        backgroundColor: '#0F172A',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        maxHeight: 150,
    },
    releaseNotesTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#94A3B8',
        marginBottom: 8,
    },
    releaseNotesScroll: {
        maxHeight: 100,
    },
    releaseNotesText: {
        fontSize: 14,
        color: '#E2E8F0',
        lineHeight: 20,
    },

    // Actions
    actionsContainer: {
        gap: 12,
    },
    downloadButton: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    downloadButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 16,
    },
    downloadButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
    },
    browserButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
    },
    browserButtonText: {
        fontSize: 14,
        color: '#64748B',
    },
    secondaryActions: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 24,
        marginTop: 8,
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    secondaryButtonText: {
        fontSize: 13,
        color: '#94A3B8',
    },

    // Downloading state
    downloadingContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    progressCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#0F172A',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    progressText: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FF6B00',
    },
    progressBarContainer: {
        width: '100%',
        height: 8,
        backgroundColor: '#0F172A',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 12,
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#FF6B00',
        borderRadius: 4,
    },
    progressLabel: {
        fontSize: 13,
        color: '#94A3B8',
        marginBottom: 16,
    },
    cancelButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    cancelButtonText: {
        fontSize: 14,
        color: '#EF4444',
    },

    // Completed state
    completedContainer: {
        alignItems: 'center',
        paddingVertical: 30,
    },
    completedText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#10B981',
        marginTop: 16,
    },
    completedSubtext: {
        fontSize: 14,
        color: '#94A3B8',
        marginTop: 8,
        textAlign: 'center',
    },

    // Failed state
    failedContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    failedText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#EF4444',
        marginTop: 12,
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: '#334155',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        marginBottom: 12,
    },
    retryButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
    },
});

export default UpdateModal;
