import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { useAuth } from '../contexts/AuthContext';
import { useColors } from '../hooks/useColors';
import { MainNavigator } from './MainNavigator';
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import TermsAcceptanceScreen from '../screens/auth/TermsAcceptanceScreen';
import PrivacyPolicyScreen from '../screens/legal/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../screens/legal/TermsOfServiceScreen';
import AboutScreen from '../screens/legal/AboutScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

function AuthLoadingScreen() {
  const colors = useColors();

  return (
    <View
      style={[styles.loadingContainer, { backgroundColor: colors.background }]}
    >
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const AppNavigator = () => {
  const { authUser, user, loading } = useAuth();
  const isAuthenticated = Boolean(authUser);
  const isResolvingProfile = isAuthenticated && (loading || !user);
  const hasAcceptedTerms = Boolean(user?.hasAcceptedTerms);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isResolvingProfile ? (
        <Stack.Screen name="Login" component={AuthLoadingScreen} />
      ) : !isAuthenticated ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
          />
        </>
      ) : !hasAcceptedTerms ? (
        <Stack.Screen
          name="TermsAcceptance"
          component={TermsAcceptanceScreen}
        />
      ) : (
        <Stack.Screen name="Main" component={MainNavigator} />
      )}

      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});

export default AppNavigator;
