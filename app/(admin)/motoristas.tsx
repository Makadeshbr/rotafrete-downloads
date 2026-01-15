// app/(admin)/motoristas.tsx
// ============================================
// ROTAFRETE - Lista de Motoristas (Admin)
// ============================================
// Exibe todos os motoristas cadastrados com
// status de suas inspeções e filtros.
// ============================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Search,
  User,
  Truck,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Filter,
  ChevronRight,
  X,
} from 'lucide-react-native';

// Store
import { useAdminStore } from '@/store/useAdminStore';
import type { MotoristaResumo } from '@/types/inspection';

// ============================================
// COMPONENTE DE ITEM
// ============================================

interface MotoristaItemProps {
  motorista: MotoristaResumo;
  onPress: () => void;
}

function MotoristaItem({ motorista, onPress }: MotoristaItemProps) {
  // Status da última inspeção
  const statusColors: Record<string, { color: string; bg: string }> = {
    APROVADA: { color: '#22C55E', bg: '#052E16' },
    ENVIADA: { color: '#3B82F6', bg: '#172554' },
    PENDENTE: { color: '#F59E0B', bg: '#422006' },
    REPROVADA: { color: '#EF4444', bg: '#450A0A' },
    PARCIAL: { color: '#F59E0B', bg: '#422006' },
    EM_ANALISE: { color: '#8B5CF6', bg: '#2E1065' },
  };

  const status = motorista.ultimaInspecao?.status || 'PENDENTE';
  const statusConfig = statusColors[status] || statusColors.PENDENTE;

  return (
    <TouchableOpacity
      style={styles.motoristaItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={styles.motoristaAvatar}>
        <User size={24} color="#64748B" />
      </View>

      {/* Info */}
      <View style={styles.motoristaInfo}>
        <Text style={styles.motoristaNome}>{motorista.nome}</Text>
        <View style={styles.motoristaVeiculo}>
          <Truck size={12} color="#64748B" />
          <Text style={styles.motoristaVeiculoText}>
            {motorista.veiculo.placa} • {motorista.veiculo.modelo}
          </Text>
        </View>

        {/* Status da última inspeção */}
        <View style={styles.motoristaStatusRow}>
          <View
            style={[styles.motoristaStatus, { backgroundColor: statusConfig.bg }]}
          >
            <Text style={[styles.motoristaStatusText, { color: statusConfig.color }]}>
              {status === 'APROVADA'
                ? 'Aprovada'
                : status === 'ENVIADA'
                  ? 'Aguardando'
                  : status === 'PENDENTE'
                    ? 'Pendente'
                    : status === 'REPROVADA'
                      ? 'Reprovada'
                      : status}
            </Text>
          </View>

          {/* Indicadores de problema */}
          {motorista.itensCriticos > 0 && (
            <View style={styles.problemBadge}>
              <XCircle size={10} color="#EF4444" />
              <Text style={styles.problemBadgeText}>{motorista.itensCriticos}</Text>
            </View>
          )}
          {motorista.itensAtencao > 0 && (
            <View style={styles.problemBadge}>
              <AlertTriangle size={10} color="#F59E0B" />
              <Text style={styles.problemBadgeTextWarning}>
                {motorista.itensAtencao}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Seta */}
      <ChevronRight size={20} color="#64748B" />
    </TouchableOpacity>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function MotoristasScreen() {
  // Store
  const { motoristas, isLoading, carregarMotoristas } = useAdminStore();

  // Estados locais
  const [refreshing, setRefreshing] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'problemas' | 'pendentes'>('todos');

  // Carrega dados
  useEffect(() => {
    carregarMotoristas();
  }, []);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await carregarMotoristas();
    setRefreshing(false);
  }, []);

  // Filtra motoristas
  const motoristasFiltrados = motoristas.filter((m) => {
    // Filtro de busca
    const matchBusca =
      busca.trim() === '' ||
      m.nome.toLowerCase().includes(busca.toLowerCase()) ||
      m.veiculo.placa.toLowerCase().includes(busca.toLowerCase());

    // Filtro de status
    let matchFiltro = true;
    if (filtro === 'problemas') {
      matchFiltro = m.itensCriticos > 0 || m.itensAtencao > 0;
    } else if (filtro === 'pendentes') {
      matchFiltro =
        m.ultimaInspecao?.status === 'PENDENTE' ||
        m.ultimaInspecao?.status === 'ENVIADA';
    }

    return matchBusca && matchFiltro;
  });

  // Handlers
  const handleAbrirMotorista = (motorista: MotoristaResumo) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Abre a inspeção atual do motorista
    if (motorista.ultimaInspecao?.id) {
      router.push({
        pathname: '/(admin)/avaliar/[inspecaoId]',
        params: { inspecaoId: motorista.ultimaInspecao.id }, // [FIXED] Usa ID real
      });
    } else {
      console.warn('[Admin] Tentativa de abrir inspeção sem ID', motorista);
      // Fallback or Alert could go here
    }
  };

  // Renderiza item
  const renderItem = ({ item }: { item: MotoristaResumo }) => (
    <MotoristaItem motorista={item} onPress={() => handleAbrirMotorista(item)} />
  );

  // Renderiza lista vazia
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <User size={48} color="#64748B" />
      <Text style={styles.emptyTitle}>Nenhum motorista encontrado</Text>
      <Text style={styles.emptyText}>
        {busca
          ? 'Tente buscar por outro nome ou placa.'
          : 'Não há motoristas cadastrados.'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Motoristas</Text>
        <Text style={styles.headerSubtitle}>
          {motoristasFiltrados.length} de {motoristas.length}
        </Text>
      </View>

      {/* Barra de busca */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={18} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome ou placa..."
            placeholderTextColor="#64748B"
            value={busca}
            onChangeText={setBusca}
          />
          {busca.length > 0 && (
            <TouchableOpacity onPress={() => setBusca('')}>
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filtros */}
      <View style={styles.filtrosContainer}>
        <TouchableOpacity
          style={[styles.filtroChip, filtro === 'todos' && styles.filtroChipActive]}
          onPress={() => setFiltro('todos')}
        >
          <Text
            style={[
              styles.filtroChipText,
              filtro === 'todos' && styles.filtroChipTextActive,
            ]}
          >
            Todos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filtroChip,
            filtro === 'problemas' && styles.filtroChipActive,
          ]}
          onPress={() => setFiltro('problemas')}
        >
          <AlertTriangle
            size={14}
            color={filtro === 'problemas' ? '#3B82F6' : '#64748B'}
          />
          <Text
            style={[
              styles.filtroChipText,
              filtro === 'problemas' && styles.filtroChipTextActive,
            ]}
          >
            Com Problemas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filtroChip,
            filtro === 'pendentes' && styles.filtroChipActive,
          ]}
          onPress={() => setFiltro('pendentes')}
        >
          <Clock
            size={14}
            color={filtro === 'pendentes' ? '#3B82F6' : '#64748B'}
          />
          <Text
            style={[
              styles.filtroChipText,
              filtro === 'pendentes' && styles.filtroChipTextActive,
            ]}
          >
            Pendentes
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista */}
      <FlatList
        data={motoristasFiltrados}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
          />
        }
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },

  // Busca
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#F1F5F9',
  },

  // Filtros
  filtrosContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filtroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    gap: 6,
  },
  filtroChipActive: {
    backgroundColor: '#172554',
  },
  filtroChipText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  filtroChipTextActive: {
    color: '#3B82F6',
    fontWeight: '500',
  },

  // Lista
  listContent: {
    padding: 16,
  },
  motoristaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  motoristaAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  motoristaInfo: {
    flex: 1,
    marginLeft: 12,
  },
  motoristaNome: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  motoristaVeiculo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  motoristaVeiculoText: {
    fontSize: 12,
    color: '#64748B',
  },
  motoristaStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  motoristaStatus: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  motoristaStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  problemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  problemBadgeText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
  },
  problemBadgeTextWarning: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '600',
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
});
