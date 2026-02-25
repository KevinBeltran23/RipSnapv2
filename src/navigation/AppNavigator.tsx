// src/navigation/AppNavigator.tsx
import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList, MainTabParamList } from '../types/navigation';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuth } from '../services/AuthContext';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useColors } from '../hooks/useColors';
import { useResponsiveStyles } from '../hooks/useResponsiveStyles';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'; // Import this

import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import MapScreen from '../screens/MapScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../screens/TermsOfServiceScreen';
import AboutScreen from '../screens/AboutScreen';
import TermsAcceptanceScreen from '../screens/TermsAcceptanceScreen';
import LiveDetectionScreen from '../screens/LiveDetectionScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * A wrapper for the MapScreen that ensures it unmounts when not focused.
 */
const MapScreenWithUnmount = (props: any) => {
  const isFocused = useIsFocused();
  return isFocused ? <MapScreen {...props} /> : null;
};

// Tab bar icon component
type IconName = React.ComponentProps<typeof Icon>['name'];

const TabBarIcon = ({
  name,
  color,
  size,
}: {
  name: IconName;
  color: string;
  size: number;
}) => {
  return <Icon name={name} size={size} color={color} />;
};

function MainTabs() {
  const colors = useColors();
  const { scaleHeight, scaleWidth, scaleFont, isMediumScreen, isLargeScreen } =
    useResponsiveStyles();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          paddingBottom: scaleHeight(10),
          height: scaleHeight(75),
          backgroundColor: colors.backgroundSecondary,
          borderTopColor: colors.borderLight,
          ...((isMediumScreen || isLargeScreen) && {
            paddingBottom: scaleHeight(25),
            height: scaleHeight(75),
          }),
        },
        tabBarLabelStyle: {
          fontSize: scaleFont(12),
          marginBottom: scaleHeight(5),
          ...((isMediumScreen || isLargeScreen) && {
            marginBottom: scaleHeight(-3),
            left: scaleWidth(2),
          }),
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="home" color={color} size={scaleFont(24)} />
          ),
        }}
      />
      <Tab.Screen
        name="MapTab"
        component={MapScreenWithUnmount}
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="map" color={color} size={scaleFont(24)} />
          ),
        }}
      />
      <Tab.Screen
        name="LiveFeedTab"
        component={LiveDetectionScreen}
        options={{
          title: 'Live',
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="camera" color={color} size={scaleFont(24)} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="cog" color={color} size={scaleFont(24)} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Main navigator component
const AppNavigator = () => {
  const { authUser, user, loading } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Redirect logic based on terms acceptance
  useEffect(() => {
    if (!loading && authUser && user && !user.hasAcceptedTerms) {
      const state = navigation.getState();
      if (state) {
        const currentRoute = state.routes[state.index];
        if (currentRoute?.name !== 'TermsAcceptance') {
          navigation.navigate('TermsAcceptance');
        }
      }
    }
  }, [loading, authUser, user, navigation]);

  // Determine the initial route based on authentication and terms acceptance
  let initialRouteName: keyof RootStackParamList = 'Login';
  if (authUser) {
    if (user?.hasAcceptedTerms) {
      initialRouteName = 'Main';
    } else {
      // If user is authenticated but hasn't accepted terms, go to TermsAcceptance
      initialRouteName = 'TermsAcceptance';
    }
  }

  return (
    <Stack.Navigator initialRouteName={initialRouteName}>
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TermsOfService"
        component={TermsOfServiceScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="About"
        component={AboutScreen}
        options={{ headerShown: false }}
      />
      {/* Add the new TermsAcceptanceScreen */}
      <Stack.Screen
        name="TermsAcceptance"
        component={TermsAcceptanceScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="Main"
        component={MainTabs}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
