import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';

type IconName = React.ComponentProps<typeof Icon>['name'];

interface IconButtonProps {
  name: IconName;
  onPress: () => void;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

function IconButton({
  name,
  onPress,
  size,
  color,
  style,
  disabled = false,
}: IconButtonProps) {
  const colors = useColors();
  const { scaleFont, proportionalSize } = useResponsiveStyles();
  const iconSize = size ?? scaleFont(24);

  const s = StyleSheet.create({
    button: { padding: proportionalSize(8), opacity: disabled ? 0.4 : 1 },
  });

  return (
    <TouchableOpacity
      style={[s.button, style]}
      onPress={onPress}
      disabled={disabled}
    >
      <Icon name={name} size={iconSize} color={color ?? colors.primary} />
    </TouchableOpacity>
  );
}

export default IconButton;
