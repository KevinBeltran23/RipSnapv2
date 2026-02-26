// Must be the very first import for Reanimated
import 'react-native-reanimated';

import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { MapUIProvider } from './src/contexts/MapUIContext';
import AppNavigator from './src/navigation/AppNavigator';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, clientPersister } from './src/services/store/queryClient';

// Provider nesting order matters — inner providers can call hooks from outer ones:
// AuthProvider   → must wrap ThemeProvider  (ThemeContext calls useAuth)
// MapUIProvider  → must wrap LocationProvider (LocationContext calls useMapUI)
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: clientPersister }}>
          <AuthProvider>
            <ThemeProvider>
              <MapUIProvider>
                <NavigationContainer>
                  <AppNavigator />
                </NavigationContainer>
              </MapUIProvider>
            </ThemeProvider>
          </AuthProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
