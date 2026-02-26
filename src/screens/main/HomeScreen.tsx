import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../../hooks/useColors';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import Button from '../../components/common/Button';

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
      marginBottom: scaleHeight(12),
    },
  });

  return (
    <View style={dynamicStyles.infoLinksContainer}>
      <Button
        variant="primary"
        label="Privacy Policy"
        style={dynamicStyles.infoLinkButton}
        onPress={() => navigation.navigate('PrivacyPolicy')}
      />
      <Button
        variant="primary"
        label="Terms of Service"
        style={dynamicStyles.infoLinkButton}
        onPress={() => navigation.navigate('TermsOfService')}
      />
      <Button
        variant="primary"
        label="About"
        style={dynamicStyles.infoLinkButton}
        onPress={() => navigation.navigate('About')}
      />
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
