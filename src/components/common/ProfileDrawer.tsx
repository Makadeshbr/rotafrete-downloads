// src/components/common/ProfileDrawer.tsx
// ============================================
// ROTAFRETE - Drawer de Navegação do Perfil
// ============================================
// Menu lateral premium que abre ao tocar no Perfil
// Contém todas as funções extras do app
// ============================================

import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Animated,
    Dimensions,
    Platform,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
    X,
    Receipt,
    History,
    Download,
    Wrench,
    ClipboardCheck,
    Bell,
    UserPen,
    LogOut,
    ChevronRight,
    User,
    Sparkles,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@aether-baas/react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.82;

// ============================================
// TIPOS
// ============================================

interface MenuItem {
    id: string;
    label: string;
    icon: typeof Receipt;
    route?: string;
    color: string;
    action?: () => void;
    badge?: number;
}

interface ProfileDrawerProps {
    visible: boolean;
    onClose: () => void;
}

// ============================================
// COMPONENTE
// ============================================

export function ProfileDrawer({ visible, onClose }: ProfileDrawerProps) {
    const router = useRouter();
    const { user, signOut } = useAuth();

    const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
    const overlayAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    friction: 8,
                    tension: 50,
                    useNativeDriver: true,
                }),
                Animated.timing(overlayAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: DRAWER_WIDTH,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(overlayAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const handleNavigate = (route: string) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onClose();
        setTimeout(() => {
            router.push(route as any);
        }, 300);
    };

    const handleSignOut = async () => {
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
        onClose();
        setTimeout(async () => {
            await signOut();
            router.replace('/(auth)/login');
        }, 300);
    };

    // Menu items organizados por seção
    const menuSections: { title: string; items: MenuItem[] }[] = [
        {
            title: 'Financeiro',
            items: [
                { id: 'extrato', label: 'Extrato', icon: Receipt, route: '/(tabs)/extrato', color: '#3B82F6' },
                { id: 'history', label: 'Histórico', icon: History, route: '/(tabs)/history', color: '#8B5CF6' },
                { id: 'export', label: 'Exportar PDF', icon: Download, route: '/(tabs)/export', color: '#10B981' },
            ],
        },
        {
            title: 'Veículo',
            items: [
                { id: 'maintenance', label: 'Manutenção', icon: Wrench, route: '/(tabs)/maintenance', color: '#F59E0B' },
                { id: 'inspection', label: 'Inspeção', icon: ClipboardCheck, route: '/(tabs)/inspection', color: '#06B6D4' },
            ],
        },
        {
            title: 'Configurações',
            items: [
                { id: 'edit-profile', label: 'Editar Perfil', icon: UserPen, route: '/(tabs)/edit-profile', color: '#EC4899' },
                { id: 'notifications', label: 'Notificações', icon: Bell, route: '/(tabs)/notification-settings', color: '#EF4444' },
            ],
        },
    ];

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            {/* Overlay escuro */}
            <Animated.View
                style={[
                    styles.overlay,
                    { opacity: overlayAnim }
                ]}
            >
                <TouchableOpacity
                    style={styles.overlayTouchable}
                    activeOpacity={1}
                    onPress={onClose}
                />
            </Animated.View>

            {/* Drawer */}
            <Animated.View
                style={[
                    styles.drawer,
                    { transform: [{ translateX: slideAnim }] }
                ]}
            >
                {/* Header do Drawer com gradiente */}
                <LinearGradient
                    colors={['#FF6B00', '#EA580C']}
                    style={styles.drawerHeader}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <X size={22} color="#FFF" />
                    </TouchableOpacity>

                    <View style={styles.userSection}>
                        <View style={styles.avatar}>
                            <User size={32} color="#FF6B00" />
                        </View>
                        <View style={styles.userInfo}>
                            <Text style={styles.userName} numberOfLines={1}>
                                {user?.name || 'Motorista'}
                            </Text>
                            <Text style={styles.userEmail} numberOfLines={1}>
                                {user?.email || 'email@exemplo.com'}
                            </Text>
                        </View>
                    </View>

                    {/* Badge Premium */}
                    <View style={styles.premiumBadge}>
                        <Sparkles size={14} color="#FFD700" />
                        <Text style={styles.premiumText}>RotaFrete Pro</Text>
                    </View>
                </LinearGradient>

                {/* Menu Items */}
                <ScrollView
                    style={styles.menuContainer}
                    showsVerticalScrollIndicator={false}
                >
                    {menuSections.map((section, sectionIndex) => (
                        <View key={section.title} style={styles.menuSection}>
                            <Text style={styles.sectionTitle}>{section.title}</Text>

                            {section.items.map((item, itemIndex) => {
                                const Icon = item.icon;
                                const isLast = itemIndex === section.items.length - 1;

                                return (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={[
                                            styles.menuItem,
                                            !isLast && styles.menuItemBorder
                                        ]}
                                        onPress={() => item.route && handleNavigate(item.route)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.menuIconContainer, { backgroundColor: item.color + '20' }]}>
                                            <Icon size={20} color={item.color} />
                                        </View>
                                        <Text style={styles.menuLabel}>{item.label}</Text>
                                        {item.badge && (
                                            <View style={styles.badgeContainer}>
                                                <Text style={styles.badgeText}>{item.badge}</Text>
                                            </View>
                                        )}
                                        <ChevronRight size={18} color="#64748B" />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    ))}

                    {/* Botão Sair */}
                    <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={handleSignOut}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.menuIconContainer, { backgroundColor: '#EF444420' }]}>
                            <LogOut size={20} color="#EF4444" />
                        </View>
                        <Text style={styles.logoutText}>Sair da Conta</Text>
                    </TouchableOpacity>

                    {/* Versão */}
                    <Text style={styles.versionText}>RotaFrete v4.7.0</Text>
                </ScrollView>
            </Animated.View>
        </Modal>
    );
}

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    overlayTouchable: {
        flex: 1,
    },
    drawer: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: DRAWER_WIDTH,
        backgroundColor: '#0F172A',
        borderTopLeftRadius: 24,
        borderBottomLeftRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: -4, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 20,
    },
    drawerHeader: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 24,
        paddingHorizontal: 20,
    },
    closeButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 54 : 34,
        right: 16,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    userSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginTop: 8,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFF',
    },
    userEmail: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    premiumBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0,0,0,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        alignSelf: 'flex-start',
        marginTop: 16,
    },
    premiumText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFD700',
    },
    menuContainer: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 20,
    },
    menuSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
        marginLeft: 4,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 4,
        gap: 14,
    },
    menuItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#1E293B',
    },
    menuIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuLabel: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: '#E2E8F0',
    },
    badgeContainer: {
        backgroundColor: '#EF4444',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFF',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 4,
        gap: 14,
        marginTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#1E293B',
    },
    logoutText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: '#EF4444',
    },
    versionText: {
        fontSize: 12,
        color: '#475569',
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 40,
    },
});

export default ProfileDrawer;
