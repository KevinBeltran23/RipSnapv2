import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useColors } from '../hooks/useColors';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useResponsiveStyles } from '../hooks/useResponsiveStyles';

// Define the navigation prop type
type InfoLinksNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const InfoLinks = () => {
  const colors = useColors();
  const navigation = useNavigation<InfoLinksNavigationProp>();
  const { scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles();

  const dynamicStyles = StyleSheet.create({
    infoLinksContainer: {
      marginTop: scaleHeight(35),
      width: '85%',
    },
    infoLinkButton: {
      backgroundColor: colors.primary,
      padding: proportionalSize(16),
      borderRadius: proportionalSize(8),
      marginBottom: scaleHeight(12),
      alignItems: 'center',
    },
    infoLinkText: {
      color: colors.textInverse,
      fontSize: scaleFont(16),
      fontWeight: 'bold',
    },
  });

  return (
    <View style={dynamicStyles.infoLinksContainer}>
      <TouchableOpacity
        style={dynamicStyles.infoLinkButton}
        onPress={() => navigation.navigate('PrivacyPolicy')}
      >
        <Text style={dynamicStyles.infoLinkText}>Privacy Policy</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={dynamicStyles.infoLinkButton}
        onPress={() => navigation.navigate('TermsOfService')}
      >
        <Text style={dynamicStyles.infoLinkText}>Terms of Service</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={dynamicStyles.infoLinkButton}
        onPress={() => navigation.navigate('About')}
      >
        <Text style={dynamicStyles.infoLinkText}>About</Text>
      </TouchableOpacity>
    </View>
  );
};

function HomeScreen() {
  const colors = useColors();
  const { scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles();

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
      padding: proportionalSize(20),
    },
    title: {
      fontSize: scaleFont(30),
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: scaleHeight(15),
      textAlign: 'center',
    },
    description: {
      fontSize: scaleFont(17),
      color: colors.textSecondary,
      marginBottom: scaleHeight(40),
      textAlign: 'center',
      paddingHorizontal: proportionalSize(15),
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <Text style={dynamicStyles.title}>
        Welcome to SURP Accessibility Tracker!
      </Text>
      <Text style={dynamicStyles.description}>
        Your essential tool for discovering and sharing accessibility
        information for locations around you. Empowering a more accessible
        world, one place at a time.
      </Text>
      <InfoLinks />
    </View>
  );
}

export default HomeScreen;
