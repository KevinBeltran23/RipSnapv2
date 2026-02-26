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

function PrivacyPolicyScreen() {
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
      paddingBottom: scaleHeight(50),
      paddingHorizontal: scaleWidth(20),
    },
    sectionTitle: {
      fontSize: scaleFont(18),
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginTop: scaleHeight(20),
      marginBottom: scaleHeight(8),
    },
    paragraph: {
      fontSize: scaleFont(16),
      color: colors.textSecondary,
      marginBottom: scaleHeight(12),
      lineHeight: scaleFont(24),
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
          <Text style={dynamicStyles.headerText}>Privacy Policy</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={dynamicStyles.container}>
        <Text style={dynamicStyles.sectionTitle}>1. Introduction</Text>
        <Text style={dynamicStyles.paragraph}>
          This Privacy Policy describes how SURP collects, uses, and shares your
          personal information when you use our mobile application.
        </Text>

        <Text style={dynamicStyles.sectionTitle}>
          2. Information We Collect
        </Text>
        <Text style={dynamicStyles.paragraph}>
          We collect information you provide directly to us, such as when you
          create an account (email, display name), upload media (images,
          videos), or submit location data. We may also collect device
          information and usage data.
        </Text>

        <Text style={dynamicStyles.sectionTitle}>
          3. How We Use Your Information
        </Text>
        <Text style={dynamicStyles.paragraph}>
          We use the information collected to provide, maintain, and improve our
          services, personalize your experience, and for security purposes. This
          includes displaying accessibility information, managing user accounts,
          and facilitating media uploads.
        </Text>

        <Text style={dynamicStyles.sectionTitle}>
          4. Sharing of Information
        </Text>
        <Text style={dynamicStyles.paragraph}>
          We do not share your personal information with third parties except as
          necessary to provide our services (e.g., Firebase for authentication
          and storage), or as required by law.
        </Text>

        <Text style={dynamicStyles.sectionTitle}>5. Data Security</Text>
        <Text style={dynamicStyles.paragraph}>
          We take reasonable measures to protect your personal information from
          unauthorized access, alteration, disclosure, or destruction. However,
          no internet transmission is entirely secure.
        </Text>

        <Text style={dynamicStyles.sectionTitle}>6. Your Choices</Text>
        <Text style={dynamicStyles.paragraph}>
          You can update your profile information through the app settings. You
          may also be able to disable certain data collection features in your
          device settings.
        </Text>

        <Text style={dynamicStyles.sectionTitle}>
          7. Changes to This Policy
        </Text>
        <Text style={dynamicStyles.paragraph}>
          We may update this Privacy Policy from time to time. We will notify
          you of any changes by posting the new policy within the application.
        </Text>

        <Text style={dynamicStyles.sectionTitle}>8. Contact Us</Text>
        <Text style={dynamicStyles.paragraph}>
          If you have any questions about this Privacy Policy, please contact us
          at support@surp.com.
        </Text>

        <View style={dynamicStyles.endIndicator} />
      </ScrollView>
    </View>
  );
}

export default PrivacyPolicyScreen;
