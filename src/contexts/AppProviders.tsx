import React, { ReactNode } from 'react';
import { AuthProvider } from './AuthContext';
import { ThemeProvider } from './ThemeContext';
import { DetectionSettingsProvider } from './DetectionSettingsContext';

/**
 * Composes app-level providers in dependency order.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <DetectionSettingsProvider>{children}</DetectionSettingsProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
