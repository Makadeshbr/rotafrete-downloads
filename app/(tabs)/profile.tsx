// app/(tabs)/profile.tsx
// ============================================
// ROTAFRETE - Tela de Perfil [v2.0]
// ============================================
// Versão enterprise-ready com:
// - Avatar dinâmico (foto do usuário)
// - Redirecionamento para edição funcional
// - Atualização automática via pull-to-refresh
// ============================================

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  User,
  Mail,
  Phone,
  Car,
  MapPin,
  Sun,
  Moon,
  LogOut,
  ChevronRight,
  Bell,
  Shield,
  HelpCircle,
  Star,
  FileText,
  Edit3,
  Truck,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { Card, CardContent, Button } from '@/components/ui';
import { useAuth } from '@aether-baas/react-native';
import { VEICULOS, type TipoVeiculo } from '@/constants';

// ============================================
// COMPONENTES INTERNOS
// ============================================

function MenuItem({
  icon: Icon,
  iconColor,
  label,
  value,
  onPress,
  showChevron = true,
  rightElement,
}: {
  icon: React.FC<any>;
  iconColor: string;
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  rightElement?: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={[styles.menuIcon, { backgroundColor: `${iconColor}15` }]}>
        <Icon size={20} color={iconColor} />
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuLabel}>{label}</Text>
        {value && <Text style={styles.menuValue}>{value}</Text>}
      </View>
      {rightElement || (showChevron && onPress && (
        <ChevronRight size={20} color="#64748B" />
      ))}
    </TouchableOpacity>
  );
}

function MenuSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.menuSection}>
      <Text style={styles.menuSectionTitle}>{title}</Text>
      <Card variant="default">
        <CardContent style={styles.menuSectionContent}>
          {children}
        </CardContent>
      </Card>
    </View>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function ProfileScreen() {
  const router = useRouter();

  const { user, signOut, isPending, refreshUser } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Carrega perfil na montagem
  useEffect(() => {
    console.log('[Profile] Carregando perfil inicial');
    refreshUser().catch(console.error);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshUser();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[Profile] Erro:', error);
    }
    setIsRefreshing(false);
  };

  // Metadata do usuário
  const metadata = user?.metadata as any;
  const tipoVeiculo = (metadata?.tipoVeiculo || 'UTILITARIO') as TipoVeiculo;
  const veiculoConfig = VEICULOS.find(v => v.id === tipoVeiculo);
  const avatarUrl = user?.avatarUrl || metadata?.avatarUrl;

  const handleLogout = () => {
    Alert.alert(
      'Sair da Conta',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/edit-profile');
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0F172A', '#020617']} style={styles.background}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#FF6B00"
              colors={['#FF6B00']}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.avatarContainer}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <LinearGradient colors={['#FF6B00', '#EA580C']} style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {user?.name?.charAt(0)?.toUpperCase() || 'M'}
                  </Text>
                </LinearGradient>
              )}
              <TouchableOpacity style={styles.editAvatarButton} onPress={handleEditProfile}>
                <Edit3 size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.userName}>{user?.name || 'Motorista'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>

            <View style={[styles.vehicleBadge, { backgroundColor: `${veiculoConfig?.cor}20` }]}>
              <Truck size={16} color={veiculoConfig?.cor} />
              <Text style={[styles.vehicleBadgeText, { color: veiculoConfig?.cor }]}>
                {veiculoConfig?.nome}
                {metadata?.placaVeiculo && ` • ${metadata.placaVeiculo}`}
              </Text>
            </View>
          </View>

          {/* Informações */}
          <MenuSection title="Informações">
            <MenuItem icon={User} iconColor="#3B82F6" label="Nome" value={user?.name || 'Não informado'} onPress={handleEditProfile} />
            <View style={styles.menuDivider} />
            <MenuItem icon={Mail} iconColor="#22C55E" label="E-mail" value={user?.email} showChevron={false} />
            <View style={styles.menuDivider} />
            <MenuItem icon={Phone} iconColor="#A855F7" label="Telefone" value={user?.phone || metadata?.telefone || 'Não informado'} onPress={handleEditProfile} />
          </MenuSection>

          {/* Veículo */}
          <MenuSection title="Veículo">
            <MenuItem icon={Car} iconColor={veiculoConfig?.cor || '#64748B'} label="Tipo" value={veiculoConfig?.nome || 'Não informado'} onPress={handleEditProfile} />
            <View style={styles.menuDivider} />
            <MenuItem icon={FileText} iconColor="#F59E0B" label="Placa" value={metadata?.placaVeiculo || 'Não informada'} onPress={handleEditProfile} />
            <View style={styles.menuDivider} />
            <MenuItem icon={Truck} iconColor="#EC4899" label="Modelo" value={metadata?.modeloVeiculo || 'Não informado'} onPress={handleEditProfile} />
            <View style={styles.menuDivider} />
            <MenuItem icon={MapPin} iconColor="#06B6D4" label="Cidade Base" value={metadata?.cidadeBase || 'Avaré'} showChevron={false} />
          </MenuSection>

          {/* Preferências */}
          <MenuSection title="Preferências">
            <MenuItem
              icon={metadata?.turnoPreferido === 'AM' ? Sun : Moon}
              iconColor={metadata?.turnoPreferido === 'AM' ? '#F59E0B' : '#8B5CF6'}
              label="Turno Preferido"
              value={metadata?.turnoPreferido === 'AM' ? 'Manhã' : 'Tarde'}
              onPress={handleEditProfile}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon={Bell}
              iconColor="#EF4444"
              label="Notificações"
              value="Configurar"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(tabs)/notification-settings' as any);
              }}
            />
          </MenuSection>

          {/* Suporte */}
          <MenuSection title="Suporte">
            <MenuItem icon={HelpCircle} iconColor="#3B82F6" label="Central de Ajuda" onPress={() => Alert.alert('Em breve', 'Central de ajuda será implementada')} />
            <View style={styles.menuDivider} />
            <MenuItem icon={Shield} iconColor="#22C55E" label="Privacidade" onPress={() => Alert.alert('Em breve', 'Política de privacidade será implementada')} />
            <View style={styles.menuDivider} />
            <MenuItem icon={Star} iconColor="#F59E0B" label="Avaliar App" onPress={() => Alert.alert('Obrigado!', 'Em breve você poderá avaliar o app na loja')} />
          </MenuSection>

          {/* Logout */}
          <Button
            variant="danger"
            onPress={handleLogout}
            loading={isPending}
            fullWidth
            icon={<LogOut size={20} color="#FFFFFF" />}
            iconPosition="left"
          >
            Sair da Conta
          </Button>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>RotaFrete v1.0.0</Text>
            <Text style={styles.footerSubtext}>Powered by Aether Platform</Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 100 },

  header: { alignItems: 'center', marginBottom: 32 },
  avatarContainer: { position: 'relative', marginBottom: 16 },
  avatar: {
    width: 100, height: 100, borderRadius: 50,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#FF6B00', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 12,
  },
  avatarImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#FF6B00' },
  avatarText: { fontSize: 40, fontWeight: '800', color: '#FFFFFF' },
  editAvatarButton: {
    position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#1E293B', borderWidth: 3, borderColor: '#0F172A',
    justifyContent: 'center', alignItems: 'center',
  },
  userName: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  userEmail: { fontSize: 14, color: '#94A3B8', marginBottom: 12 },
  vehicleBadge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
    paddingVertical: 8, borderRadius: 20, gap: 8,
  },
  vehicleBadgeText: { fontSize: 14, fontWeight: '600' },

  menuSection: { marginBottom: 24 },
  menuSectionTitle: {
    fontSize: 13, fontWeight: '600', color: '#64748B',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, marginLeft: 4,
  },
  menuSectionContent: { padding: 0 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  menuIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  menuContent: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '500', color: '#F1F5F9' },
  menuValue: { fontSize: 13, color: '#64748B', marginTop: 2 },
  menuDivider: { height: 1, backgroundColor: '#334155', marginLeft: 68 },

  footer: { alignItems: 'center', marginTop: 32, paddingTop: 24, borderTopWidth: 1, borderTopColor: '#1E293B' },
  footerText: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  footerSubtext: { fontSize: 12, color: '#475569', marginTop: 4 },
});
