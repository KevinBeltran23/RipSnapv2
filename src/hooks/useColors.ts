import { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';

// Color interface that matches our CSS variables
export interface Colors {
  // Primary colors
  primary: string;
  primaryLight: string;
  primaryDark: string;

  // Secondary colors
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;

  // Accent colors
  accent: string;
  accentLight: string;
  accentDark: string;

  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;

  // Severity colors
  fullyAccessible: string;
  partiallyAccessible: string;
  limitedAccessibility: string;
  notAccessible: string;
  unknownAccessibility: string;

  // Neutral colors
  white: string;
  black: string;
  gray50: string;
  gray100: string;
  gray200: string;
  gray300: string;
  gray400: string;
  gray500: string;
  gray600: string;
  gray700: string;
  gray800: string;
  gray900: string;

  // Background colors
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;

  // Text colors
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  // Border colors
  border: string;
  borderLight: string;
  borderDark: string;

  // Shadow colors
  shadow: string;
  shadowLight: string;
  shadowDark: string;

  // Overlay colors
  overlay: string;
  overlayLight: string;
}

// Base color values that will be dynamically adjusted based on theme
const getColors = (themeClasses: string): Colors => {
  // This is a simplified approach - in a real implementation,
  // you might want to use a CSS-in-JS solution or read computed styles
  // For now, we'll define the color mappings based on theme

  const isDark = themeClasses.includes('dark');
  const isColorBlind = themeClasses.includes('colorblind-red-green');
  const isHighContrast = themeClasses.includes('high-contrast');

  // Base colors (light theme)
  let colors: Colors = {
    // Primary colors (softer, but still vibrant blue)
    primary: '#4299E1',
    primaryLight: '#EBF8FF',
    primaryDark: '#2B6CB0',

    // Secondary colors (a balanced, less saturated green)
    secondary: '#48BB78',
    secondaryLight: '#F0FFF4',
    secondaryDark: '#2F855A',

    // Accent colors (a warm, inviting orange)
    accent: '#F6AD55',
    accentLight: '#FFF8EE',
    accentDark: '#DD6B20',

    // Status colors (clear and distinct, error remains sharp)
    success: '#38A169',
    warning: '#ECC94B',
    error: '#E53E3E',
    info: '#4299E1',

    // Severity colors (significantly softer for less visual intrusion)
    fullyAccessible: '#48BB78',
    partiallyAccessible: '#FFD54F',
    limitedAccessibility: '#F6AD55',
    notAccessible: '#E53E3E',
    unknownAccessibility: '#B0BEC5',

    // Neutral colors (refined grayscale for better hierarchy and readability)
    white: '#FFFFFF',
    black: '#000000',
    gray50: '#F7FAFC',
    gray100: '#EDF2F7',
    gray200: '#E2E8F0',
    gray300: '#CBD5E0',
    gray400: '#A0AEC0',
    gray500: '#718096',
    gray600: '#4A5568',
    gray700: '#2D3748',
    gray800: '#1A202C',
    gray900: '#171923',

    // Background colors (soft and easy on the eyes)
    background: '#FFFFFF',
    backgroundSecondary: '#F7FAFC',
    backgroundTertiary: '#EDF2F7',

    // Text colors (ensuring good contrast on light backgrounds)
    textPrimary: '#2D3748',
    textSecondary: '#4A5568',
    textTertiary: '#718096',
    textInverse: '#FFFFFF',

    // Border colors (subtle and complementary)
    border: '#E2E8F0',
    borderLight: '#EDF2F7',
    borderDark: '#A0AEC0',

    // Shadow colors (softer for less harshness)
    shadow: 'rgba(0, 0, 0, 0.1)',
    shadowLight: 'rgba(0, 0, 0, 0.05)',
    shadowDark: 'rgba(0, 0, 0, 0.2)',

    // Overlay colors (functional, no change needed for now)
    overlay: 'rgba(0, 0, 0, 0.75)',
    overlayLight: 'rgba(0, 0, 0, 0.5)',
  };

  // Apply dark theme adjustments - REVISED PALETTE FOR DARK MODE
  if (isDark) {
    colors = {
      ...colors,
      // Dark mode primary colors (slightly desaturated for less intensity on dark background)
      primary: '#63B3ED', // Lighter blue for dark background
      primaryLight: '#2C5282', // Darker blue for subtle variation
      primaryDark: '#2B6CB0', // Maintain a deep blue

      // Dark mode secondary colors
      secondary: '#68D391', // Lighter green for dark background
      secondaryLight: '#2F855A',
      secondaryDark: '#276749',

      // Dark mode accent colors
      accent: '#F6AD55', // Still a warm orange
      accentLight: '#C05621',
      accentDark: '#DD6B20',

      // Dark mode status colors (good contrast)
      success: '#48BB78',
      warning: '#F6AD55',
      error: '#FC8181', // Lighter red for visibility
      info: '#63B3ED', // Using primary blue for info

      // Severity colors (adjusted for dark background visibility)
      fullyAccessible: '#38A169', // Stronger green
      partiallyAccessible: '#ECC94B', // Stronger yellow-orange
      limitedAccessibility: '#DD6B20', // Stronger orange
      notAccessible: '#E53E3E', // Stronger red
      unknownAccessibility: '#718096', // Medium dark gray (good for contrast)

      // Neutral colors for dark mode (inverted and adjusted for readability)
      white: '#1A202C', // Used for textInverse, effectively
      black: '#FFFFFF', // Used for textInverse, effectively
      gray50: '#171923', // Darkest background neutral
      gray100: '#1A202C',
      gray200: '#2D3748', // Dark backgrounds
      gray300: '#4A5568',
      gray400: '#718096',
      gray500: '#A0AEC0', // Placeholder text etc.
      gray600: '#CBD5E0',
      gray700: '#E2E8F0',
      gray800: '#EDF2F7',
      gray900: '#F7FAFC', // Lightest neutral for textInverse

      // Background colors for dark mode
      background: '#1A202C', // Main dark background
      backgroundSecondary: '#2D3748', // Slightly lighter dark for layered elements
      backgroundTertiary: '#171923', // Very dark for deeper backgrounds

      // Text colors for dark mode
      textPrimary: '#F7FAFC', // Lightest text on dark background
      textSecondary: '#E2E8F0', // Slightly darker light text
      textTertiary: '#CBD5E0', // Light gray for placeholders
      textInverse: '#1A202C', // Dark text on light backgrounds (when needed)

      // Border colors for dark mode
      border: '#4A5568',
      borderLight: '#2D3748',
      borderDark: '#718096',

      // Shadow colors for dark mode (subtle on dark)
      shadow: 'rgba(0, 0, 0, 0.4)',
      shadowLight: 'rgba(0, 0, 0, 0.2)',
      shadowDark: 'rgba(0, 0, 0, 0.6)',

      // Overlay colors (functional, no change needed)
      overlay: 'rgba(0, 0, 0, 0.75)',
      overlayLight: 'rgba(0, 0, 0, 0.5)',
    };
  }

  // Apply colorblind adjustments
  if (isColorBlind) {
    colors = {
      ...colors,
      primary: '#648FFF',
      secondary: '#785EF0',
      accent: '#FE6100',
      success: '#648FFF',
      warning: '#FFB000',
      error: '#DC267F',
      info: '#648FFF',
      fullyAccessible: '#785EF0',
      partiallyAccessible: '#FFB000',
      limitedAccessibility: '#FE6100',
      notAccessible: '#DC267F',
    };
  }

  // Apply high contrast adjustments
  if (isHighContrast) {
    if (isDark) {
      colors = {
        ...colors,
        background: '#000000',
        backgroundSecondary: '#000000',
        backgroundTertiary: '#000000',
        textPrimary: '#FFFFFF',
        textSecondary: '#FFFFFF',
        textTertiary: '#FFFFFF',
        border: '#FFFFFF',
        borderLight: '#FFFFFF',
        borderDark: '#FFFFFF',
        limitedAccessibility: '#FFFF00', // Example: High contrast yellow
      };
    } else {
      colors = {
        ...colors,
        background: '#FFFFFF',
        backgroundSecondary: '#FFFFFF',
        backgroundTertiary: '#FFFFFF',
        textPrimary: '#000000',
        textSecondary: '#000000',
        textTertiary: '#000000',
        border: '#000000',
        borderLight: '#000000',
        borderDark: '#000000',
        primary: '#0000FF',
        secondary: '#008000',
        error: '#FF0000',
        warning: '#FF8C00',
        limitedAccessibility: '#800080', // Example: High contrast purple
      };
    }
  }

  return colors;
};

export const useColors = (): Colors => {
  const { getThemeClasses } = useTheme();

  return useMemo(() => {
    const themeClasses = getThemeClasses();
    return getColors(themeClasses);
  }, [getThemeClasses]);
};
