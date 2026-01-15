// src/components/vehicle/MaintenanceHistoryModal.tsx
// ============================================
// ROTAFRETE - Modal de Manutenção Profissional
// Usando @gorhom/bottom-sheet
// ============================================

import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Keyboard,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { CheckCircle, AlertTriangle, XCircle, X, DollarSign, FileText, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import {
    STATUS_MANUTENCAO,
    PARTES_VEICULO,
    type ParteVeiculo,
    type StatusManutencao,
    formatarMoeda,
} from '@/constants';
import type { Despesa } from '@/store/useDespesasStore';

// ============================================
// TIPOS
// ============================================

interface MaintenanceHistoryModalProps {
    visible: boolean;
    parte: ParteVeiculo | null;
    currentStatus: StatusManutencao;
    onClose: () => void;
    onStatusChange: (status: StatusManutencao, custo: number, observacao: string) => void;
    historico?: Despesa[];
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function MaintenanceHistoryModal({
    visible,
    parte,
    currentStatus,
    onClose,
    onStatusChange,
    historico = [],
}: MaintenanceHistoryModalProps) {
    // Refs
    const bottomSheetRef = useRef<BottomSheet>(null);

    // Estado
    const [selectedStatus, setSelectedStatus] = useState<StatusManutencao | null>(null);
    const [custo, setCusto] = useState('');
    const [observacao, setObservacao] = useState('');

    // Snap points do bottom sheet
    const snapPoints = useMemo(() => ['90%'], []);

    // Dados da parte
    const parteInfo = PARTES_VEICULO.find(p => p.id === parte);
    const statusConfig = STATUS_MANUTENCAO[currentStatus] || STATUS_MANUTENCAO.OK;

    // Abre/fecha o sheet quando visible muda
    useEffect(() => {
        if (visible) {
            bottomSheetRef.current?.expand();
        } else {
            bottomSheetRef.current?.close();
        }
    }, [visible]);

    // Handler de fechamento
    const handleClose = useCallback(() => {
        Keyboard.dismiss();
        setCusto('');
        setObservacao('');
        setSelectedStatus(null);
        bottomSheetRef.current?.close();
        onClose();
    }, [onClose]);

    // Handler quando o sheet muda de posição
    const handleSheetChanges = useCallback((index: number) => {
        if (index === -1) {
            handleClose();
        }
    }, [handleClose]);

    // Handler de confirmação
    const handleConfirm = useCallback(() => {
        if (!selectedStatus) return;

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const custoNum = parseFloat(custo.replace(',', '.')) || 0;
        onStatusChange(selectedStatus, custoNum, observacao);
        handleClose();
    }, [selectedStatus, custo, observacao, onStatusChange, handleClose]);

    // Backdrop customizado
    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.7}
            />
        ),
        []
    );

    // Status options
    const statusOptions: Array<{ key: StatusManutencao; label: string; color: string; Icon: any }> = [
        { key: 'OK', label: 'OK - Em dia', color: '#22C55E', Icon: CheckCircle },
        { key: 'ATENCAO', label: 'Atenção - Verificar', color: '#F59E0B', Icon: AlertTriangle },
        { key: 'URGENTE', label: 'Urgente - Manutenção', color: '#EF4444', Icon: XCircle },
    ];

    if (!visible) return null;

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={0}
            snapPoints={snapPoints}
            onChange={handleSheetChanges}
            backdropComponent={renderBackdrop}
            enablePanDownToClose
            backgroundStyle={styles.sheetBackground}
            handleIndicatorStyle={styles.handleIndicator}
        >
            <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerInfo}>
                            <View style={[styles.statusBar, { backgroundColor: statusConfig.cor }]} />
                            <View>
                                <Text style={styles.title}>{parteInfo?.nome || 'Manutenção'}</Text>
                                <Text style={[styles.subtitle, { color: statusConfig.cor }]}>
                                    Status atual: {statusConfig.label}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                            <X size={22} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>

                    {/* Opções de Status */}
                    <Text style={styles.sectionTitle}>Selecione o novo status:</Text>

                    {statusOptions.map(({ key, label, color, Icon }) => {
                        const isSelected = selectedStatus === key;
                        const isCurrent = currentStatus === key;

                        return (
                            <TouchableOpacity
                                key={key}
                                style={[
                                    styles.statusOption,
                                    { borderColor: color },
                                    isSelected && { backgroundColor: `${color}20` },
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSelectedStatus(key);
                                }}
                                activeOpacity={0.7}
                            >
                                <Icon size={24} color={color} />
                                <Text style={[styles.statusOptionText, { color }]}>{label}</Text>
                                {isCurrent && (
                                    <View style={styles.currentBadge}>
                                        <Text style={styles.currentBadgeText}>Atual</Text>
                                    </View>
                                )}
                                {isSelected && !isCurrent && (
                                    <CheckCircle size={20} color={color} />
                                )}
                            </TouchableOpacity>
                        );
                    })}

                    {/* Campo de Custo */}
                    <View style={styles.inputSection}>
                        <View style={styles.inputHeader}>
                            <DollarSign size={18} color="#22C55E" />
                            <Text style={styles.inputLabel}>Custo da Manutenção</Text>
                        </View>
                        <View style={styles.currencyInput}>
                            <Text style={styles.currencySymbol}>R$</Text>
                            <TextInput
                                style={styles.currencyField}
                                value={custo}
                                onChangeText={setCusto}
                                placeholder="0,00"
                                placeholderTextColor="#64748B"
                                keyboardType="decimal-pad"
                            />
                        </View>
                    </View>

                    {/* Campo de Observação */}
                    <View style={styles.inputSection}>
                        <View style={styles.inputHeader}>
                            <FileText size={18} color="#3B82F6" />
                            <Text style={styles.inputLabel}>Observação (opcional)</Text>
                        </View>
                        <TextInput
                            style={styles.textArea}
                            value={observacao}
                            onChangeText={setObservacao}
                            placeholder="Ex: Troca de peça na oficina..."
                            placeholderTextColor="#64748B"
                            multiline
                            numberOfLines={2}
                        />
                    </View>

                    {/* Botões de Ação */}
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                            <Text style={styles.cancelBtnText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.confirmBtn, !selectedStatus && styles.btnDisabled]}
                            onPress={handleConfirm}
                            disabled={!selectedStatus}
                        >
                            <Text style={styles.confirmBtnText}>Confirmar</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Histórico */}
                    {historico.length > 0 && (
                        <View style={styles.historySection}>
                            <View style={styles.historyHeader}>
                                <Clock size={16} color="#94A3B8" />
                                <Text style={styles.historyTitle}>Últimas Despesas</Text>
                            </View>
                            {historico.map((item) => (
                                <View key={item.id} style={styles.historyItem}>
                                    <View style={styles.historyInfo}>
                                        <Text style={styles.historyDate}>
                                            {item.data ? format(parseISO(item.data), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                                        </Text>
                                        <Text style={styles.historyDesc} numberOfLines={1}>
                                            {item.descricao}
                                        </Text>
                                    </View>
                                    <Text style={styles.historyValue}>{formatarMoeda(item.valor)}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </BottomSheetScrollView>
        </BottomSheet>
    );
}

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
    sheetBackground: {
        backgroundColor: '#0F172A',
    },
    handleIndicator: {
        backgroundColor: '#475569',
        width: 40,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    container: {
        padding: 20,
        paddingTop: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#1E293B',
    },
    headerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    statusBar: {
        width: 4,
        height: 44,
        borderRadius: 2,
        marginRight: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    subtitle: {
        fontSize: 13,
        marginTop: 4,
    },
    closeBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#334155',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 12,
    },
    statusOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#1E293B',
        borderRadius: 12,
        borderWidth: 2,
        marginBottom: 10,
    },
    statusOptionText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 12,
    },
    currentBadge: {
        backgroundColor: '#475569',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    currentBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#E2E8F0',
    },
    inputSection: {
        marginTop: 16,
    },
    inputHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
        marginLeft: 8,
    },
    currencyInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E293B',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#334155',
    },
    currencySymbol: {
        paddingHorizontal: 16,
        fontSize: 18,
        fontWeight: '700',
        color: '#22C55E',
    },
    currencyField: {
        flex: 1,
        padding: 14,
        fontSize: 16,
        color: '#FFFFFF',
    },
    textArea: {
        backgroundColor: '#1E293B',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#334155',
        padding: 14,
        fontSize: 16,
        color: '#FFFFFF',
        minHeight: 60,
        textAlignVertical: 'top',
    },
    actions: {
        flexDirection: 'row',
        marginTop: 24,
    },
    cancelBtn: {
        flex: 1,
        padding: 16,
        backgroundColor: '#1E293B',
        borderRadius: 12,
        alignItems: 'center',
        marginRight: 8,
    },
    cancelBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#94A3B8',
    },
    confirmBtn: {
        flex: 1,
        padding: 16,
        backgroundColor: '#22C55E',
        borderRadius: 12,
        alignItems: 'center',
        marginLeft: 8,
    },
    confirmBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    btnDisabled: {
        backgroundColor: '#475569',
        opacity: 0.5,
    },
    historySection: {
        marginTop: 32,
        borderTopWidth: 1,
        borderTopColor: '#1E293B',
        paddingTop: 24,
    },
    historyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    historyTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#94A3B8',
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#1E293B',
    },
    historyInfo: {
        flex: 1,
    },
    historyDate: {
        fontSize: 12,
        color: '#64748B',
    },
    historyDesc: {
        fontSize: 14,
        color: '#E2E8F0',
        marginTop: 2,
    },
    historyValue: {
        fontSize: 15,
        fontWeight: '600',
        color: '#F59E0B',
    },
});
