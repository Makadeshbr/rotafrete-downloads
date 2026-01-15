// src/components/chat/ChatInput.tsx
// ============================================
// ROTAFRETE - Input do Chat
// ============================================
// Campo de entrada de texto com botão de envio.
// Suporta estado de loading durante envio.
// ============================================

import React, { useState } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Keyboard,
} from 'react-native';
import { Send, Mic } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// ============================================
// TIPOS
// ============================================

interface ChatInputProps {
    /** Callback quando mensagem é enviada */
    onSend: (message: string) => void;
    /** Se está processando envio */
    isLoading?: boolean;
    /** Placeholder do input */
    placeholder?: string;
    /** Se está desabilitado */
    disabled?: boolean;
}

// ============================================
// COMPONENTE
// ============================================

/**
 * Input de chat com botão de envio.
 * 
 * @param onSend - Função chamada ao enviar mensagem
 * @param isLoading - Indica estado de loading
 * @param placeholder - Texto placeholder
 * @param disabled - Desabilita o input
 */
export function ChatInput({
    onSend,
    isLoading = false,
    placeholder = 'Digite sua mensagem...',
    disabled = false,
}: ChatInputProps) {
    const [message, setMessage] = useState('');

    /**
     * Envia a mensagem se não estiver vazia
     */
    const handleSend = () => {
        const trimmedMessage = message.trim();
        if (!trimmedMessage || isLoading || disabled) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSend(trimmedMessage);
        setMessage('');
        Keyboard.dismiss();
    };

    /**
     * Verifica se pode enviar
     */
    const canSend = message.trim().length > 0 && !isLoading && !disabled;

    return (
        <View style={styles.container}>
            <View style={styles.inputContainer}>
                {/* Campo de texto */}
                <TextInput
                    style={styles.input}
                    value={message}
                    onChangeText={setMessage}
                    placeholder={placeholder}
                    placeholderTextColor="#64748B"
                    multiline
                    maxLength={500}
                    editable={!isLoading && !disabled}
                    onSubmitEditing={handleSend}
                    blurOnSubmit={false}
                />

                {/* Botão de enviar */}
                <TouchableOpacity
                    style={[
                        styles.sendButton,
                        canSend ? styles.sendButtonActive : styles.sendButtonDisabled,
                    ]}
                    onPress={handleSend}
                    disabled={!canSend}
                    activeOpacity={0.7}
                >
                    {isLoading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <Send
                            size={20}
                            color={canSend ? '#FFFFFF' : '#64748B'}
                        />
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#0F172A',
        borderTopWidth: 1,
        borderTopColor: '#1E293B',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: '#1E293B',
        borderRadius: 24,
        paddingLeft: 16,
        paddingRight: 4,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: '#334155',
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#FFFFFF',
        maxHeight: 100,
        paddingVertical: 10,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonActive: {
        backgroundColor: '#FF6B00',
    },
    sendButtonDisabled: {
        backgroundColor: 'transparent',
    },
});

export default ChatInput;
