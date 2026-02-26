import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { useColors, Colors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';

interface DropdownOption {
  label: string;
  value: string | number | null;
  icon?: string;
  colorKey?: keyof Colors;
}

interface DropdownSelectorProps {
  title: string;
  options: DropdownOption[];
  selectedValue: string | number | null;
  onValueChange: (value: string | number | null) => void;
  placeholder?: string;
  buttonBackgroundColor?: string;
  buttonTextColor?: string;
  zIndex?: number;
}

function DropdownSelector({
  title,
  options,
  selectedValue,
  onValueChange,
  placeholder = 'Select an option...',
  buttonBackgroundColor,
  buttonTextColor,
  zIndex = 100,
}: DropdownSelectorProps) {
  const colors = useColors();
  const { scaleHeight, scaleWidth, proportionalSize, scaleFont } =
    useResponsiveStyles();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  useEffect(() => {
    const selectedOption = options.find(opt => opt.value === selectedValue);
    setSelectedLabel(selectedOption?.label || null);
  }, [selectedValue, options]);

  const handleSelect = (option: DropdownOption) => {
    onValueChange(option.value);
    setSelectedLabel(option.label);
    setIsOpen(false);
  };

  const optionBgByIndex = useMemo(
    () =>
      options.map(option => ({
        backgroundColor: option.colorKey
          ? colors[option.colorKey]
          : 'transparent',
      })),
    [options, colors],
  );

  const s = StyleSheet.create({
    container: { marginBottom: scaleHeight(16), zIndex },
    label: {
      fontSize: scaleFont(16),
      fontWeight: '600',
      marginBottom: scaleHeight(8),
      color: colors.textPrimary,
    },
    button: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: proportionalSize(12),
      borderRadius: proportionalSize(8),
      backgroundColor: buttonBackgroundColor || colors.backgroundSecondary,
    },
    buttonText: {
      fontSize: scaleFont(16),
      color: buttonTextColor || colors.textPrimary,
    },
    dropdown: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      zIndex: 101,
      backgroundColor: colors.background,
      borderRadius: proportionalSize(8),
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: scaleHeight(2) },
      shadowOpacity: 0.25,
      shadowRadius: proportionalSize(4),
      elevation: 5,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: scaleHeight(12),
      paddingHorizontal: scaleWidth(12),
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    optionText: {
      fontSize: scaleFont(16),
      color: colors.textPrimary,
      marginLeft: scaleWidth(8),
    },
    optionIcon: { marginRight: scaleWidth(8) },
  });

  return (
    <View style={s.container}>
      <Text style={s.label}>{title}</Text>
      <TouchableOpacity
        style={s.button}
        onPress={() => setIsOpen(prev => !prev)}
      >
        <Text style={s.buttonText}>{selectedLabel || placeholder}</Text>
        <Icon
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={scaleFont(20)}
          color={buttonTextColor || colors.textPrimary}
        />
      </TouchableOpacity>
      {isOpen && (
        <View style={s.dropdown}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[s.option, optionBgByIndex[index]]}
              onPress={() => handleSelect(option)}
            >
              {option.icon && (
                <Icon
                  name={option.icon as any}
                  size={scaleFont(18)}
                  color={colors.textPrimary}
                  style={s.optionIcon}
                />
              )}
              <Text style={s.optionText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export default DropdownSelector;
