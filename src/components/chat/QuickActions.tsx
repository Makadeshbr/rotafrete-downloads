// src/components/chat/QuickActions.tsx
// ============================================
// ROTAFRETE - Ações Rápidas do Chat
// ============================================
// Sugestões de perguntas frequentes para o assistente.
// Facilita interação do usuário com perguntas pré-definidas.
// ============================================

import React from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import {
    TrendingUp,
    Fuel,
    Wrench,
    Calendar,
    MapPin,
    HelpCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// ============================================
// TIPOS
// ============================================

interface QuickAction {
    /** ID único da ação */
    id: string;
    /** Texto a ser enviado */
    text: string;
    /** Ícone */
    icon: React.FC<any>;
    /** Cor do ícone */
    color: string;
}

interface QuickActionsProps {
    /** Callback quando ação é selecionada */
    onSelect: (text: string) => void;
    /** Se está desabilitado */
    disabled?: boolean;
}

// ============================================
// AÇÕES DISPONÍVEIS
// ============================================

const QUICK_ACTIONS: QuickAction[] = [
    {
        id: 'gastos_semana',
        text: 'Quanto gastei esta semana?',
        icon: TrendingUp,
        color: '#10B981',
    },
    {
        id: 'combustivel',
        text: 'Qual minha média de consumo?',
        icon: Fuel,
        color: '#F59E0B',
    },
    {
        id: 'manutencao',
        text: 'Tenho manutenção pendente?',
        icon: Wrench,
        color: '#EF4444',
    },
    {
        id: 'rotas_mes',
        text: 'Quantas rotas fiz no mês?',
        icon: Calendar,
        color: '#3B82F6',
    },
    {
        id: 'melhor_rota',
        text: 'Qual foi minha melhor rota?',
        icon: MapPin,
        color: '#8B5CF6',
    },
    {
        id: 'ajuda',
        text: 'Como usar o app?',
        icon: HelpCircle,
        color: '#06B6D4',
    },
];

// ============================================
// COMPONENTE
// ============================================

/**
 * Componente de ações rápidas do chat.
 * Exibe sugestões de perguntas rolável horizontalmente.
 * 
 * @param onSelect - Callback ao selecionar ação
 * @param disabled - Desabilita todas as ações
 */
export function QuickActions({ onSelect, disabled = false }: QuickActionsProps) {
    /**
     * Processa seleção de ação rápida
     */
    const handleSelect = (action: QuickAction) => {
        if (disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelect(action.text);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Sugestões</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {QUICK_ACTIONS.map((action) => {
                    const Icon = action.icon;
                    return (
                        <TouchableOpacity
                            key={action.id}
                            style={[styles.actionCard, disabled && styles.actionCardDisabled]}
                            onPress={() => handleSelect(action)}
                            disabled={disabled}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: `${action.color}20` }]}>
                                <Icon size={18} color={action.color} />
                            </View>
                            <Text style={styles.actionText} numberOfLines={2}>
                                {action.text}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
    container: {
        paddingVertical: 16,
    },
    title: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
        marginLeft: 16,
    },
    scrollContent: {
        paddingHorizontal: 16,
        gap: 12,
    },
    actionCard: {
        backgroundColor: '#1E293B',
        borderRadius: 16,
        padding: 14,
        width: 140,
        borderWidth: 1,
        borderColor: '#334155',
    },
    actionCardDisabled: {
        opacity: 0.5,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    actionText: {
        fontSize: 13,
        color: '#E2E8F0',
        fontWeight: '500',
        lineHeight: 18,
    },
});

export default QuickActions;
