import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Image,
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
    logo: {
      width: proportionalSize(80),
      height: proportionalSize(80),
      borderRadius: proportionalSize(16),
      marginBottom: scaleHeight(16),
      marginTop: scaleHeight(10),
    },
    paragraph: {
      fontSize: scaleFont(16),
      color: colors.textSecondary,
      marginBottom: scaleHeight(12),
      lineHeight: scaleFont(24),
      textAlign: 'center',
      paddingHorizontal: scaleWidth(10),
    },
    link: {
      fontSize: scaleFont(16),
      color: colors.primary,
      marginBottom: scaleHeight(12),
      textDecorationLine: 'underline',
    },
    sectionTitle: {
      fontSize: scaleFont(18),
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginTop: scaleHeight(20),
      marginBottom: scaleHeight(8),
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
        <Image
          source={require('../../../assets/ripsnap-logo.png')}
          style={dynamicStyles.logo}
        />
        <Text style={dynamicStyles.paragraph}>
          RipSnap is a citizen science mobile app designed to help users detect
          and learn about various types of rip currents. Rip currents are
          detected using a machine learning model running directly on your
          phone.
        </Text>
        <Text style={dynamicStyles.paragraph}>
          The app also provides the ability to record and upload rip current
          videos and photos along with detection metadata, contributing to
          ongoing rip current research and coastal safety efforts.
        </Text>

        <Text style={dynamicStyles.sectionTitle}>Research</Text>
        <Text style={dynamicStyles.paragraph}>
          RipSnap is developed by the Advanced Visualization and Interactive
          Systems Group at the University of California Santa Cruz.
        </Text>
        <Text
          style={dynamicStyles.link}
          onPress={() =>
            Linking.openURL('https://doi.org/10.1145/3462204.3481743')
          }
        >
          Research Paper (ACM)
        </Text>
        <Text
          style={dynamicStyles.link}
          onPress={() =>
            Linking.openURL('https://sites.google.com/ucsc.edu/ripsnap')
          }
        >
          Project Website
        </Text>

        <Text style={dynamicStyles.sectionTitle}>Contact</Text>
        <Text style={dynamicStyles.paragraph}>Email: fkhan4@ucsc.edu</Text>

        <Text style={dynamicStyles.versionText}>Version 1.0.0</Text>
        <Text style={dynamicStyles.versionText}>
          © 2025 UC Santa Cruz — AVIS Group
        </Text>

        <View style={dynamicStyles.endIndicator} />
      </ScrollView>
    </View>
  );
}

export default AboutScreen;
