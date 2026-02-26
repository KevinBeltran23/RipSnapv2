import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { createMMKV } from 'react-native-mmkv';

export type ThemeMode = 'light' | 'dark';
export type ColorBlindMode = 'none' | 'red-green';

const themeStorage = createMMKV({ id: 'theme-preferences-cache' });

interface ThemeContextType {
  themeMode: ThemeMode;
  colorBlindMode: ColorBlindMode;
  highContrast: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  setColorBlindMode: (mode: ColorBlindMode) => void;
  setHighContrast: (enabled: boolean) => void;
  getThemeClasses: () => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user, updateUser } = useAuth();

  // Synchronously read from MMKV on boot avoiding any flashes
  const [themeMode, setThemeModeState] = useState<ThemeMode>(
    (themeStorage.getString('themeMode') as ThemeMode) || 'light',
  );
  const [colorBlindMode, setColorBlindModeState] = useState<ColorBlindMode>(
    (themeStorage.getString('colorBlindMode') as ColorBlindMode) || 'none',
  );
  const [highContrast, setHighContrastState] = useState(
    themeStorage.getBoolean('highContrast') || false,
  );

  useEffect(() => {
    if (user) {
      const firebaseTheme = user.darkMode ? 'dark' : 'light';
      setThemeModeState(firebaseTheme);
      setColorBlindModeState(user.colorBlindMode);
      setHighContrastState(user.highContrast);

      // Sync Firebase's ground truth down into MMKV
      themeStorage.set('themeMode', firebaseTheme);
      themeStorage.set('colorBlindMode', user.colorBlindMode);
      themeStorage.set('highContrast', user.highContrast);
    }
  }, [user]);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    themeStorage.set('themeMode', mode);
    if (user) updateUser({ darkMode: mode === 'dark' });
  };
  const setColorBlindMode = (mode: ColorBlindMode) => {
    setColorBlindModeState(mode);
    themeStorage.set('colorBlindMode', mode);
    if (user) updateUser({ colorBlindMode: mode });
  };
  const setHighContrast = (enabled: boolean) => {
    setHighContrastState(enabled);
    themeStorage.set('highContrast', enabled);
    if (user) updateUser({ highContrast: enabled });
  };

  const getThemeClasses = (): string => {
    const classes: string[] = [];
    if (themeMode === 'dark') classes.push('dark');
    if (colorBlindMode === 'red-green') classes.push('colorblind-red-green');
    if (highContrast) classes.push('high-contrast');
    return classes.join(' ');
  };

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        colorBlindMode,
        highContrast,
        setThemeMode,
        setColorBlindMode,
        setHighContrast,
        getThemeClasses,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
