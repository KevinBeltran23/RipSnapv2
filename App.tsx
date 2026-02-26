// Must be the very first import for Reanimated
import 'react-native-reanimated';

import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { MapUIProvider } from './src/contexts/MapUIContext';
import { LocationProvider } from './src/contexts/LocationContext';
import AppNavigator from './src/navigation/AppNavigator';

// Provider nesting order matters — inner providers can call hooks from outer ones:
// AuthProvider   → must wrap ThemeProvider  (ThemeContext calls useAuth)
// MapUIProvider  → must wrap LocationProvider (LocationContext calls useMapUI)
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider>
            <MapUIProvider>
              <LocationProvider>
                <NavigationContainer>
                  <AppNavigator />
                </NavigationContainer>
              </LocationProvider>
            </MapUIProvider>
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
