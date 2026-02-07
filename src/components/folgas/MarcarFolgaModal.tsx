// src/components/folgas/MarcarFolgaModal.tsx
// ============================================
// ROTAFRETE - Modal para Marcar Folga
// ============================================
// Modal premium para registrar dias de folga
// ============================================

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Animated,
    Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
    X,
    Calendar,
    Coffee,
    Plane,
    FileText,
    Gift,
    Check,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import type { Folga, FolgaInput } from '@/store';
import { CalendarioPremium } from '../ui/CalendarioPremium';

// ============================================
// TIPOS
// ============================================

interface MarcarFolgaModalProps {
    visible: boolean;
    onClose: () => void;
    onSalvar: (input: FolgaInput) => Promise<void>;
    folgaParaEditar?: Folga;
}

const TIPOS_FOLGA = [
    { value: 'FOLGA' as const, label: 'Folga', icon: Coffee, color: '#3B82F6' },
    { value: 'FERIAS' as const, label: 'Férias', icon: Plane, color: '#10B981' },
    { value: 'ATESTADO' as const, label: 'Atestado', icon: FileText, color: '#EF4444' },
    { value: 'FERIADO' as const, label: 'Feriado', icon: Gift, color: '#8B5CF6' },
    { value: 'OUTRO' as const, label: 'Outro', icon: Calendar, color: '#64748B' },
];

// ============================================
// COMPONENTE
// ============================================

