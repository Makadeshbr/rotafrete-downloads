// app/(tabs)/_layout.tsx
// ============================================
// ROTAFRETE - Layout de Tabs (REDESIGN v3)
// ============================================
// [MUDANÇA] Integração com ProfileDrawer
// [MUDANÇA] Perfil abre drawer lateral com submenus
// ============================================

import React, { useState } from 'react';
import { Tabs, router } from 'expo-router';
import { View, StyleSheet, Platform, Dimensions } from 'react-native';
import {
    Home,
    Wallet,
    Coffee,
    Navigation,
    Menu,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { AssistenteFAB } from '@/components/common/AssistenteFAB';
import { ProfileDrawer } from '@/components/common/ProfileDrawer';

// ============================================
// COMPONENTES
// ============================================

const SCREEN_WIDTH = Dimensions.get('window').width;
const TAB_COUNT = 5;
const TAB_WIDTH = SCREEN_WIDTH / TAB_COUNT;

function TabIcon({
    icon: Icon,
    focused,
}: {
    icon: React.FC<any>;
    focused: boolean;
    color: string;
}) {
    return (
        <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
            <Icon
                size={22}
                color={focused ? '#FF6B00' : '#64748B'}
                strokeWidth={focused ? 2.5 : 1.8}
            />
            {focused && <View style={styles.focusIndicator} />}
        </View>
    );
}

// ============================================
// LAYOUT PRINCIPAL
// ============================================

export default function TabLayout() {
    const [drawerVisible, setDrawerVisible] = useState(false);

    return (
        <View style={styles.layoutContainer}>
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarStyle: styles.tabBar,
                    tabBarActiveTintColor: '#FF6B00',
                    tabBarInactiveTintColor: '#64748B',
                    tabBarLabelStyle: styles.tabLabel,
                    tabBarHideOnKeyboard: true,
                }}
                screenListeners={{
                    tabPress: (e) => {
                        if (Platform.OS !== 'web') {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }

                        // Intercepta clique no tab "Menu" para abrir drawer
                        if (e.target?.includes('profile')) {
                            e.preventDefault();
                            setDrawerVisible(true);
                        }
                    },
                }}
            >
                {/* ============================================ */}
                {/* TAB 1: INÍCIO - Dashboard principal */}
                {/* ============================================ */}
                <Tabs.Screen
                    name="index"
                    options={{
                        title: 'Início',
                        tabBarIcon: ({ focused, color }) => (
                            <TabIcon icon={Home} focused={focused} color={color} />
                        ),
                    }}
                />

                {/* ============================================ */}
                {/* TAB 2: FINANCEIRO - Tela unificada */}
                {/* ============================================ */}
                <Tabs.Screen
                    name="financeiro"
                    options={{
                        title: 'Financeiro',
                        tabBarIcon: ({ focused, color }) => (
                            <TabIcon icon={Wallet} focused={focused} color={color} />
                        ),
                    }}
                />

                {/* ============================================ */}
                {/* TAB 3: FOLGAS - Gestão de dias de folga */}
                {/* ============================================ */}
                <Tabs.Screen
                    name="folgas"
                    options={{
                        title: 'Folgas',
                        tabBarIcon: ({ focused, color }) => (
                            <TabIcon icon={Coffee} focused={focused} color={color} />
                        ),
                    }}
                />

                {/* ============================================ */}
                {/* TAB 4: ROTAS - Tracking em tempo real */}
                {/* ============================================ */}
                <Tabs.Screen
                    name="tracking"
                    options={{
                        title: 'Rotas',
                        tabBarIcon: ({ focused, color }) => (
                            <TabIcon icon={Navigation} focused={focused} color={color} />
                        ),
                    }}
                />

                {/* ============================================ */}
                {/* TAB 5: MENU - Abre Drawer lateral */}
                {/* ============================================ */}
                <Tabs.Screen
                    name="profile"
                    options={{
                        title: 'Menu',
                        tabBarIcon: ({ focused, color }) => (
                            <TabIcon icon={Menu} focused={focused} color={color} />
                        ),
                    }}
                />

                {/* ============================================ */}
                {/* TELAS OCULTAS (acessíveis via drawer) */}
                {/* ============================================ */}

                <Tabs.Screen
                    name="maintenance"
                    options={{ href: null, title: 'Manutenção' }}
                />
                <Tabs.Screen
                    name="inspection"
                    options={{ href: null, title: 'Inspeção' }}
                />
                <Tabs.Screen
                    name="assistant"
                    options={{ href: null, title: 'Assistente IA' }}
                />
                <Tabs.Screen
                    name="edit-profile"
                    options={{ href: null, title: 'Editar Perfil' }}
                />
                <Tabs.Screen
                    name="preview"
                    options={{ href: null, title: 'Prévia' }}
                />
                <Tabs.Screen
                    name="history"
                    options={{ href: null, title: 'Histórico' }}
                />
                <Tabs.Screen
                    name="extrato"
                    options={{ href: null, title: 'Extrato' }}
                />
                <Tabs.Screen
                    name="export"
                    options={{ href: null, title: 'Exportar' }}
                />
                <Tabs.Screen
                    name="notification-settings"
                    options={{ href: null, title: 'Notificações' }}
                />
            </Tabs>

            {/* FAB do Assistente IA */}
            <AssistenteFAB ocultarEm={['assistant', 'edit-profile', 'tracking']} />

            {/* Drawer de navegação lateral */}
            <ProfileDrawer
                visible={drawerVisible}
                onClose={() => setDrawerVisible(false)}
            />
        </View>
    );
}

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
    layoutContainer: {
        flex: 1,
    },
    tabBar: {
        backgroundColor: '#0F172A',
        borderTopWidth: 1,
        borderTopColor: '#1E293B',
        height: Platform.OS === 'ios' ? 88 : 68,
        paddingTop: 6,
        paddingBottom: Platform.OS === 'ios' ? 28 : 8,
        paddingHorizontal: 4,
        elevation: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
    },
    tabLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2,
        letterSpacing: 0.1,
    },
    iconContainer: {
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        width: TAB_WIDTH - 16,
        height: 34,
        borderRadius: 10,
    },
    iconContainerFocused: {
        backgroundColor: 'rgba(255, 107, 0, 0.1)',
    },
    focusIndicator: {
        position: 'absolute' as const,
        bottom: -2,
        width: 16,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: '#FF6B00',
    },
});

