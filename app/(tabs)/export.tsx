// app/(tabs)/export.tsx
// ============================================
// ROTAFRETE - Tela de Exportação de Extrato
// ============================================
// Permite motorista exportar extrato mensal em PDF
// e compartilhar via WhatsApp ou Email
// ============================================

import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Share, Mail, Download } from 'lucide-react-native';
import { useAuth } from '@aether-baas/react-native';
import { useShare } from '@/hooks';
import { generateExtractPDFLocal } from '@/services/pdf-generator';
import { useRotasStore, useDespesasStore } from '@/store';

export default function ExportScreen() {
    const { user } = useAuth();
    const { shareFile, shareEmail } = useShare();
    const { rotas } = useRotasStore();
    const { despesas } = useDespesasStore();

    const [generating, setGenerating] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [lastGeneratedPdf, setLastGeneratedPdf] = useState<string | null>(null);
    const [stats, setStats] = useState<any>(null);

    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const handleGenerate = async () => {
        if (!user?.id) {
            Alert.alert('Erro', 'Usuário não autenticado');
            return;
        }

        setGenerating(true);

        try {
            // Filtrar rotas e despesas do mês selecionado
            const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
            const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-31`;

            const rotasFiltradas = rotas.filter(r =>
                r.data >= startDate && r.data <= endDate
            );

            const despesasFiltradas = despesas.filter(d =>
                d.data >= startDate && d.data <= endDate
            );

            // Gerar PDF localmente
            const result = await generateExtractPDFLocal({
                userId: user.id,
                month: selectedMonth,
                year: selectedYear,
                rotas: rotasFiltradas,
                despesas: despesasFiltradas,
            });

            if (result.success && result.uri) {
                setLastGeneratedPdf(result.uri);

                // Calcular stats
                const totalBruto = rotasFiltradas.reduce((sum, r) =>
                    sum + (r.valorFrete || 0) + (r.valorParadas || 0), 0
                );
                const totalDespesas = despesasFiltradas.reduce((sum, d) =>
                    sum + (d.valor || 0), 0
                );
                const totalKm = rotasFiltradas.reduce((sum, r) =>
                    sum + (r.kmRodados || 0), 0
                );
                const totalParadas = rotasFiltradas.reduce((sum, r) =>
                    sum + (r.quantidadeParadas || 0), 0
                );

                setStats({
                    totalBruto,
                    totalDespesas,
                    totalLiquido: totalBruto - totalDespesas,
                    totalKm,
                    totalParadas,
                    rotasCount: rotasFiltradas.length,
                    despesasCount: despesasFiltradas.length,
                });

                Alert.alert(
                    'PDF Gerado!',
                    `Extrato de ${months[selectedMonth - 1]}/${selectedYear} criado com sucesso`,
                    [
                        { text: 'OK' },
                        {
                            text: 'Compartilhar',
                            onPress: () => handleShare(result.uri!)
                        }
                    ]
                );
            } else {
                Alert.alert('Erro', result.error || 'Não foi possível gerar o PDF');
            }
        } catch (error: any) {
            Alert.alert('Erro', error.message);
        } finally {
            setGenerating(false);
        }
    };

    const handleShare = async (uri?: string) => {
        const pdfUri = uri || lastGeneratedPdf;
        if (!pdfUri) return;

        await shareFile(pdfUri, `Extrato ${months[selectedMonth - 1]}/${selectedYear}`);
    };

    const handleEmail = async (uri?: string) => {
        const pdfUri = uri || lastGeneratedPdf;
        if (!pdfUri) return;

        await shareEmail(
            pdfUri,
            `Extrato ${months[selectedMonth - 1]}/${selectedYear} - RotaFrete`,
            `Segue em anexo meu extrato mensal de ${months[selectedMonth - 1]}/${selectedYear}.`
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView contentContainerStyle={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <Download size={32} color="#8B5CF6" />
                    <Text style={styles.title}>Exportar Extrato</Text>
                    <Text style={styles.subtitle}>
                        Gere um PDF com suas rotas e despesas
                    </Text>
                </View>

                {/* Seleção de período */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Selecione o Período</Text>

                    {/* Mês */}
                    <Text style={styles.label}>Mês</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.monthScroll}
                    >
                        {months.map((month, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.monthButton,
                                    selectedMonth === index + 1 && styles.monthButtonActive
                                ]}
                                onPress={() => setSelectedMonth(index + 1)}
                            >
                                <Text style={[
                                    styles.monthText,
                                    selectedMonth === index + 1 && styles.monthTextActive
                                ]}>
                                    {month.substring(0, 3)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Ano */}
                    <Text style={styles.label}>Ano</Text>
                    <View style={styles.yearRow}>
                        {[2024, 2025, 2026].map((year) => (
                            <TouchableOpacity
                                key={year}
                                style={[
                                    styles.yearButton,
                                    selectedYear === year && styles.yearButtonActive
                                ]}
                                onPress={() => setSelectedYear(year)}
                            >
                                <Text style={[
                                    styles.yearText,
                                    selectedYear === year && styles.yearTextActive
                                ]}>
                                    {year}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Estatísticas (se disponível) */}
                {stats && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Último Extrato Gerado</Text>
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Bruto</Text>
                                <Text style={styles.statValue}>
                                    R$ {stats.totalBruto?.toFixed(2)}
                                </Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Despesas</Text>
                                <Text style={[styles.statValue, { color: '#EF4444' }]}>
                                    R$ {stats.totalDespesas?.toFixed(2)}
                                </Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Líquido</Text>
                                <Text style={[styles.statValue, { color: '#10B981' }]}>
                                    R$ {stats.totalLiquido?.toFixed(2)}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.statsRow}>
                            <Text style={styles.statDetail}>
                                📍 {stats.totalKm} km · 📦 {stats.totalParadas} paradas
                            </Text>
                            <Text style={styles.statDetail}>
                                🚗 {stats.rotasCount} rotas · 💰 {stats.despesasCount} despesas
                            </Text>
                        </View>
                    </View>
                )}

                {/* Botão Gerar */}
                <TouchableOpacity
                    style={[styles.generateButton, generating && styles.generateButtonDisabled]}
                    onPress={handleGenerate}
                    disabled={generating}
                >
                    {generating ? (
                        <>
                            <ActivityIndicator color="#FFF" />
                            <Text style={styles.generateButtonText}>Gerando PDF...</Text>
                        </>
                    ) : (
                        <>
                            <Download size={20} color="#FFF" />
                            <Text style={styles.generateButtonText}>
                                Gerar Extrato de {months[selectedMonth - 1]}/{selectedYear}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Botões de Compartilhamento */}
                {lastGeneratedPdf && (
                    <View style={styles.shareButtons}>
                        <TouchableOpacity
                            style={styles.shareButton}
                            onPress={() => handleShare()}
                        >
                            <Share size={20} color="#8B5CF6" />
                            <Text style={styles.shareButtonText}>Compartilhar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.shareButton}
                            onPress={() => handleEmail()}
                        >
                            <Mail size={20} color="#8B5CF6" />
                            <Text style={styles.shareButtonText}>Enviar Email</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    content: {
        padding: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFF',
        marginTop: 12,
    },
    subtitle: {
        fontSize: 14,
        color: '#94A3B8',
        marginTop: 4,
    },
    card: {
        backgroundColor: '#1E293B',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#CBD5E1',
        marginBottom: 8,
        marginTop: 12,
    },
    monthScroll: {
        marginBottom: 8,
    },
    monthButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#334155',
        marginRight: 8,
    },
    monthButtonActive: {
        backgroundColor: '#8B5CF6',
    },
    monthText: {
        color: '#CBD5E1',
        fontSize: 14,
        fontWeight: '500',
    },
    monthTextActive: {
        color: '#FFF',
    },
    yearRow: {
        flexDirection: 'row',
        gap: 12,
    },
    yearButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#334155',
        alignItems: 'center',
    },
    yearButtonActive: {
        backgroundColor: '#8B5CF6',
    },
    yearText: {
        color: '#CBD5E1',
        fontSize: 16,
        fontWeight: '600',
    },
    yearTextActive: {
        color: '#FFF',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    statItem: {
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        color: '#94A3B8',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
    },
    statDetail: {
        fontSize: 12,
        color: '#94A3B8',
    },
    generateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#8B5CF6',
        padding: 16,
        borderRadius: 12,
        gap: 8,
        marginBottom: 16,
    },
    generateButtonDisabled: {
        opacity: 0.6,
    },
    generateButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    shareButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    shareButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1E293B',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#8B5CF6',
        gap: 8,
    },
    shareButtonText: {
        color: '#8B5CF6',
        fontSize: 14,
        fontWeight: '600',
    },
});
