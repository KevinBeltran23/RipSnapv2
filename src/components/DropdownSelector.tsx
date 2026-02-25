import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { useColors, Colors } from '../hooks/useColors';
import { useResponsiveStyles } from '../hooks/useResponsiveStyles';

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
}

function DropdownSelector({
  title,
  options,
  selectedValue,
  onValueChange,
  placeholder = 'Select an option...',
  buttonBackgroundColor,
  buttonTextColor,
}: DropdownSelectorProps) {
  const colors = useColors();
  const { scaleFont, scaleWidth, scaleHeight, proportionalSize } =
    useResponsiveStyles();

  const [isOpen, setIsOpen] = useState(false);
  const [currentValue, setCurrentValue] = useState<string | number | null>(
    selectedValue,
  );

  // Sync internal state with prop changes from parent
  useEffect(() => {
    if (currentValue !== selectedValue) {
      setCurrentValue(selectedValue);
    }
  }, [selectedValue, currentValue]);

  const selectedOption = options.find(option => option.value === currentValue);

  const handleSelect = (value: string | number | null) => {
    onValueChange(value);
    setCurrentValue(value);
    setIsOpen(false);
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      marginBottom: scaleHeight(16),
    },
    title: {
      fontSize: scaleFont(16),
      fontWeight: '600',
      marginTop: scaleHeight(16),
      marginBottom: scaleHeight(8),
      color: colors.textPrimary,
    },
    dropdownHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: buttonBackgroundColor || colors.backgroundSecondary,
      paddingVertical: scaleHeight(12),
      paddingHorizontal: scaleWidth(16),
      borderRadius: proportionalSize(8),
      borderWidth: proportionalSize(1),
      borderColor: colors.border,
      minHeight: scaleHeight(50),
    },
    selectedTextContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    selectedIcon: {
      marginRight: scaleWidth(8),
    },
    selectedText: {
      fontSize: scaleFont(16),
      fontWeight: '600',
      color: buttonTextColor || colors.textPrimary,
      flexShrink: 1,
    },
    placeholderText: {
      color: colors.textSecondary,
    },
    arrowIcon: {
      marginLeft: scaleWidth(10),
      color: colors.textInverse,
    },
    optionsContainer: {
      backgroundColor: colors.backgroundSecondary,
      borderColor: colors.border,
      borderWidth: proportionalSize(1),
      borderRadius: proportionalSize(8),
      marginTop: scaleHeight(4),
      overflow: 'hidden',
    },
    optionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: scaleHeight(10),
      paddingHorizontal: scaleWidth(16),
      borderBottomWidth: proportionalSize(1),
      borderBottomColor: colors.borderLight,
    },
    optionText: {
      fontSize: scaleFont(16),
      fontWeight: '600',
      color: colors.textPrimary,
    },
    lastOptionItem: {
      borderBottomWidth: proportionalSize(0),
    },
    optionIcon: {
      marginRight: scaleWidth(8),
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <Text style={dynamicStyles.title}>{title}</Text>
      <TouchableOpacity
        onPress={() => setIsOpen(!isOpen)}
        style={dynamicStyles.dropdownHeader}
      >
        <View style={dynamicStyles.selectedTextContainer}>
          {selectedOption?.icon && (
            <Icon
              name={selectedOption.icon as React.ComponentProps<typeof Icon>['name']}
              size={scaleFont(20)}
              color={buttonTextColor || colors.textPrimary}
              style={dynamicStyles.selectedIcon}
            />
          )}
          <Text
            style={[
              dynamicStyles.selectedText,
              !selectedOption && dynamicStyles.placeholderText,
            ]}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </Text>
        </View>
        <Icon
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={scaleFont(20)}
          style={dynamicStyles.arrowIcon}
        />
      </TouchableOpacity>

      {isOpen && (
        <View style={dynamicStyles.optionsContainer}>
          {options
            .filter(option => option.value !== currentValue)
            .map((option, index, filteredArr) => (
              <TouchableOpacity
                key={option.value?.toString() ?? `${index}`}
                onPress={() => handleSelect(option.value)}
                style={[
                  dynamicStyles.optionItem,
                  index === filteredArr.length - 1 &&
                  dynamicStyles.lastOptionItem,
                  option.colorKey && {
                    backgroundColor: colors[option.colorKey],
                  },
                ]}
              >
                {option.icon && (
                  <Icon
                    name={option.icon as React.ComponentProps<typeof Icon>['name']}
                    size={scaleFont(20)}
                    color={
                      option.colorKey ? colors.textInverse : colors.textPrimary
                    }
                    style={dynamicStyles.optionIcon}
                  />
                )}
                <Text
                  style={[
                    dynamicStyles.optionText,
                    option.colorKey && { color: colors.textInverse },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
        </View>
      )}
    </View>
  );
}

export default DropdownSelector;
