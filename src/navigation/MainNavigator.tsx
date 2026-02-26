/**
 * MainNavigator — bottom tabs + any main-app stack screens.
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useIsFocused } from '@react-navigation/native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { MainTabParamList } from './types';
import { useColors } from '../hooks/useColors';
import { useResponsiveStyles } from '../hooks/useResponsiveStyles';

import HomeScreen from '../screens/main/HomeScreen';
import MapScreen from '../screens/main/MapScreen';
import LiveDetectionScreen from '../screens/main/LiveDetectionScreen';
import SettingsScreen from '../screens/main/SettingsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

type IconName = React.ComponentProps<typeof Icon>['name'];
const TabBarIcon = ({ name, color, size }: { name: IconName; color: string; size: number }) => (
    <Icon name={name} size={size} color={color} />
);

const MapScreenWithUnmount = (props: any) => {
    const isFocused = useIsFocused();
    return isFocused ? <MapScreen {...props} /> : null;
};

export function MainNavigator() {
    const colors = useColors();
    const { scaleHeight, scaleWidth, scaleFont, isMediumScreen, isLargeScreen } = useResponsiveStyles();
    const isLarge = isMediumScreen || isLargeScreen;

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textSecondary,
                tabBarStyle: {
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
            <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: 'Home', tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} size={scaleFont(24)} /> }} />
            <Tab.Screen name="MapTab" component={MapScreenWithUnmount} options={{ title: 'Map', tabBarIcon: ({ color }) => <TabBarIcon name="map" color={color} size={scaleFont(24)} /> }} />
            <Tab.Screen name="LiveFeedTab" component={LiveDetectionScreen} options={{ title: 'Live', tabBarIcon: ({ color }) => <TabBarIcon name="camera" color={color} size={scaleFont(24)} /> }} />
            <Tab.Screen name="SettingsTab" component={SettingsScreen} options={{ title: 'Settings', tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} size={scaleFont(24)} /> }} />
        </Tab.Navigator>
    );
}
