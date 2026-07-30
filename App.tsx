// Must be the very first import for Reanimated
import 'react-native-reanimated';

import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { DetectionSettingsProvider } from './src/contexts/DetectionSettingsContext';
import AppNavigator from './src/navigation/AppNavigator';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, clientPersister } from './src/services/store/queryClient';
import { AppErrorBoundary } from './src/components/common';

export default function App() {
  useEffect(() => {
    void ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.PORTRAIT_UP,
    ).catch(() => undefined);
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <AppErrorBoundary>
        <SafeAreaProvider>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{ persister: clientPersister }}
          >
            <AuthProvider>
              <ThemeProvider>
                <DetectionSettingsProvider>
                  <NavigationContainer>
                    <AppNavigator />
                  </NavigationContainer>
                </DetectionSettingsProvider>
              </ThemeProvider>
            </AuthProvider>
          </PersistQueryClientProvider>
        </SafeAreaProvider>
      </AppErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
