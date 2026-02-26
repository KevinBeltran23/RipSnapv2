/**
 * AppNavigator — root navigator.
 * Gate: authenticated + accepted terms → Main tabs; otherwise → Auth screens.
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { useAuth } from '../contexts/AuthContext';
import { MainNavigator } from './MainNavigator';
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import TermsAcceptanceScreen from '../screens/auth/TermsAcceptanceScreen';
import PrivacyPolicyScreen from '../screens/legal/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../screens/legal/TermsOfServiceScreen';
import AboutScreen from '../screens/legal/AboutScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const { authUser, user } = useAuth();

  let initialRouteName: keyof RootStackParamList = 'Login';
  if (authUser) {
    initialRouteName = user?.hasAcceptedTerms ? 'Main' : 'TermsAcceptance';
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}
    >
      {/* Auth + terms screens */}
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="TermsAcceptance" component={TermsAcceptanceScreen} />
      {/* Legal info — accessible from any state */}
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      {/* Authenticated main app */}
      <Stack.Screen name="Main" component={MainNavigator} />
    </Stack.Navigator>
  );
};

export default AppNavigator;
