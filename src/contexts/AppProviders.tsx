import React, { ReactNode } from 'react';
import { AuthProvider } from './AuthContext';
import { ThemeProvider } from './ThemeContext';
import { MapUIProvider } from './MapUIContext';
import { DetectionSettingsProvider } from './DetectionSettingsContext';

/**
 * Composes all app-level context providers in one place.
 * Wrap your root component with this so all children access every context.
 *
 * Provider order:
 *   MapUIProvider (bottom, leaf)
 *   └─ DetectionSettingsProvider
 *      └─ ThemeProvider  (depends on AuthContext)
 *         └─ AuthProvider (top, no deps)
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <DetectionSettingsProvider>
          <MapUIProvider>{children}</MapUIProvider>
        </DetectionSettingsProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
