import React, { ReactNode } from 'react';
import { AuthProvider } from './AuthContext';
import { ThemeProvider } from './ThemeContext';
import { LocationProvider } from './LocationContext';
import { MapUIProvider } from './MapUIContext';

/**
 * Composes all app-level context providers in one place.
 * Wrap your root component with this so all children access every context.
 *
 * Provider order:
 *   MapUIProvider (bottom, leaf)
 *   └─ LocationProvider  (depends on MapUIContext)
 *      └─ ThemeProvider  (depends on AuthContext)
 *         └─ AuthProvider (top, no deps)
 */
export function AppProviders({ children }: { children: ReactNode }) {
    return (
        <AuthProvider>
            <ThemeProvider>
                <MapUIProvider>
                    <LocationProvider>
                        {children}
                    </LocationProvider>
                </MapUIProvider>
            </ThemeProvider>
        </AuthProvider>
    );
}
