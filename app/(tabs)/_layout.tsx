// app/(tabs)/_layout.tsx
// ============================================
// ROTAFRETE - Layout de Tabs (REDESIGN v2)
// ============================================
// [MUDANÇA] Reduzido de 8 para 4 tabs principais
// [MUDANÇA] Assistente virou FAB flutuante
// [MUDANÇA] Financeiro unifica: History + Expenses + Export
// ============================================

import React from 'react';
import { Tabs, router } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import {
    Home,
    Wallet,
    Wrench,
    User,
    Receipt,
    ClipboardCheck,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { AssistenteFAB } from '@/components/common/AssistenteFAB';

// ============================================
// COMPONENTES
// ============================================

/**
 * Componente de ícone da tab com feedback visual.
 * Exibe indicador de foco quando selecionado.
 */
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
                size={26}
                color={focused ? '#FF6B00' : '#64748B'}
                strokeWidth={focused ? 2.5 : 2}
            />
            {focused && <View style={styles.focusIndicator} />}
        </View>
    );
}

// ============================================
// LAYOUT PRINCIPAL
// ============================================

/**
 * Layout de tabs da aplicação (REDESIGN).
 * 
 * ANTES (8 tabs):
 * - Início, Prévia, Histórico, Manutenção, Assistente, Extrato, Exportar, Perfil
 * 
 * AGORA (4 tabs):
 * - Início (Dashboard + Registro + Prévia)
 * - Financeiro (History + Expenses + Export unificados)
 * - Manutenção (sem mudanças)
 * - Perfil (sem mudanças)
 * 
 * O Assistente IA virou um FAB flutuante acessível de qualquer tela.
 */
export default function TabLayout() {
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
                    tabPress: () => {
                        if (Platform.OS !== 'web') {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                {/* TAB 3: MANUTENÇÃO - Controle do veículo */}
                {/* ============================================ */}
                <Tabs.Screen
                    name="maintenance"
                    options={{
                        title: 'Veículo',
                        tabBarIcon: ({ focused, color }) => (
                            <TabIcon icon={Wrench} focused={focused} color={color} />
                        ),
                    }}
                />

                {/* ============================================ */}
                {/* TAB 4: PERFIL - Dados do usuário */}
                {/* ============================================ */}
                <Tabs.Screen
                    name="profile"
                    options={{
                        title: 'Perfil',
                        tabBarIcon: ({ focused, color }) => (
                            <TabIcon icon={User} focused={focused} color={color} />
                        ),
                    }}
                />

                {/* ============================================ */}
                {/* TAB 5: INSPEÇÃO - Inspeção veicular */}
                {/* ============================================ */}
                <Tabs.Screen
                    name="inspection"
                    options={{
                        title: 'Inspeção',
                        tabBarIcon: ({ focused, color }) => (
                            <TabIcon icon={ClipboardCheck} focused={focused} color={color} />
                        ),
                    }}
                />

                {/* ============================================ */}
                {/* TELAS OCULTAS (não aparecem na tab bar) */}
                {/* Mantidas para retrocompatibilidade */}
                {/* ============================================ */}

                {/* Assistente IA - Acessível via FAB */}
                <Tabs.Screen
                    name="assistant"
                    options={{
                        href: null,
                        title: 'Assistente IA',
                    }}
                />

                {/* Editar perfil */}
                <Tabs.Screen
                    name="edit-profile"
                    options={{
                        href: null,
                        title: 'Editar Perfil',
                    }}
                />

                {/* [LEGADO] Prévia - Migrado para index.tsx */}
                <Tabs.Screen
                    name="preview"
                    options={{
                        href: null,
                        title: 'Prévia',
                    }}
                />

                {/* [LEGADO] Histórico - Migrado para financeiro.tsx */}
                <Tabs.Screen
                    name="history"
                    options={{
                        href: null,
                        title: 'Histórico',
                    }}
                />

                {/* TAB 5: EXTRATO - Visão consolidada de despesas */}
                <Tabs.Screen
                    name="extrato"
                    options={{
                        title: 'Extrato',
                        tabBarLabel: 'Extrato',
                        tabBarIcon: ({ focused, color }) => (
                            <TabIcon icon={Receipt} focused={focused} color={color} />
                        ),
                    }}
                />

                {/* [LEGADO] Export - Migrado para financeiro.tsx */}
                <Tabs.Screen
                    name="export"
                    options={{
                        href: null,
                        title: 'Exportar',
                    }}
                />

                {/* [NOVO] Configurações de Notificações */}
                <Tabs.Screen
                    name="notification-settings"
                    options={{
                        href: null,
                        title: 'Notificações',
                    }}
                />
            </Tabs>

            {/* FAB do Assistente IA - Flutuante em todas as telas */}
            <AssistenteFAB ocultarEm={['assistant', 'edit-profile']} />
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
        height: Platform.OS === 'ios' ? 88 : 70,
        paddingTop: 8,
        paddingBottom: Platform.OS === 'ios' ? 28 : 12,
        elevation: 0,
        // Sombra superior sutil
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
    },
    tabLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 4,
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 48,
        height: 32,
    },
    iconContainerFocused: {
        // Pode adicionar efeitos visuais extras aqui
    },
    focusIndicator: {
        position: 'absolute',
        bottom: -4,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#FF6B00',
    },
});
