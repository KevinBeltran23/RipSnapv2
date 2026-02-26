import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  StyleProp,
  TextStyle,
} from 'react-native';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';

interface ButtonProps {
  onPress: () => void;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

function Button({
  onPress,
  label,
  variant = 'primary',
  disabled = false,
  style,
  textStyle,
}: ButtonProps) {
  const colors = useColors();
  const { scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles();

  const bgColors = {
    primary: colors.primary,
    secondary: colors.secondary,
    danger: colors.error,
    ghost: 'transparent',
  };
  const textColors = {
    primary: colors.textInverse,
    secondary: colors.textInverse,
    danger: colors.textInverse,
    ghost: colors.primary,
  };

  const s = StyleSheet.create({
    button: {
      backgroundColor: disabled ? colors.gray300 : bgColors[variant],
      paddingVertical: scaleHeight(12),
      paddingHorizontal: proportionalSize(20),
      borderRadius: proportionalSize(8),
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      color: disabled ? colors.textTertiary : textColors[variant],
      fontSize: scaleFont(16),
      fontWeight: '600',
    },
  });

  return (
    <TouchableOpacity
      style={[s.button, style]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[s.label, textStyle]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default Button;
