import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import Animated, {
    FadeInUp,
    FadeOutUp,
    SlideInUp,
    SlideInDown,
    SlideOutUp,
    useAnimatedStyle,
    withSpring,
    useSharedValue,
    withTiming
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
// import { BlurView } from 'expo-blur';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
    onDismiss: (id: string) => void;
}

const ToastContext = createContext<{
    showToast: (message: string, type?: ToastType, duration?: number) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    warning: (message: string) => void;
}>({
    showToast: () => { },
    success: () => { },
    error: () => { },
    info: () => { },
    warning: () => { },
});

const TOAST_VARIANTS = {
    success: {
        icon: 'checkmark-circle',
        color: '#10B981',
        bg: 'rgba(16, 185, 129, 0.1)',
        border: '#10B981',
    },
    error: {
        icon: 'alert-circle',
        color: '#EF4444',
        bg: 'rgba(239, 68, 68, 0.1)',
        border: '#EF4444',
    },
    info: {
        icon: 'information-circle',
        color: '#3B82F6',
        bg: 'rgba(59, 130, 246, 0.1)',
        border: '#3B82F6',
    },
    warning: {
        icon: 'warning',
        color: '#F59E0B',
        bg: 'rgba(245, 158, 11, 0.1)',
        border: '#F59E0B',
    }
};

const ToastItem = ({ message, type, onDismiss, id }: ToastProps) => {
    const variant = TOAST_VARIANTS[type];

    // Auto dismiss
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss(id);
        }, 4000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <Animated.View
            entering={SlideInDown.springify().damping(15)}
            exiting={SlideOutUp}
            style={[
                styles.toastContainer,
                {
                    backgroundColor: '#1E293B', // Fallback
                    borderColor: variant.border,
                    borderLeftWidth: 4,
                }
            ]}
        >
            <View style={[styles.content]}>
                <Ionicons name={variant.icon as any} size={24} color={variant.color} style={styles.icon} />
                <Text style={styles.message}>{message}</Text>
                <TouchableOpacity onPress={() => onDismiss(id)} style={styles.closeButton}>
                    <Ionicons name="close" size={18} color="#94A3B8" />
                </TouchableOpacity>
            </View>
            {/* Glow Effect */}
            <View style={[styles.glow, { backgroundColor: variant.color }]} />
        </Animated.View>
    );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastProps[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
        const id = Math.random().toString(36).substring(7);
        setToasts(prev => [...prev, { id, message, type, duration, onDismiss: removeToast }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const success = (msg: string) => showToast(msg, 'success');
    const error = (msg: string) => showToast(msg, 'error');
    const info = (msg: string) => showToast(msg, 'info');
    const warning = (msg: string) => showToast(msg, 'warning');

    return (
        <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
            {children}
            <View style={styles.viewport} pointerEvents="box-none">
                {toasts.map(toast => (
                    <ToastItem key={toast.id} {...toast} />
                ))}
            </View>
        </ToastContext.Provider>
    );
};

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
    viewport: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        paddingTop: Platform.OS === 'ios' ? 60 : 40, // Safe Area top
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    toastContainer: {
        width: '100%',
        maxWidth: 400,
        minHeight: 56,
        marginBottom: 12,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        borderWidth: 1,
        overflow: 'hidden',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        zIndex: 2,
    },
    message: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 12,
    },
    icon: {
        // Neon Glow
        shadowColor: 'currentColor',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    closeButton: {
        padding: 4,
        marginLeft: 8,
    },
    glow: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: 60,
        opacity: 0.15,
        zIndex: 1,
        transform: [{ skewX: '-20deg' }, { translateX: -30 }],
    }
});