export function MarcarFolgaModal({
    visible,
    onClose,
    onSalvar,
    folgaParaEditar,
}: MarcarFolgaModalProps) {
    const [dataSelecionada, setDataSelecionada] = useState<Date | null>(null);
    const [tipoSelecionado, setTipoSelecionado] = useState<Folga['tipo']>('FOLGA');
    const [observacao, setObservacao] = useState('');
    const [remunerada, setRemunerada] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [mostrarCalendario, setMostrarCalendario] = useState(false);

    const [scaleAnim] = useState(new Animated.Value(0.9));
    const [opacityAnim] = useState(new Animated.Value(0));

    // Carrega dados ao editar
    useEffect(() => {
        if (folgaParaEditar) {
            setDataSelecionada(new Date(folgaParaEditar.data));
            setTipoSelecionado(folgaParaEditar.tipo);
            setObservacao(folgaParaEditar.observacao || '');
            setRemunerada(folgaParaEditar.remunerada);
        } else {
            // Reset para nova folga
            setDataSelecionada(null);
            setTipoSelecionado('FOLGA');
            setObservacao('');
            setRemunerada(false);
        }
    }, [folgaParaEditar, visible]);

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

    const handleSalvar = async () => {
        if (!dataSelecionada) {
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSalvando(true);

        try {
            const input: FolgaInput = {
                data: format(dataSelecionada, 'yyyy-MM-dd'),
                tipo: tipoSelecionado,
                observacao: observacao.trim() || undefined,
                remunerada,
            };

            await onSalvar(input);
            onClose();

        } catch (error) {
            console.error('[MarcarFolgaModal] Erro ao salvar:', error);
        } finally {
            setSalvando(false);
        }
    };

    const handleClose = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onClose();
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={handleClose}
        >
            <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
                <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
                    {/* Header */}
                    <LinearGradient
                        colors={['#FF6B00', '#EA580C']}
                        style={styles.header}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Calendar size={32} color="#FFF" />
                        <Text style={styles.headerTitle}>
                            {folgaParaEditar ? 'Editar Folga' : 'Marcar Folga'}
                        </Text>
                        <Text style={styles.headerSubtitle}>
                            Registre seu dia de descanso
                        </Text>
                    </LinearGradient>

                    {/* Botão Fechar */}
                    <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                        <X size={20} color="#94A3B8" />
                    </TouchableOpacity>

                    {/* Conteúdo */}
                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* Seleção de Data */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Data</Text>
                            <TouchableOpacity
                                style={styles.dateButton}
                                onPress={() => setMostrarCalendario(!mostrarCalendario)}
                            >
                                <Calendar size={20} color="#FF6B00" />
                                <Text style={styles.dateButtonText}>
                                    {dataSelecionada
                                        ? format(dataSelecionada, "dd 'de' MMMM, yyyy", { locale: ptBR })
                                        : 'Selecione uma data'}
                                </Text>
                            </TouchableOpacity>

                            {mostrarCalendario && (
                                <View style={styles.calendarioContainer}>
                                    <CalendarioPremium
                                        value={dataSelecionada ?? new Date()}
                                        onChange={(date) => {
                                            setDataSelecionada(date);
                                            setMostrarCalendario(false);
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        }}
                                    />
                                </View>
                            )}
                        </View>

                        {/* Tipo de Folga */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Tipo de Folga</Text>
                            <View style={styles.tiposGrid}>
                                {TIPOS_FOLGA.map((tipo) => {
                                    const Icon = tipo.icon;
                                    const selecionado = tipoSelecionado === tipo.value;

                                    return (
                                        <TouchableOpacity
                                            key={tipo.value}
                                            style={[
                                                styles.tipoCard,
                                                selecionado && {
                                                    borderColor: tipo.color,
                                                    borderWidth: 2,
                                                },
                                            ]}
                                            onPress={() => {
                                                setTipoSelecionado(tipo.value);
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            }}
                                        >
                                            <View
                                                style={[
                                                    styles.tipoIconContainer,
                                                    { backgroundColor: tipo.color + '20' },
                                                ]}
                                            >
                                                <Icon size={20} color={tipo.color} />
                                            </View>
                                            <Text style={styles.tipoLabel}>{tipo.label}</Text>
                                            {selecionado && (
                                                <View style={[styles.checkMark, { backgroundColor: tipo.color }]}>
                                                    <Check size={12} color="#FFF" />
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Remunerada */}
                        <View style={styles.section}>
                            <View style={styles.switchRow}>
                                <View>
                                    <Text style={styles.sectionLabel}>Folga Remunerada</Text>
                                    <Text style={styles.switchDescription}>
                                        Marque se você receberá pagamento neste dia
                                    </Text>
                                </View>
                                <Switch
                                    value={remunerada}
                                    onValueChange={(value) => {
                                        setRemunerada(value);
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    }}
                                    trackColor={{ false: '#334155', true: '#FF6B00' }}
                                    thumbColor="#FFF"
                                />
                            </View>
                        </View>

                        {/* Observação */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Observação (opcional)</Text>
                            <TextInput
                                style={styles.textArea}
                                placeholder="Ex: Médico, viagem, etc"
                                placeholderTextColor="#64748B"
                                value={observacao}
                                onChangeText={setObservacao}
                                multiline
                                numberOfLines={3}
                                maxLength={200}
                            />
                            <Text style={styles.charCount}>{observacao.length}/200</Text>
                        </View>
                    </ScrollView>

                    {/* Botão Salvar */}
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.salvarButton, !dataSelecionada && styles.salvarButtonDisabled]}
                            onPress={handleSalvar}
                            disabled={!dataSelecionada || salvando}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={dataSelecionada ? ['#FF6B00', '#EA580C'] : ['#334155', '#334155']}
                                style={styles.salvarButtonGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Text style={styles.salvarButtonText}>
                                    {salvando ? 'Salvando...' : folgaParaEditar ? 'Atualizar' : 'Marcar Folga'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        width: '100%',
        maxWidth: 500,
        maxHeight: '90%',
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
    section: {
        marginBottom: 24,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#E2E8F0',
        marginBottom: 12,
    },

    // Date
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#0F172A',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#334155',
    },
    dateButtonText: {
        fontSize: 16,
        color: '#E2E8F0',
        flex: 1,
    },
    calendarioContainer: {
        marginTop: 12,
        backgroundColor: '#0F172A',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#334155',
    },

    // Tipos
    tiposGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    tipoCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: '#0F172A',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#334155',
        position: 'relative',
    },
    tipoIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tipoLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#E2E8F0',
    },
    checkMark: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Switch
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    switchDescription: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 4,
    },

    // TextArea
    textArea: {
        backgroundColor: '#0F172A',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#E2E8F0',
        borderWidth: 1,
        borderColor: '#334155',
        minHeight: 100,
        textAlignVertical: 'top',
    },
    charCount: {
        fontSize: 12,
        color: '#64748B',
        textAlign: 'right',
        marginTop: 4,
    },

    // Footer
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#334155',
    },
    salvarButton: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    salvarButtonDisabled: {
        opacity: 0.5,
    },
    salvarButtonGradient: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    salvarButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
    },
});

export default MarcarFolgaModal;
