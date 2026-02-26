import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useColors } from '../../hooks/useColors';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';

function AboutScreen() {
  const colors = useColors();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { scaleHeight, scaleWidth, proportionalSize, scaleFont } =
    useResponsiveStyles();

  const dynamicStyles = StyleSheet.create({
    screenContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.primary,
      paddingHorizontal: scaleWidth(15),
      paddingTop: insets.top + scaleHeight(10),
      paddingBottom: scaleHeight(15),
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerText: {
      fontSize: scaleFont(20),
      fontWeight: 'bold',
      color: colors.textInverse,
      marginLeft: scaleWidth(10),
    },
    container: {
      flexGrow: 1,
      padding: proportionalSize(20),
      backgroundColor: colors.background,
      alignItems: 'center',
      paddingBottom: scaleHeight(50),
      paddingHorizontal: scaleWidth(20),
    },
    paragraph: {
      fontSize: scaleFont(16),
      color: colors.textSecondary,
      marginBottom: scaleHeight(12),
      lineHeight: scaleFont(24),
      textAlign: 'center',
      paddingHorizontal: scaleWidth(10),
    },
    versionText: {
      fontSize: scaleFont(14),
      color: colors.textTertiary,
      marginTop: scaleHeight(25),
      marginBottom: scaleHeight(5),
    },
    endIndicator: {
      borderTopWidth: proportionalSize(1),
      borderTopColor: colors.border,
      marginVertical: scaleHeight(30),
      width: '80%',
      alignSelf: 'center',
    },
  });

  return (
    <View style={dynamicStyles.screenContainer}>
      <View style={dynamicStyles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={dynamicStyles.headerLeft}
        >
          <Icon
            name="arrow-left"
            size={scaleFont(24)}
            color={colors.textInverse}
          />
          <Text style={dynamicStyles.headerText}>About</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={dynamicStyles.container}>
        <Text style={dynamicStyles.paragraph}>
          SURP Accessibility Tracker is a mobile application designed to empower
          users to easily discover, share, and manage accessibility information
          for various locations. Our goal is to foster a more inclusive
          environment by providing a comprehensive platform for crowd-sourced
          accessibility data.
        </Text>
        <Text style={dynamicStyles.paragraph}>
          Whether you are looking for wheelchair-accessible ramps,
          sensory-friendly environments, or other specific accessibility
          features, SURP aims to be your go-to resource. We believe that
          everyone deserves equal access, and by collaborating as a community,
          we can make the world a more navigable place for all.
        </Text>
        <Text style={dynamicStyles.paragraph}>
          This application is continuously being improved with new features and
          enhancements based on user feedback and evolving accessibility
          standards. Thank you for being a part of the SURP community and
          contributing to a more accessible future!
        </Text>
        <Text style={dynamicStyles.versionText}>Version 1.0.0</Text>
        <Text style={dynamicStyles.versionText}>Â© 2024 SURP Team</Text>

        <View style={dynamicStyles.endIndicator} />
      </ScrollView>
    </View>
  );
}

export default AboutScreen;
