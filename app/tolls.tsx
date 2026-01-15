// app/(tabs)/expenses/tolls.tsx
// ============================================
// ROTAFRETE - Tela de Pedágios
// ============================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  CircleDollarSign,
  Plus,
  ArrowLeft,
  X,
  Trash2,
  MapPin,
  Route,
} from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';

import { Card, CardContent, Button } from '@/components/ui';
import { WeeklyHistory } from '@/components/expenses';
import { useDespesasStore } from '@/store';
import { useAuth } from '@aether-baas/react-native';
import { formatarMoeda } from '@/constants';

export default function TollsScreen() {
  const router = useRouter();
  // useAuth do SDK - 100% nativo
  // useAuth do SDK - 100% nativo
  const { user } = useAuth();
  const {
    despesas,
    adicionarDespesa,
    deletarDespesa,
    isLoading,
  } = useDespesasStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [valor, setValor] = useState('');
  const [rodovia, setRodovia] = useState('');
  const [praca, setPraca] = useState('');

  const hoje = new Date();

  const startOfMonth = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const endOfMonth = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  // Busca dados ao focar - [MELHORIA] 8 semanas de histórico
  const startOfHistory = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1);
  const endOfHistory = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  // Busca dados ao focar
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        // [REFATORAÇÃO] Busca 8 semanas de histórico
        const useStore = useDespesasStore.getState();
        useStore.fetchDespesasPorPeriodo(user.id, startOfHistory, endOfHistory);
      }
    }, [user?.id])
  );

  // Filtro local de pedágios
  const pedagiosDoMes = despesas.filter(d => d.tipo === 'PEDAGIO').sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  // Totais
  const getTotalMes = () => pedagiosDoMes.reduce((acc, curr) => acc + curr.valor, 0);

  // Agrupa por rodovia (para exibir resumo) - [FIX] Adicionado para substituir o anterior que removi sem querer
  const pedagiosPorRodovia = pedagiosDoMes.reduce((acc, p) => {
    // [FIX] cast para string ou default
    const key = (p.rodovia as string) || 'Não informado';
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {} as Record<string, typeof pedagiosDoMes>);

  // Salva novo pedágio
  const handleSalvar = async () => {
    if (!user?.id) return;

    const valorNum = parseFloat(valor.replace(',', '.'));

    if (!valorNum || valorNum <= 0) {
      Alert.alert('Erro', 'Informe o valor do pedágio');
      return;
    }

    // [REFATORAÇÃO] Integração com Despesas Unificadas
    const result = await adicionarDespesa({
      motoristaId: user.id,
      tipo: 'PEDAGIO',
      descricao: `Pedágio ${rodovia ? '- ' + rodovia : ''}`,
      data: format(hoje, 'yyyy-MM-dd'),
      valor: valorNum,

      // Campos específicos
      rodovia: rodovia || undefined,
      praca: praca || undefined,
    });

    if (result) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('✅ Sucesso', 'Pedágio registrado!');
      setModalVisible(false);
      resetForm();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const { error } = useDespesasStore.getState();
      Alert.alert('❌ Erro', error || 'Falha ao salvar pedágio.');
    }
  };

  const resetForm = () => {
    setValor('');
    setRodovia('');
    setPraca('');
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Remover Pedágio',
      'Tem certeza que deseja remover?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await deletarDespesa(id);
          },
        },
      ]
    );
  };



  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0F172A', '#020617']} style={styles.background}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.title}>Pedágios</Text>
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              style={styles.addButton}
            >
              <Plus size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Card Resumo */}
          <LinearGradient
            colors={['#3B82F6', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCard}
          >
            <Text style={styles.summaryTitle}>Total do Mês</Text>
            <Text style={styles.summaryValue}>{formatarMoeda(getTotalMes())}</Text>
            <View style={styles.summaryStats}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatLabel}>Passagens</Text>
                <Text style={styles.summaryStatValue}>{pedagiosDoMes.length}</Text>
              </View>
              <View style={styles.summaryStatDivider} />
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatLabel}>Média</Text>
                <Text style={styles.summaryStatValue}>
                  {formatarMoeda(pedagiosDoMes.length > 0 ? getTotalMes() / pedagiosDoMes.length : 0)}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Lista de Pedágios */}
          <Text style={styles.sectionTitle}>
            {format(hoje, "MMMM 'de' yyyy", { locale: ptBR })}
          </Text>

          {pedagiosDoMes.length === 0 ? (
            <View style={styles.emptyState}>
              <CircleDollarSign size={48} color="#334155" />
              <Text style={styles.emptyTitle}>Nenhum pedágio</Text>
              <Text style={styles.emptySubtitle}>
                Toque em + para registrar
              </Text>
            </View>
          ) : (
            pedagiosDoMes.map((item) => (
              <Card key={item.id} variant="default" style={styles.itemCard}>
                <CardContent>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemIcon}>
                      <CircleDollarSign size={20} color="#3B82F6" />
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemRodovia}>
                        {item.rodovia || 'Rodovia não informada'}
                      </Text>
                      {item.praca && (
                        <Text style={styles.itemPraca}>Praça: {item.praca}</Text>
                      )}
                      <Text style={styles.itemData}>
                        {item.data ? format(parseISO(item.data), "d 'de' MMM", { locale: ptBR }) : 'Sem data'}
                      </Text>
                    </View>
                    <View style={styles.itemValues}>
                      <Text style={styles.itemValor}>{formatarMoeda(item.valor || 0)}</Text>
                      <TouchableOpacity
                        onPress={() => handleDelete(item.id as string)}
                        style={styles.deleteButton}
                      >
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </CardContent>
              </Card>
            ))
          )}

          {/* Resumo por Rodovia */}
          {Object.keys(pedagiosPorRodovia).length > 1 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Por Rodovia</Text>
              {Object.entries(pedagiosPorRodovia).map(([rodovia, items]) => (
                <View key={rodovia} style={styles.rodoviaCard}>
                  <View style={styles.rodoviaHeader}>
                    <Route size={16} color="#64748B" />
                    <Text style={styles.rodoviaNome}>{rodovia}</Text>
                  </View>
                  <View style={styles.rodoviaStats}>
                    <Text style={styles.rodoviaCount}>{items.length} passagens</Text>
                    <Text style={styles.rodoviaTotal}>
                      {formatarMoeda(items.reduce((sum, p) => sum + p.valor, 0))}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Histórico Semanal */}
          <WeeklyHistory
            despesas={despesas}
            tipo="PEDAGIO"
            accentColor="#3B82F6"
            weeksToShow={8}
            renderItem={(item) => {
              const dateStr = item.dataRegistro || item.data || item.createdAt || '';
              return (
                <View style={styles.historyItem}>
                  <View style={styles.historyIcon}>
                    <CircleDollarSign size={16} color="#3B82F6" />
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyTitle}>
                      {item.rodovia || 'Pedágio'}
                    </Text>
                    <Text style={styles.historyDate}>
                      {dateStr ? format(new Date(dateStr), "d 'de' MMM", { locale: ptBR }) : ''}
                      {item.praca ? ` • ${item.praca}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.historyValor}>{formatarMoeda(item.valor)}</Text>
                </View>
              );
            }}
          />
        </ScrollView>
      </LinearGradient>

      {/* Modal de Adicionar */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo Pedágio</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Valor do Pedágio *</Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              placeholderTextColor="#64748B"
              keyboardType="decimal-pad"
              value={valor}
              onChangeText={setValor}
              autoFocus
            />

            <Text style={styles.inputLabel}>Rodovia (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: SP-270, BR-116"
              placeholderTextColor="#64748B"
              value={rodovia}
              onChangeText={setRodovia}
              autoCapitalize="characters"
            />

            <Text style={styles.inputLabel}>Praça (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Itapetininga, Registro"
              placeholderTextColor="#64748B"
              value={praca}
              onChangeText={setPraca}
            />

            <View style={{ marginTop: 24 }}>
              <Button onPress={handleSalvar} loading={isLoading} fullWidth size="lg">
                Salvar Pedágio
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 100 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  addButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FF6B00', justifyContent: 'center', alignItems: 'center' },
  summaryCard: { borderRadius: 20, padding: 24, marginBottom: 24 },
  summaryTitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  summaryValue: { fontSize: 36, fontWeight: '800', color: '#FFFFFF', marginVertical: 8 },
  summaryStats: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  summaryStat: { alignItems: 'center' },
  summaryStatLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  summaryStatValue: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginTop: 4 },
  summaryStatDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 16, textTransform: 'capitalize' },
  itemCard: { marginBottom: 12 },
  itemHeader: { flexDirection: 'row', alignItems: 'center' },
  itemIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(59, 130, 246, 0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemInfo: { flex: 1 },
  itemRodovia: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  itemPraca: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  itemData: { fontSize: 12, color: '#64748B', marginTop: 4 },
  itemValues: { alignItems: 'flex-end' },
  itemValor: { fontSize: 18, fontWeight: '700', color: '#3B82F6' },
  deleteButton: { padding: 8, marginTop: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#94A3B8', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  rodoviaCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 10 },
  rodoviaHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rodoviaNome: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  rodoviaStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  rodoviaCount: { fontSize: 13, color: '#64748B' },
  rodoviaTotal: { fontSize: 14, fontWeight: '700', color: '#3B82F6' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1E293B', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#94A3B8', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#0F172A', borderWidth: 2, borderColor: '#334155', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#FFFFFF' },
  // History item styles
  historyItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 10, padding: 12 },
  historyIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(59, 130, 246, 0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  historyInfo: { flex: 1 },
  historyTitle: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  historyDate: { fontSize: 12, color: '#64748B', marginTop: 2 },
  historyValor: { fontSize: 15, fontWeight: '700', color: '#3B82F6' },
});
