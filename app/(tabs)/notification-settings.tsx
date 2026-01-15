// app/(tabs)/notification-settings.tsx
// ============================================
// ROTAFRETE - Tela de Configurações de Notificações
// ============================================
// Permite ao usuário gerenciar preferências de
// notificações push, incluindo silenciamento temporário.
// ============================================

import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Switch,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    ArrowLeft,
    Bell,
    BellOff,
    Clock,
    Volume2,
    VolumeX,
    Route,
    ClipboardCheck,
    AlertTriangle,
    CheckCircle,
    ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Card, CardContent, PageWrapper } from '@/components/ui';
import { useAuth } from '@aether-baas/react-native';
import {
    useNotificationSettingsStore,
    type SilenciarOpcao
} from '@/store/useNotificationSettingsStore';

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
    PRIMARIO: '#FF6B00',
    SUCESSO: '#22C55E',
    AVISO: '#F59E0B',
    PERIGO: '#EF4444',
};

const SILENCIAR_OPCOES: { id: SilenciarOpcao; label: string; icon: string }[] = [
    { id: '1h', label: '1 hora', icon: '🕐' },
    { id: '4h', label: '4 horas', icon: '🕓' },
    { id: '8h', label: '8 horas', icon: '🕗' },
    { id: 'amanha', label: 'Até amanhã', icon: '🌅' },
];

// ============================================
// COMPONENTES AUXILIARES
// ============================================

interface SettingRowProps {
    icon: React.ReactNode;
    label: string;
    description?: string;
    value: boolean;
    onToggle: (value: boolean) => void;
    disabled?: boolean;
}

/**
 * Linha de configuração com toggle.
 */
function SettingRow({ icon, label, description, value, onToggle, disabled }: SettingRowProps) {
    const handleToggle = (newValue: boolean) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggle(newValue);
    };

    return (
        <View style={[styles.settingRow, disabled && styles.settingRowDisabled]}>
            <View style={styles.settingIcon}>{icon}</View>
            <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, disabled && styles.textDisabled]}>
                    {label}
                </Text>
                {description && (
                    <Text style={[styles.settingDescription, disabled && styles.textDisabled]}>
                        {description}
                    </Text>
                )}
            </View>
            <Switch
                value={value}
                onValueChange={handleToggle}
                disabled={disabled}
                trackColor={{ false: '#334155', true: CORES.PRIMARIO }}
                thumbColor={value ? '#FFFFFF' : '#94A3B8'}
            />
        </View>
    );
}

interface TimePickerRowProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    onChange: (time: string) => void;
    disabled?: boolean;
}

/**
 * Linha de configuração com seletor de horário.
 */
