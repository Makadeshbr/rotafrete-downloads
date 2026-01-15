// src/components/vehicle/AgendarManutencaoModal.tsx
// ============================================
// ROTAFRETE - Modal de Agendamento de Manutenção
// ============================================
// Versão simplificada e corrigida
// ============================================

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    TextInput,
    ScrollView,
    Platform,
    SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
    X,
    Calendar,
    Wrench,
    MapPin,
    DollarSign,
    FileText,
    ChevronDown,
    ChevronUp,
    Bell,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@aether-baas/react-native';
import { useAgendamentoStore } from '@/store';
import { PARTES_VEICULO, type ParteVeiculo } from '@/constants';
import type { AgendamentoInput } from '@/types';

interface AgendarManutencaoModalProps {
    visible: boolean;
    onClose: () => void;
    preSelectedPart?: ParteVeiculo;
}

// Nomes dos meses
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function AgendarManutencaoModal({
    visible,
    onClose,
    preSelectedPart,
}: AgendarManutencaoModalProps) {
    const { user } = useAuth();
    const { agendarManutencao, isLoading } = useAgendamentoStore();

    // Form state
    const [parteVeiculo, setParteVeiculo] = useState<ParteVeiculo | null>(preSelectedPart || null);
    const [descricao, setDescricao] = useState('');
    const [dataAgendada, setDataAgendada] = useState(new Date());
    const [custoEstimado, setCustoEstimado] = useState('');
    const [local, setLocal] = useState('');
    const [observacoes, setObservacoes] = useState('');
    const [showPartePicker, setShowPartePicker] = useState(false);

    // Reset form
    const resetForm = useCallback(() => {
        setParteVeiculo(preSelectedPart || null);
        setDescricao('');
        setDataAgendada(new Date());
        setCustoEstimado('');
        setLocal('');
        setObservacoes('');
        setShowPartePicker(false);
    }, [preSelectedPart]);

    // Handle close
    const handleClose = useCallback(() => {
        resetForm();
        onClose();
    }, [resetForm, onClose]);

    // Handle submit
    const handleSubmit = useCallback(async () => {
        if (!user?.id || !parteVeiculo) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const parteInfo = PARTES_VEICULO.find((p) => p.id === parteVeiculo);
        const input: AgendamentoInput = {
            parteVeiculo,
            descricao: descricao || `Manutenção: ${parteInfo?.nome || parteVeiculo}`,
            dataAgendada: dataAgendada.toISOString(),
            custoEstimado: custoEstimado ? parseFloat(custoEstimado) : undefined,
            local: local || undefined,
            observacoes: observacoes || undefined,
        };

        const result = await agendarManutencao(user.id, input);

        if (result) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            handleClose();
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    }, [user?.id, parteVeiculo, descricao, dataAgendada, custoEstimado, local, observacoes, agendarManutencao, handleClose]);

    // Add days to date
    const addDays = (days: number) => {
        const newDate = new Date(dataAgendada);
        newDate.setDate(newDate.getDate() + days);
        // Don't go before today
        if (newDate >= new Date(new Date().setHours(0, 0, 0, 0))) {
            setDataAgendada(newDate);
        }
    };

    const formatDate = () => {
        const dia = dataAgendada.getDate();
        const mes = MESES[dataAgendada.getMonth()];
        return `${dia} de ${mes}`;
    };

    const selectedParteInfo = parteVeiculo
        ? PARTES_VEICULO.find((p) => p.id === parteVeiculo)
        : null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <LinearGradient
                    colors={['#3B82F6', '#1D4ED8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.header}
                >
                    <View style={styles.headerContent}>
                        <View style={styles.headerIcon}>
                            <Calendar size={24} color="#FFF" />
                        </View>
                        <View>
                            <Text style={styles.headerTitle}>Agendar Manutenção</Text>
                            <Text style={styles.headerSubtitle}>
                                Você será notificado quando chegar a data
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                        <X size={24} color="#FFF" />
                    </TouchableOpacity>
                </LinearGradient>

                {/* Content */}
                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.contentContainer}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Parte do Veículo */}
                    <View style={styles.field}>
                        <View style={styles.labelRow}>
                            <Wrench size={14} color="#94A3B8" />
                            <Text style={styles.label}>Parte do Veículo *</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.picker}
                            onPress={() => setShowPartePicker(!showPartePicker)}
                            activeOpacity={0.7}
                        >
                            <Text style={selectedParteInfo ? styles.pickerText : styles.pickerPlaceholder}>
                                {selectedParteInfo?.nome || 'Selecione a parte'}
                            </Text>
                            {showPartePicker ? (
                                <ChevronUp size={20} color="#64748B" />
                            ) : (
                                <ChevronDown size={20} color="#64748B" />
                            )}
                        </TouchableOpacity>

                        {showPartePicker && (
                            <View style={styles.pickerOptions}>
                                <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                                    {PARTES_VEICULO.map((parte) => (
                                        <TouchableOpacity
                                            key={parte.id}
                                            style={[
                                                styles.pickerOption,
                                                parteVeiculo === parte.id && styles.pickerOptionSelected,
                                            ]}
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                setParteVeiculo(parte.id);
                                                setShowPartePicker(false);
                                            }}
                                        >
                                            <Text
                                                style={[
                                                    styles.pickerOptionText,
                                                    parteVeiculo === parte.id && styles.pickerOptionTextSelected,
                                                ]}
                                            >
                                                {parte.nome}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                    </View>

                    {/* Data Agendada */}
                    <View style={styles.field}>
                        <View style={styles.labelRow}>
                            <Calendar size={14} color="#94A3B8" />
                            <Text style={styles.label}>Data Prevista *</Text>
                        </View>
                        <View style={styles.dateContainer}>
                            <TouchableOpacity
                                style={styles.dateArrow}
                                onPress={() => addDays(-1)}
                            >
                                <Text style={styles.dateArrowText}>◀</Text>
                            </TouchableOpacity>
                            <View style={styles.dateDisplay}>
                                <Text style={styles.dateText}>{formatDate()}</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.dateArrow}
                                onPress={() => addDays(1)}
                            >
                                <Text style={styles.dateArrowText}>▶</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.quickDates}>
                            <TouchableOpacity
                                style={styles.quickDateBtn}
                                onPress={() => setDataAgendada(new Date())}
                            >
                                <Text style={styles.quickDateText}>Hoje</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.quickDateBtn}
                                onPress={() => {
                                    const tomorrow = new Date();
                                    tomorrow.setDate(tomorrow.getDate() + 1);
                                    setDataAgendada(tomorrow);
                                }}
                            >
                                <Text style={styles.quickDateText}>Amanhã</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.quickDateBtn}
                                onPress={() => {
                                    const nextWeek = new Date();
                                    nextWeek.setDate(nextWeek.getDate() + 7);
                                    setDataAgendada(nextWeek);
                                }}
                            >
                                <Text style={styles.quickDateText}>+7 dias</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Descrição */}
                    <View style={styles.field}>
                        <View style={styles.labelRow}>
                            <FileText size={14} color="#94A3B8" />
                            <Text style={styles.label}>Descrição</Text>
                        </View>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Ex: Trocar óleo do motor"
                            placeholderTextColor="#64748B"
                            value={descricao}
                            onChangeText={setDescricao}
                        />
                    </View>

                    {/* Local */}
                    <View style={styles.field}>
                        <View style={styles.labelRow}>
                            <MapPin size={14} color="#94A3B8" />
                            <Text style={styles.label}>Local / Oficina</Text>
                        </View>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Ex: Oficina do Zé"
                            placeholderTextColor="#64748B"
                            value={local}
                            onChangeText={setLocal}
                        />
                    </View>

                    {/* Custo Estimado */}
                    <View style={styles.field}>
                        <View style={styles.labelRow}>
                            <DollarSign size={14} color="#94A3B8" />
                            <Text style={styles.label}>Custo Estimado (R$)</Text>
                        </View>
                        <TextInput
                            style={styles.textInput}
                            placeholder="0,00"
                            placeholderTextColor="#64748B"
                            keyboardType="numeric"
                            value={custoEstimado}
                            onChangeText={setCustoEstimado}
                        />
                    </View>

                    {/* Observações */}
                    <View style={styles.field}>
                        <Text style={styles.label}>Observações</Text>
                        <TextInput
                            style={[styles.textInput, styles.textArea]}
                            placeholder="Anotações adicionais..."
                            placeholderTextColor="#64748B"
                            multiline
                            numberOfLines={3}
                            value={observacoes}
                            onChangeText={setObservacoes}
                        />
                    </View>

                    {/* Push notification notice */}
                    <View style={styles.noticeCard}>
                        <Bell size={18} color="#3B82F6" />
                        <Text style={styles.noticeText}>
                            Você receberá uma notificação push confirmando o agendamento.
                        </Text>
                    </View>
                </ScrollView>

                {/* Footer */}
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                        <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.submitButton,
                            (!parteVeiculo || isLoading) && styles.submitButtonDisabled,
                        ]}
                        onPress={handleSubmit}
                        disabled={!parteVeiculo || isLoading}
                    >
                        <LinearGradient
                            colors={['#3B82F6', '#1D4ED8']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.submitButtonGradient}
                        >
                            <Calendar size={18} color="#FFF" />
                            <Text style={styles.submitButtonText}>
                                {isLoading ? 'Agendando...' : 'Agendar'}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingTop: Platform.OS === 'android' ? 40 : 20,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    headerIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
    },
    headerSubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    closeButton: {
        padding: 8,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    field: {
        marginBottom: 20,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    label: {
        fontSize: 14,
        color: '#94A3B8',
        fontWeight: '500',
    },
    picker: {
        backgroundColor: '#1E293B',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    pickerText: {
        fontSize: 16,
        color: '#F1F5F9',
    },
    pickerPlaceholder: {
        fontSize: 16,
        color: '#64748B',
    },
    pickerOptions: {
        backgroundColor: '#1E293B',
        borderRadius: 12,
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#334155',
        overflow: 'hidden',
    },
    pickerScroll: {
        maxHeight: 200,
    },
    pickerOption: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    pickerOptionSelected: {
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
    },
    pickerOptionText: {
        fontSize: 15,
        color: '#CBD5E1',
    },
    pickerOptionTextSelected: {
        color: '#3B82F6',
        fontWeight: '600',
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E293B',
        borderRadius: 12,
        overflow: 'hidden',
    },
    dateArrow: {
        width: 50,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#334155',
    },
    dateArrowText: {
        fontSize: 16,
        color: '#3B82F6',
    },
    dateDisplay: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
    },
    dateText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#F1F5F9',
    },
    quickDates: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 10,
    },
    quickDateBtn: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#334155',
        alignItems: 'center',
    },
    quickDateText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#3B82F6',
    },
    textInput: {
        backgroundColor: '#1E293B',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#F1F5F9',
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    noticeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        padding: 14,
        borderRadius: 12,
        gap: 12,
        marginTop: 8,
    },
    noticeText: {
        fontSize: 13,
        color: '#93C5FD',
        flex: 1,
        lineHeight: 18,
    },
    footer: {
        flexDirection: 'row',
        padding: 20,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#1E293B',
        backgroundColor: '#0F172A',
    },
    cancelButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#1E293B',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#94A3B8',
    },
    submitButton: {
        flex: 2,
        borderRadius: 12,
        overflow: 'hidden',
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    submitButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        gap: 8,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
});

export default AgendarManutencaoModal;
