/**
 * MainNavigator — bottom tabs + any main-app stack screens.
 */
import React from 'react';
import { useWindowDimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useIsFocused } from '@react-navigation/native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import * as ScreenOrientation from 'expo-screen-orientation';
import { MainTabParamList } from './types';
import { useColors } from '../hooks/useColors';
import { useResponsiveStyles } from '../hooks/useResponsiveStyles';

import HomeScreen from '../screens/main/HomeScreen';
import GoogleMapScreen from '../screens/main/GoogleMapScreen';
import MapboxMapScreen from '../screens/main/MapboxMapScreen';
import LiveDetectionScreen from '../screens/main/LiveDetectionScreen';
import SettingsScreen from '../screens/main/SettingsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

type IconName = React.ComponentProps<typeof Icon>['name'];
const TabBarIcon = ({
  name,
  color,
  size,
}: {
  name: IconName;
  color: string;
  size: number;
}) => <Icon name={name} size={size} color={color} />;

const renderHomeIcon = ({ color, size }: { color: string; size: number }) => (
  <TabBarIcon name="home" color={color} size={size} />
);

const renderMapIcon = ({ color, size }: { color: string; size: number }) => (
  <TabBarIcon name="map" color={color} size={size} />
);

const renderCameraIcon = ({ color, size }: { color: string; size: number }) => (
  <TabBarIcon name="camera" color={color} size={size} />
);

const renderCogIcon = ({ color, size }: { color: string; size: number }) => (
  <TabBarIcon name="cog" color={color} size={size} />
);

const GoogleMapScreenWithUnmount = (props: any) => {
  const isFocused = useIsFocused();
  return isFocused ? <GoogleMapScreen {...props} /> : null;
};

const MapboxMapScreenWithUnmount = (props: any) => {
  const isFocused = useIsFocused();
  return isFocused ? <MapboxMapScreen {...props} /> : null;
};

export function MainNavigator() {
  const colors = useColors();
  const { width, height } = useWindowDimensions();
  const { scaleHeight, scaleWidth, scaleFont, isMediumScreen, isLargeScreen } =
    useResponsiveStyles();
  const isLarge = isMediumScreen || isLargeScreen;
  const isLandscape = width > height;
  const lockPortrait = React.useCallback(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  }, []);
  const unlockOrientation = React.useCallback(() => {
    ScreenOrientation.unlockAsync();
  }, []);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          display: isLandscape ? 'none' : 'flex',
          paddingBottom: isLarge ? scaleHeight(25) : scaleHeight(10),
          height: scaleHeight(75),
          backgroundColor: colors.backgroundSecondary,
          borderTopColor: colors.borderLight,
        },
        tabBarLabelStyle: {
          fontSize: scaleFont(12),
          marginBottom: isLarge ? scaleHeight(-3) : scaleHeight(5),
          ...(isLarge && { left: scaleWidth(2) }),
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        listeners={{ focus: lockPortrait }}
        options={{
          title: 'Home',
          tabBarIcon: renderHomeIcon,
        }}
      />
      <Tab.Screen
        name="MapTab"
        component={GoogleMapScreenWithUnmount}
        listeners={{ focus: lockPortrait }}
        options={{
          title: 'Map',
          tabBarIcon: renderMapIcon,
        }}
      />
      <Tab.Screen
        name="MapboxMapTab"
        component={MapboxMapScreenWithUnmount}
        listeners={{ focus: lockPortrait }}
        options={{
          title: 'Mapbox',
          tabBarIcon: renderMapIcon,
        }}
      />
      <Tab.Screen
        name="LiveFeedTab"
        component={LiveDetectionScreen}
        listeners={{ focus: unlockOrientation }}
        options={{
          title: 'Live',
          tabBarIcon: renderCameraIcon,
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        listeners={{ focus: lockPortrait }}
        options={{
          title: 'Settings',
          tabBarIcon: renderCogIcon,
        }}
      />
    </Tab.Navigator>
  );
}