function TimePickerRow({ icon, label, value, onChange, disabled }: TimePickerRowProps) {
    const [showPicker, setShowPicker] = useState(false);

    // Parse time string "HH:mm" to Date
    const parseTime = (timeStr: string): Date => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    };

    const handleChange = (event: any, selectedDate?: Date) => {
        setShowPicker(false);
        if (selectedDate) {
            const hours = selectedDate.getHours().toString().padStart(2, '0');
            const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
            onChange(`${hours}:${minutes}`);
        }
    };

    return (
        <TouchableOpacity
            style={[styles.settingRow, disabled && styles.settingRowDisabled]}
            onPress={() => !disabled && setShowPicker(true)}
            disabled={disabled}
            activeOpacity={0.7}
        >
            <View style={styles.settingIcon}>{icon}</View>
            <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, disabled && styles.textDisabled]}>
                    {label}
                </Text>
            </View>
            <View style={styles.timeValue}>
                <Text style={[styles.timeText, disabled && styles.textDisabled]}>
                    {value}
                </Text>
                <ChevronRight size={16} color={CORES.TEXTO_MUTED} />
            </View>

            {showPicker && (
                <DateTimePicker
                    value={parseTime(value)}
                    mode="time"
                    is24Hour={true}
                    display="spinner"
                    onChange={handleChange}
                />
            )}
        </TouchableOpacity>
    );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function NotificationSettingsScreen() {
    const router = useRouter();
    const { user } = useAuth();

    // Store
    const {
        settings,
        isLoading,
        error,
        fetchSettings,
        updateSettings,
        silenciarPor,
        ativarNotificacoes,
        isSilenciado,
        getTempoRestanteSilenciamento,
        clearError,
    } = useNotificationSettingsStore();

    // Estado local
    const [localLoading, setLocalLoading] = useState<string | null>(null);

    // Carrega configurações ao montar
    useEffect(() => {
        if (user?.id) {
            fetchSettings(user.id);
        }
    }, [user?.id]);

    // Mostra erro se houver
    useEffect(() => {
        if (error) {
            Alert.alert('Erro', error, [{ text: 'OK', onPress: clearError }]);
        }
    }, [error]);

    /**
     * Handler para toggle de configuração.
     */
    const handleToggle = async (key: string, value: boolean) => {
        setLocalLoading(key);
        await updateSettings({ [key]: value });
        setLocalLoading(null);
    };

    /**
     * Handler para silenciamento temporário.
     */
    const handleSilenciar = async (opcao: SilenciarOpcao) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setLocalLoading('silenciar');
        await silenciarPor(opcao);
        setLocalLoading(null);
    };

    /**
     * Handler para ativar notificações (remove silenciamento).
     */
    const handleAtivarNotificacoes = async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setLocalLoading('ativar');
        await ativarNotificacoes();
        setLocalLoading(null);
    };

    /**
     * Handler para mudança de horário.
     */
    const handleTimeChange = async (key: string, value: string) => {
        await updateSettings({ [key]: value });
    };

    // Estado computado
    const silenciado = isSilenciado();
    const tempoRestante = getTempoRestanteSilenciamento();
    const notificacoesDesativadas = !settings?.notificacoesAtivas;

    if (isLoading && !settings) {
        return (
            <PageWrapper>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={CORES.PRIMARIO} />
                    <Text style={styles.loadingText}>Carregando configurações...</Text>
                </View>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}
                    >
                        <ArrowLeft size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Notificações</Text>
                    <View style={{ width: 44 }} />
                </View>

                {/* Status Banner */}
                {silenciado && (
                    <View style={styles.silenciadoBanner}>
                        <VolumeX size={20} color={CORES.AVISO} />
                        <View style={styles.silenciadoContent}>
                            <Text style={styles.silenciadoTitle}>
                                Notificações silenciadas
                            </Text>
                            <Text style={styles.silenciadoTempo}>
                                Restam {tempoRestante}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.ativarButton}
                            onPress={handleAtivarNotificacoes}
                            disabled={localLoading === 'ativar'}
                        >
                            {localLoading === 'ativar' ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <Text style={styles.ativarButtonText}>Ativar</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* Master Switch */}
                <Card variant="default" style={{ marginBottom: 16 }}>
                    <CardContent>
                        <SettingRow
                            icon={<Bell size={22} color={CORES.PRIMARIO} />}
                            label="Notificações Ativas"
                            description="Receber notificações push do app"
                            value={settings?.notificacoesAtivas ?? true}
                            onToggle={(value) => handleToggle('notificacoesAtivas', value)}
                        />
                    </CardContent>
                </Card>

                {/* Silenciar Temporariamente */}
                <Text style={styles.sectionTitle}>Silenciar Temporariamente</Text>
                <Card variant="default" style={{ marginBottom: 16 }}>
                    <CardContent style={{ padding: 12 }}>
                        <View style={styles.silenciarGrid}>
                            {SILENCIAR_OPCOES.map((opcao) => (
                                <TouchableOpacity
                                    key={opcao.id}
                                    style={[
                                        styles.silenciarButton,
                                        notificacoesDesativadas && styles.silenciarButtonDisabled,
                                    ]}
                                    onPress={() => handleSilenciar(opcao.id)}
                                    disabled={notificacoesDesativadas || localLoading === 'silenciar'}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.silenciarEmoji}>{opcao.icon}</Text>
                                    <Text style={[
                                        styles.silenciarLabel,
                                        notificacoesDesativadas && styles.textDisabled,
                                    ]}>
                                        {opcao.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </CardContent>
                </Card>

                {/* Lembretes de Rotas */}
                <Text style={styles.sectionTitle}>Lembrete de Rotas</Text>
                <Card variant="default" style={{ marginBottom: 16 }}>
                    <CardContent>
                        <SettingRow
                            icon={<Route size={22} color={CORES.SUCESSO} />}
                            label="Lembrete Diário"
                            description="Lembrar de registrar rotas do dia"
                            value={settings?.lembreteRotaDiario ?? true}
                            onToggle={(value) => handleToggle('lembreteRotaDiario', value)}
                            disabled={notificacoesDesativadas}
                        />

                        {settings?.lembreteRotaDiario && (
                            <TimePickerRow
                                icon={<Clock size={22} color={CORES.TEXTO_MUTED} />}
                                label="Horário do Lembrete"
                                value={settings?.horaLembreteRota ?? '19:00'}
                                onChange={(value) => handleTimeChange('horaLembreteRota', value)}
                                disabled={notificacoesDesativadas}
                            />
                        )}
                    </CardContent>
                </Card>

                {/* Inspeção */}
                <Text style={styles.sectionTitle}>Inspeção Veicular</Text>
                <Card variant="default" style={{ marginBottom: 16 }}>
                    <CardContent>
                        <SettingRow
                            icon={<ClipboardCheck size={22} color={CORES.AVISO} />}
                            label="Lembrete de Inspeção"
                            description="Lembrar de enviar inspeção semanal"
                            value={settings?.lembreteInspecao ?? true}
                            onToggle={(value) => handleToggle('lembreteInspecao', value)}
                            disabled={notificacoesDesativadas}
                        />

                        <SettingRow
                            icon={<CheckCircle size={22} color={CORES.SUCESSO} />}
                            label="Resultado da Avaliação"
                            description="Notificar quando admin avaliar"
                            value={settings?.notificarAvaliacao ?? true}
                            onToggle={(value) => handleToggle('notificarAvaliacao', value)}
                            disabled={notificacoesDesativadas}
                        />

                        <SettingRow
                            icon={<AlertTriangle size={22} color={CORES.PERIGO} />}
                            label="Itens Críticos"
                            description="Alerta imediato para problemas graves"
                            value={settings?.notificarItensCriticos ?? true}
                            onToggle={(value) => handleToggle('notificarItensCriticos', value)}
                            disabled={notificacoesDesativadas}
                        />
                    </CardContent>
                </Card>

                {/* Info Footer */}
                <View style={styles.infoFooter}>
                    <Text style={styles.infoText}>
                        As notificações ajudam você a não perder prazos importantes
                        e manter seu veículo sempre em dia.
                    </Text>
                </View>

                {/* Spacer */}
                <View style={{ height: 40 }} />
            </ScrollView>
        </PageWrapper>
    );
}

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 100,
    },

    // Loading
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 14,
        color: CORES.TEXTO_SECUNDARIO,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: CORES.CARD,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: CORES.TEXTO_PRIMARIO,
    },

    // Silenciado Banner
    silenciadoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    silenciadoContent: {
        flex: 1,
        marginLeft: 12,
    },
    silenciadoTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: CORES.AVISO,
    },
    silenciadoTempo: {
        fontSize: 12,
        color: CORES.TEXTO_MUTED,
        marginTop: 2,
    },
    ativarButton: {
        backgroundColor: CORES.PRIMARIO,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    ativarButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },

    // Section
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: CORES.TEXTO_MUTED,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
        marginLeft: 4,
    },

    // Setting Row
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: CORES.BORDA,
    },
    settingRowDisabled: {
        opacity: 0.5,
    },
    settingIcon: {
        width: 40,
        alignItems: 'center',
    },
    settingContent: {
        flex: 1,
        marginLeft: 8,
    },
    settingLabel: {
        fontSize: 15,
        fontWeight: '500',
        color: CORES.TEXTO_PRIMARIO,
    },
    settingDescription: {
        fontSize: 12,
        color: CORES.TEXTO_MUTED,
        marginTop: 2,
    },
    textDisabled: {
        color: CORES.TEXTO_MUTED,
    },

    // Time Picker
    timeValue: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    timeText: {
        fontSize: 15,
        fontWeight: '500',
        color: CORES.PRIMARIO,
    },

    // Silenciar Grid
    silenciarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    silenciarButton: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: CORES.CARD,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: CORES.BORDA,
    },
    silenciarButtonDisabled: {
        opacity: 0.5,
    },
    silenciarEmoji: {
        fontSize: 24,
        marginBottom: 8,
    },
    silenciarLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: CORES.TEXTO_PRIMARIO,
    },

    // Footer
    infoFooter: {
        marginTop: 8,
        padding: 16,
        backgroundColor: 'rgba(255, 107, 0, 0.1)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 107, 0, 0.2)',
    },
    infoText: {
        fontSize: 13,
        color: CORES.TEXTO_SECUNDARIO,
        textAlign: 'center',
        lineHeight: 20,
    },
});
