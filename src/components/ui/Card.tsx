import React from 'react';
import { View, ViewProps, StyleSheet, Text } from 'react-native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';

interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'glass' | 'outlined';
  noPadding?: boolean;
}

export function Card({
  children,
  style,
  variant = 'default',
  noPadding = false,
  ...props
}: CardProps) {

  const getVariantStyle = () => {
    switch (variant) {
      case 'elevated':
        return styles.elevated;
      case 'glass':
        return styles.glass;
      case 'outlined':
        return styles.outlined;
      default:
        return styles.default;
    }
  };

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(12)}
      layout={Layout.springify()}
      style={[
        styles.base,
        getVariantStyle(),
        noPadding && styles.noPadding,
        style,
      ]}
      {...props}
    >
      {children}
    </Animated.View>
  );
}

export function CardHeader({ children, style, ...props }: ViewProps) {
  return <View style={[styles.header, style]} {...props}>{children}</View>;
}

export function CardContent({ children, style, ...props }: ViewProps) {
  return <View style={[styles.content, style]} {...props}>{children}</View>;
}

export function CardFooter({ children, style, ...props }: ViewProps) {
  return <View style={[styles.footer, style]} {...props}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  default: {
    backgroundColor: '#1E293B', // dark-800
    borderWidth: 1,
    borderColor: '#334155', // dark-700
  },
  elevated: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    // shadow-card
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  glass: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)', // dark-800 com opacity
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#334155',
  },
  noPadding: {
    padding: 0,
  },
  header: {
    marginBottom: 12,
  },
  content: {
    // Default content style
  },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
});
