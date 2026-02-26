import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

export type ThemeMode = 'light' | 'dark';
export type ColorBlindMode = 'none' | 'red-green';

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
    const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
    const [colorBlindMode, setColorBlindModeState] = useState<ColorBlindMode>('none');
    const [highContrast, setHighContrastState] = useState(false);

    useEffect(() => {
        if (user) {
            setThemeModeState(user.darkMode ? 'dark' : 'light');
            setColorBlindModeState(user.colorBlindMode);
            setHighContrastState(user.highContrast);
        }
    }, [user]);

    const setThemeMode = (mode: ThemeMode) => {
        setThemeModeState(mode);
        if (user) updateUser({ darkMode: mode === 'dark' });
    };
    const setColorBlindMode = (mode: ColorBlindMode) => {
        setColorBlindModeState(mode);
        if (user) updateUser({ colorBlindMode: mode });
    };
    const setHighContrast = (enabled: boolean) => {
        setHighContrastState(enabled);
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
        <ThemeContext.Provider value={{ themeMode, colorBlindMode, highContrast, setThemeMode, setColorBlindMode, setHighContrast, getThemeClasses }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within a ThemeProvider');
    return context;
};
