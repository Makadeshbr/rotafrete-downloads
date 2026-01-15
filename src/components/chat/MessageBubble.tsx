// src/components/chat/MessageBubble.tsx
// ============================================
// ROTAFRETE - Bolha de Mensagem do Chat
// ============================================
// Componente de mensagem para o assistente virtual.
// Suporta mensagens de usuário e assistente com estilos distintos.
// ============================================

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
} from 'react-native';
import { User, Bot } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

// ============================================
// TIPOS
// ============================================

export interface ChatMessage {
    /** ID único da mensagem */
    id: string;
    /** Papel do autor: usuário ou assistente */
    role: 'user' | 'assistant';
    /** Conteúdo da mensagem */
    content: string;
    /** Timestamp da mensagem */
    timestamp?: Date;
    /** Se está sendo digitada (streaming) */
    isStreaming?: boolean;
}

interface MessageBubbleProps {
    /** Dados da mensagem */
    message: ChatMessage;
}

// ============================================
// COMPONENTE
// ============================================

/**
 * Bolha de mensagem do chat.
 * Estilização diferente para usuário e assistente.
 * 
 * @param message - Dados da mensagem a exibir
 */
export function MessageBubble({ message }: MessageBubbleProps) {
    const isUser = message.role === 'user';

    return (
        <View style={[styles.container, isUser ? styles.containerUser : styles.containerAssistant]}>
            {/* Avatar */}
            {!isUser && (
                <View style={styles.avatarContainer}>
                    <LinearGradient
                        colors={['#FF6B00', '#EA580C']}
                        style={styles.avatar}
                    >
                        <Bot size={16} color="#FFFFFF" />
                    </LinearGradient>
                </View>
            )}

            {/* Bolha */}
            <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
                <Text style={[styles.messageText, isUser ? styles.textUser : styles.textAssistant]}>
                    {message.content}
                </Text>

                {/* Indicador de streaming */}
                {message.isStreaming && (
                    <View style={styles.typingIndicator}>
                        <View style={[styles.dot, styles.dot1]} />
                        <View style={[styles.dot, styles.dot2]} />
                        <View style={[styles.dot, styles.dot3]} />
                    </View>
                )}
            </View>

            {/* Avatar do usuário */}
            {isUser && (
                <View style={styles.avatarContainer}>
                    <View style={styles.avatarUser}>
                        <User size={16} color="#FFFFFF" />
                    </View>
                </View>
            )}
        </View>
    );
}

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        marginVertical: 8,
        paddingHorizontal: 16,
    },
    containerUser: {
        justifyContent: 'flex-end',
    },
    containerAssistant: {
        justifyContent: 'flex-start',
    },

    // Avatar
    avatarContainer: {
        marginHorizontal: 8,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarUser: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#3B82F6',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Bolha
    bubble: {
        maxWidth: '70%',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
    },
    bubbleUser: {
        backgroundColor: '#3B82F6',
        borderBottomRightRadius: 4,
    },
    bubbleAssistant: {
        backgroundColor: '#1E293B',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#334155',
    },

    // Texto
    messageText: {
        fontSize: 15,
        lineHeight: 22,
    },
    textUser: {
        color: '#FFFFFF',
    },
    textAssistant: {
        color: '#E2E8F0',
    },

    // Typing indicator
    typingIndicator: {
        flexDirection: 'row',
        marginTop: 8,
        gap: 4,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#64748B',
    },
    dot1: {
        opacity: 0.4,
    },
    dot2: {
        opacity: 0.6,
    },
    dot3: {
        opacity: 0.8,
    },
});

export default MessageBubble;
