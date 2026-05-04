import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useColors } from '../../hooks/useColors';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import Button from '../../components/common/Button';

type InfoLinksNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const InfoLinks = () => {
  const navigation = useNavigation<InfoLinksNavigationProp>();
  const { scaleHeight } = useResponsiveStyles();

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
    logo: {
      width: proportionalSize(100),
      height: proportionalSize(100),
      borderRadius: proportionalSize(20),
      marginBottom: scaleHeight(20),
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
      marginBottom: scaleHeight(10),
      textAlign: 'center',
      paddingHorizontal: proportionalSize(15),
      lineHeight: scaleFont(24),
    },
    subdescription: {
      fontSize: scaleFont(14),
      color: colors.textTertiary,
      textAlign: 'center',
      paddingHorizontal: proportionalSize(20),
      lineHeight: scaleFont(20),
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <Image
        source={require('../../../assets/ripsnap-logo.png')}
        style={dynamicStyles.logo}
      />
      <Text style={dynamicStyles.title}>Welcome to RipSnap</Text>
      <Text style={dynamicStyles.description}>
        A citizen science app for detecting and documenting rip currents using
        real-time machine learning. Help advance coastal safety research by
        capturing and sharing rip current observations.
      </Text>
      <Text style={dynamicStyles.subdescription}>
        Developed by the Advanced Visualization and Interactive Systems Group,
        University of California Santa Cruz.
      </Text>
      <InfoLinks />
    </View>
  );
}

export default HomeScreen;
