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

function TermsOfServiceScreen() {
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
          <Text style={dynamicStyles.headerText}>Terms of Service</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={dynamicStyles.container}>
        <Text style={dynamicStyles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={dynamicStyles.paragraph}>
          By accessing or using the SURP mobile application (the "Service"), you
          agree to be bound by these Terms of Service ("Terms"). If you disagree
          with any part of the terms, then you may not access the Service.
        </Text>

        <Text style={dynamicStyles.sectionTitle}>2. Use of Service</Text>
        <Text style={dynamicStyles.paragraph}>
          You agree to use the Service only for lawful purposes and in a way
          that does not infringe the rights of, restrict or inhibit anyone
          else's use and enjoyment of the Service. Prohibited behavior includes
          harassing or causing distress or inconvenience to any other user,
          transmitting obscene or offensive content, or disrupting the normal
          flow of dialogue within the Service.
        </Text>

        <Text style={dynamicStyles.sectionTitle}>3. User Content</Text>
        <Text style={dynamicStyles.paragraph}>
          You are solely responsible for any content you upload, post, or
          otherwise make available through the Service. By posting content, you
          grant SURP a non-exclusive, royalty-free, perpetual, transferable, and
          sublicensable worldwide license to use, modify, reproduce, distribute,
          display, and publish such content in connection with the Service.
        </Text>

        <Text style={dynamicStyles.sectionTitle}>4. Intellectual Property</Text>
        <Text style={dynamicStyles.paragraph}>
          The Service and its original content, features, and functionality are
          and will remain the exclusive property of SURP and its licensors. The
          Service is protected by copyright, trademark, and other laws of both
          the United States and foreign countries.
        </Text>

        <Text style={dynamicStyles.sectionTitle}>5. Disclaimers</Text>
        <Text style={dynamicStyles.paragraph}>
          The Service is provided on an "AS IS" and "AS AVAILABLE" basis. SURP
          makes no warranties, expressed or implied, regarding the operation or
          availability of the Service or the information, content, materials, or
          products included on the Service.
        </Text>

        <Text style={dynamicStyles.sectionTitle}>
          6. Limitation of Liability
        </Text>
        <Text style={dynamicStyles.paragraph}>
          In no event shall SURP, nor its directors, employees, partners,
          agents, suppliers, or affiliates, be liable for any indirect,
          incidental, special, consequential or punitive damages, including
          without limitation, loss of profits, data, use, goodwill, or other
          intangible losses, resulting from your access to or use of or
          inability to access or use the Service.
        </Text>

        <Text style={dynamicStyles.sectionTitle}>7. Changes to Terms</Text>
        <Text style={dynamicStyles.paragraph}>
          We reserve the right, at our sole discretion, to modify or replace
          these Terms at any time. If a revision is material, we will try to
          provide at least 30 days' notice prior to any new terms taking effect.
        </Text>

        <Text style={dynamicStyles.sectionTitle}>8. Contact Us</Text>
        <Text style={dynamicStyles.paragraph}>
          If you have any questions about these Terms, please contact us at
          support@surp.com.
        </Text>

        <View style={dynamicStyles.endIndicator} />
      </ScrollView>
    </View>
  );
}

export default TermsOfServiceScreen;
