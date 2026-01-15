// src/components/ui/Input.tsx
// ============================================
// ROTAFRETE - Input Premium
// ============================================

import React, { useState, forwardRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  type?: 'text' | 'email' | 'password' | 'number' | 'phone';
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      type = 'text',
      style,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Configurações baseadas no tipo
    const getInputProps = (): Partial<TextInputProps> => {
      switch (type) {
        case 'email':
          return {
            keyboardType: 'email-address',
            autoCapitalize: 'none',
            autoComplete: 'email',
          };
        case 'password':
          return {
            secureTextEntry: !showPassword,
            autoCapitalize: 'none',
            autoComplete: 'password',
          };
        case 'number':
          return {
            keyboardType: 'numeric',
          };
        case 'phone':
          return {
            keyboardType: 'phone-pad',
            autoComplete: 'tel',
          };
        default:
          return {};
      }
    };

    const hasError = !!error;
    const isPassword = type === 'password';

    return (
      <View style={styles.container}>
        {/* Label */}
        {label && (
          <Text
            style={[
              styles.label,
              isFocused && styles.labelFocused,
              hasError && styles.labelError,
            ]}
          >
            {label}
          </Text>
        )}

        {/* Input Container */}
        <View
          style={[
            styles.inputContainer,
            isFocused && styles.inputContainerFocused,
            hasError && styles.inputContainerError,
          ]}
        >
          {/* Ícone esquerdo */}
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

          {/* Input */}
          <TextInput
            ref={ref}
            style={[
              styles.input,
              leftIcon ? styles.inputWithLeftIcon : undefined,
              (rightIcon || isPassword) ? styles.inputWithRightIcon : undefined,
              style,
            ].filter(Boolean)}
            placeholderTextColor="#64748B"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...getInputProps()}
            {...props}
          />

          {/* Ícone direito ou toggle de senha */}
          {isPassword ? (
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.rightIcon}
              activeOpacity={0.7}
            >
              {showPassword ? (
                <EyeOff size={20} color="#64748B" />
              ) : (
                <Eye size={20} color="#64748B" />
              )}
            </TouchableOpacity>
          ) : rightIcon ? (
            <View style={styles.rightIcon}>{rightIcon}</View>
          ) : null}
        </View>

        {/* Erro ou Hint */}
        {hasError ? (
          <Text style={styles.error}>{error}</Text>
        ) : hint ? (
          <Text style={styles.hint}>{hint}</Text>
        ) : null}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
    marginLeft: 4,
  },
  labelFocused: {
    color: '#FF6B00',
  },
  labelError: {
    color: '#EF4444',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  inputContainerFocused: {
    borderColor: '#FF6B00',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  inputContainerError: {
    borderColor: '#EF4444',
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#F1F5F9',
    fontWeight: '500',
  },
  inputWithLeftIcon: {
    paddingLeft: 12,
  },
  inputWithRightIcon: {
    paddingRight: 12,
  },
  leftIcon: {
    paddingLeft: 16,
  },
  rightIcon: {
    paddingRight: 16,
    padding: 8,
  },
  error: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
    marginLeft: 4,
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
    marginLeft: 4,
  },
});

export default Input;
