// app/(tabs)/expenses/fuel.tsx
// ============================================
// ROTAFRETE - Tela de Abastecimentos
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
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Fuel,
  Plus,
  ArrowLeft,
  Droplet,
  Leaf,
  X,
  Calendar,
  DollarSign,
  Gauge,
  MapPin,
  Trash2,
} from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';

import { Card, CardContent, Button, Input } from '@/components/ui';
import { WeeklyHistory } from '@/components/expenses';
import { useDespesasStore } from '@/store';
import { useAuth } from '@aether-baas/react-native';
import { formatarMoeda, COMBUSTIVEIS, type TipoCombustivel } from '@/constants';

const { width } = Dimensions.get('window');

// Ícones por tipo de combustível
const COMBUSTIVEL_ICONS: Record<TipoCombustivel, { icon: React.FC<any>; cor: string }> = {
  GASOLINA: { icon: Fuel, cor: '#F59E0B' },
  ETANOL: { icon: Leaf, cor: '#22C55E' },
  DIESEL: { icon: Droplet, cor: '#3B82F6' },
};

export default function FuelScreen() {
  const router = useRouter();
  // useAuth do SDK - 100% nativo
  const { user } = useAuth();
  const {
    despesas,
    adicionarDespesa,
    deletarDespesa,
    fetchDespesasSemana,
    isLoading,
  } = useDespesasStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [tipoCombustivel, setTipoCombustivel] = useState<TipoCombustivel>('GASOLINA');
  const [precoLitro, setPrecoLitro] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [litros, setLitros] = useState('');
  const [posto, setPosto] = useState('');
  const [kmOdometro, setKmOdometro] = useState('');

  const hoje = new Date();

  // Busca dados da semana ao focar (ou mês se preferir, mas o store é focado em semana agora. Vamos manter foco semana para ficar leve ou preciso criar fetchMes?) 
  // O app pede Extrato Mensal. O useDespesasStore tem fetchDespesasPorPeriodo.
  // Vamos usar fetchDespesasPorPeriodo filtrando pelo mês atual aqui no componente.

  const startOfMonth = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const endOfMonth = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  // Busca dados ao focar - [MELHORIA] 8 semanas de histórico
  const startOfHistory = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1); // 2 meses atrás
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

  // Filtra apenas combustíveis do mês
  const abastecimentosDoMes = despesas.filter(d => d.tipo === 'COMBUSTIVEL').sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  // Calcula totais locais
  const getTotalMes = () => abastecimentosDoMes.reduce((acc, curr) => acc + curr.valor, 0);

  const getMediaPrecoLitro = () => {
    if (abastecimentosDoMes.length === 0) return 0;
    const total = abastecimentosDoMes.reduce((acc, curr) => acc + (curr.precoLitro || 0), 0);
    return total / abastecimentosDoMes.length;
  };

  // Calcula litros automaticamente
  const calcularLitros = () => {
    const preco = parseFloat(precoLitro.replace(',', '.'));
    const total = parseFloat(valorTotal.replace(',', '.'));
    if (preco > 0 && total > 0) {
      setLitros((total / preco).toFixed(2));
    }
  };

  // Salva novo abastecimento
  const handleSalvar = async () => {
    if (!user?.id) return;

    const preco = parseFloat(precoLitro.replace(',', '.'));
    const total = parseFloat(valorTotal.replace(',', '.'));

    if (!preco || !total) {
      Alert.alert('Erro', 'Preencha o preço por litro e valor total');
      return;
    }

    // [REFATORAÇÃO] Usa useDespesasStore
    const result = await adicionarDespesa({
      motoristaId: user.id,
      tipo: 'COMBUSTIVEL',
      descricao: `Abastecimento - ${COMBUSTIVEIS.find(c => c.id === (tipoCombustivel as string))?.nome}`,
      data: format(hoje, 'yyyy-MM-dd'),
      valor: total,

      // Campos específicos
      tipoCombustivel,
      precoLitro: preco,
      litros: litros ? parseFloat(litros.replace(',', '.')) : undefined,
      posto: posto || undefined,
      kmOdometro: kmOdometro ? parseInt(kmOdometro) : undefined,
    });

    if (result) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('✅ Sucesso', 'Abastecimento registrado!');
      setModalVisible(false);
      resetForm();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const { error } = useDespesasStore.getState();
      Alert.alert('❌ Erro', error || 'Falha ao salvar abastecimento.');
    }
  };

  const resetForm = () => {
    setPrecoLitro('');
    setValorTotal('');
    setLitros('');
    setPosto('');
    setKmOdometro('');
    setTipoCombustivel('GASOLINA');
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Remover Abastecimento',
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
            <Text style={styles.title}>Abastecimentos</Text>
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              style={styles.addButton}
            >
              <Plus size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Card Resumo */}
          <LinearGradient
            colors={['#22C55E', '#16A34A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCard}
          >
            <Text style={styles.summaryTitle}>Total do Mês</Text>
            <Text style={styles.summaryValue}>{formatarMoeda(getTotalMes())}</Text>
            <View style={styles.summaryStats}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatLabel}>Média R$/L</Text>
                <Text style={styles.summaryStatValue}>
                  {formatarMoeda(getMediaPrecoLitro())}
                </Text>
              </View>
              <View style={styles.summaryStatDivider} />
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatLabel}>Registros</Text>
                <Text style={styles.summaryStatValue}>{abastecimentosDoMes.length}</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Lista de Abastecimentos */}
          <Text style={styles.sectionTitle}>
            {format(hoje, "MMMM 'de' yyyy", { locale: ptBR })}
          </Text>

          {abastecimentosDoMes.length === 0 ? (
            <View style={styles.emptyState}>
              <Fuel size={48} color="#334155" />
              <Text style={styles.emptyTitle}>Nenhum abastecimento</Text>
              <Text style={styles.emptySubtitle}>
                Toque em + para registrar
              </Text>
            </View>
          ) : (
            abastecimentosDoMes.map((item) => {
              const config = (item.tipoCombustivel && COMBUSTIVEL_ICONS[item.tipoCombustivel as TipoCombustivel]) || { icon: Fuel, cor: '#F59E0B' };
              const Icon = config.icon;

              return (
                <Card key={item.id} variant="default" style={styles.itemCard}>
                  <CardContent>
                    <View style={styles.itemHeader}>
                      <View style={[styles.itemIcon, { backgroundColor: `${config.cor}20` }]}>
                        <Icon size={20} color={config.cor} />
                      </View>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemTipo}>
                          {COMBUSTIVEIS.find(c => c.id === item.tipoCombustivel)?.nome || 'Combustível'}
                        </Text>
                        <Text style={styles.itemData}>
                          {item.data ? format(parseISO(item.data), "d 'de' MMM", { locale: ptBR }) : 'Sem data'}
                        </Text>
                      </View>
                      <View style={styles.itemValues}>
                        <Text style={styles.itemValor}>{formatarMoeda(item.valor)}</Text>
                        <Text style={styles.itemPreco}>
                          R$ {(item.precoLitro || 0).toFixed(2)}/L
                        </Text>
                      </View>
                    </View>
                    <View style={styles.itemFooter}>
                      {item.litros && (
                        <Text style={styles.itemDetail}>{item.litros.toFixed(1)} litros</Text>
                      )}
                      {item.posto && (
                        <Text style={styles.itemDetail}>• {item.posto}</Text>
                      )}
                      <TouchableOpacity
                        onPress={() => item.id && handleDelete(item.id)}
                        style={styles.deleteButton}
                      >
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </CardContent>
                </Card>
              );
            })
          )}

          {/* Histórico Semanal */}
          <WeeklyHistory
            despesas={despesas}
            tipo="COMBUSTIVEL"
            accentColor="#22C55E"
            weeksToShow={8}
            renderItem={(item) => {
              const config = (item.tipoCombustivel && COMBUSTIVEL_ICONS[item.tipoCombustivel as TipoCombustivel]) || { icon: Fuel, cor: '#F59E0B' };
              const Icon = config.icon;
              const dateStr = item.dataRegistro || item.data || item.createdAt || '';
              return (
                <View style={styles.historyItem}>
                  <View style={[styles.historyIcon, { backgroundColor: `${config.cor}20` }]}>
                    <Icon size={16} color={config.cor} />
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyTitle}>
                      {COMBUSTIVEIS.find(c => c.id === item.tipoCombustivel)?.nome || 'Combustível'}
                    </Text>
                    <Text style={styles.historyDate}>
                      {dateStr ? format(new Date(dateStr), "d 'de' MMM", { locale: ptBR }) : ''}
                      {item.posto ? ` • ${item.posto}` : ''}
                    </Text>
                  </View>
                  <View style={styles.historyValues}>
                    <Text style={styles.historyValor}>{formatarMoeda(item.valor)}</Text>
                    {item.litros && <Text style={styles.historyLitros}>{item.litros.toFixed(1)}L</Text>}
                  </View>
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
              <Text style={styles.modalTitle}>Novo Abastecimento</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Seletor de Combustível */}
            <Text style={styles.inputLabel}>Tipo de Combustível</Text>
            <View style={styles.tipoGrid}>
              {COMBUSTIVEIS.map((comb) => {
                const config = COMBUSTIVEL_ICONS[comb.id];
                const Icon = config.icon;
                const isSelected = tipoCombustivel === comb.id;

                return (
                  <TouchableOpacity
                    key={comb.id}
                    style={[
                      styles.tipoOption,
                      isSelected && { borderColor: config.cor, backgroundColor: `${config.cor}15` },
                    ]}
                    onPress={() => setTipoCombustivel(comb.id)}
                  >
                    <Icon size={24} color={isSelected ? config.cor : '#64748B'} />
                    <Text style={[styles.tipoText, isSelected && { color: config.cor }]}>
                      {comb.nome}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Inputs */}
            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Text style={styles.inputLabel}>Preço/Litro</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0,00"
                  placeholderTextColor="#64748B"
                  keyboardType="decimal-pad"
                  value={precoLitro}
                  onChangeText={setPrecoLitro}
                  onBlur={calcularLitros}
                />
              </View>
              <View style={styles.inputHalf}>
                <Text style={styles.inputLabel}>Valor Total</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0,00"
                  placeholderTextColor="#64748B"
                  keyboardType="decimal-pad"
                  value={valorTotal}
                  onChangeText={setValorTotal}
                  onBlur={calcularLitros}
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Text style={styles.inputLabel}>Litros (auto)</Text>
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  placeholder="Calculado"
                  placeholderTextColor="#475569"
                  value={litros}
                  editable={false}
                />
              </View>
              <View style={styles.inputHalf}>
                <Text style={styles.inputLabel}>KM Odômetro</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Opcional"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  value={kmOdometro}
                  onChangeText={setKmOdometro}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Posto (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome do posto"
              placeholderTextColor="#64748B"
              value={posto}
              onChangeText={setPosto}
            />

            <Button onPress={handleSalvar} loading={isLoading} fullWidth size="lg">
              Salvar Abastecimento
            </Button>
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
  itemIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemInfo: { flex: 1 },
  itemTipo: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  itemData: { fontSize: 13, color: '#64748B', marginTop: 2 },
  itemValues: { alignItems: 'flex-end' },
  itemValor: { fontSize: 18, fontWeight: '700', color: '#22C55E' },
  itemPreco: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  itemFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#334155' },
  itemDetail: { fontSize: 13, color: '#64748B', marginRight: 8 },
  deleteButton: { marginLeft: 'auto', padding: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#94A3B8', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1E293B', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#94A3B8', marginBottom: 8, marginTop: 16 },
  tipoGrid: { flexDirection: 'row', gap: 12 },
  tipoOption: { flex: 1, alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 2, borderColor: '#334155', backgroundColor: '#0F172A' },
  tipoText: { fontSize: 12, fontWeight: '600', color: '#64748B', marginTop: 8 },
  inputRow: { flexDirection: 'row', gap: 12 },
  inputHalf: { flex: 1 },
  input: { backgroundColor: '#0F172A', borderWidth: 2, borderColor: '#334155', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#FFFFFF' },
  inputDisabled: { backgroundColor: '#0F172A', borderColor: '#1E293B' },
  // History item styles
  historyItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 10, padding: 12 },
  historyIcon: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  historyInfo: { flex: 1 },
  historyTitle: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  historyDate: { fontSize: 12, color: '#64748B', marginTop: 2 },
  historyValues: { alignItems: 'flex-end' },
  historyValor: { fontSize: 15, fontWeight: '700', color: '#22C55E' },
  historyLitros: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
});
