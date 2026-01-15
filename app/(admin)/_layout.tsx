// app/(admin)/_layout.tsx
// ============================================
// ROTAFRETE - Layout do Painel Admin
// ============================================
// Define a estrutura de navegação do painel
// administrativo com tabs inferiores.
// ============================================

import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  FileBarChart,
  Settings,
} from 'lucide-react-native';

import { type LucideIcon } from 'lucide-react-native';

// ============================================
// COMPONENTE DE TAB BAR ICON
// ============================================

interface TabBarIconProps {
  icon: LucideIcon;
  color: string;
  focused: boolean;
  label: string;
  badge?: number;
}

function TabBarIcon({ icon: Icon, color, focused, label, badge }: TabBarIconProps) {
  return (
    <View style={styles.tabIconContainer}>
      <View>
        <Icon size={24} color={color} />
        {badge !== undefined && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {badge > 99 ? '99+' : badge}
            </Text>
          </View>
        )}
      </View>
      <Text
        style={[
          styles.tabLabel,
          { color },
          focused && styles.tabLabelFocused,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// ============================================
// LAYOUT PRINCIPAL
// ============================================

import { useAdminStore } from '@/store/useAdminStore';

export default function AdminLayout() {
  const pendentesAnalise = useAdminStore(state => state.inspecoesPendentes.length);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#64748B',
        tabBarShowLabel: false,
      }}
    >
      {/* Dashboard */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              icon={LayoutDashboard}
              color={color}
              focused={focused}
              label="Dashboard"
            />
          ),
        }}
      />

      {/* Motoristas */}
      <Tabs.Screen
        name="motoristas"
        options={{
          title: 'Motoristas',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              icon={Users}
              color={color}
              focused={focused}
              label="Motoristas"
            />
          ),
        }}
      />

      {/* Inspeções (para avaliar) */}
      <Tabs.Screen
        name="inspecoes"
        options={{
          title: 'Inspeções',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              icon={ClipboardCheck}
              color={color}
              focused={focused}
              label="Inspeções"
              badge={pendentesAnalise}
            />
          ),
        }}
      />

      {/* Relatórios */}
      <Tabs.Screen
        name="relatorios"
        options={{
          title: 'Relatórios',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              icon={FileBarChart}
              color={color}
              focused={focused}
              label="Relatórios"
            />
          ),
        }}
      />

      {/* Configurações */}
      <Tabs.Screen
        name="configuracoes"
        options={{
          title: 'Configurações',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              icon={Settings}
              color={color}
              focused={focused}
              label="Config"
            />
          ),
        }}
      />

      {/* Tela de avaliação (oculta da tab bar) */}
      <Tabs.Screen
        name="avaliar/[inspecaoId]"
        options={{
          href: null, // Oculta da tab bar
        }}
      />
    </Tabs>
  );
}

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#0F172A',
    borderTopColor: '#1E293B',
    borderTopWidth: 1,
    height: 70,
    paddingTop: 8,
    paddingBottom: 12,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },
  tabLabelFocused: {
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
});
