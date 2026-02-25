// Must be the very first import for Reanimated
import 'react-native-reanimated';

import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/services/ThemeContext';
import { AuthProvider } from './src/services/AuthContext';
import { LocationProvider } from './src/services/LocationContext';
import { MapUIProvider } from './src/services/MapUIContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <LocationProvider>
              <MapUIProvider>
                <NavigationContainer>
                  <AppNavigator />
                </NavigationContainer>
              </MapUIProvider>
            </LocationProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
