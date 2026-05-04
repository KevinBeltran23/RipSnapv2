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
          By accessing or using the RipSnap mobile application (the "Service"),
          you agree to be bound by these Terms of Service ("Terms"). If you
          disagree with any part of the terms, then you may not access the
          Service.
        </Text>

        <Text style={dynamicStyles.sectionTitle}>2. Use of Service</Text>
        <Text style={dynamicStyles.paragraph}>
          RipSnap is a citizen science tool for rip current detection and
          research. You agree to use the Service only for lawful purposes and in
          a way that does not infringe the rights of others. The Service is
          intended for coastal observation and research contribution.
        </Text>

        <Text style={dynamicStyles.sectionTitle}>3. User Content</Text>
        <Text style={dynamicStyles.paragraph}>
          You are solely responsible for any content you capture, upload, or
          otherwise make available through the Service. By uploading content,
          you grant the University of California Santa Cruz a non-exclusive,
          royalty-free license to use such content for research purposes,
          including improving rip current detection models and advancing coastal
          safety research.
        </Text>

        <Text style={dynamicStyles.sectionTitle}>4. Safety Disclaimer</Text>
        <Text style={dynamicStyles.paragraph}>
          RipSnap is a research tool and should not be used as the sole basis
          for water safety decisions. Always follow posted beach warnings,
          lifeguard instructions, and official safety guidelines. The machine
          learning model may produce inaccurate detections. Never enter
          dangerous water conditions based on app output alone.
        </Text>

        <Text style={dynamicStyles.sectionTitle}>5. Intellectual Property</Text>
        <Text style={dynamicStyles.paragraph}>
          The Service and its original content, features, and functionality are
          the property of the University of California Santa Cruz. The software
          is provided under the UC Santa Cruz Noncommercial License. Any
          noncommercial purpose is a permitted purpose. Contact Innovation
          Transfer, UC Santa Cruz (innovation@ucsc.edu) for any commercial use.
        </Text>

        <Text style={dynamicStyles.sectionTitle}>6. Disclaimers</Text>
        <Text style={dynamicStyles.paragraph}>
          The Service is provided on an "AS IS" and "AS AVAILABLE" basis. The
          University of California makes no warranties, expressed or implied,
          regarding the accuracy of rip current detections, the operation or
          availability of the Service, or the information, content, materials,
          or products included on the Service.
        </Text>

        <Text style={dynamicStyles.sectionTitle}>
          7. Limitation of Liability
        </Text>
        <Text style={dynamicStyles.paragraph}>
          As far as the law allows, the software comes as is, without any
          warranty or condition, and the licensor will not be liable to you for
          any damages arising out of these terms or the use or nature of the
          software, under any kind of legal claim.
        </Text>

        <Text style={dynamicStyles.sectionTitle}>8. Changes to Terms</Text>
        <Text style={dynamicStyles.paragraph}>
          We reserve the right to modify or replace these Terms at any time. If
          a revision is material, we will try to provide notice prior to any new
          terms taking effect.
        </Text>

        <Text style={dynamicStyles.sectionTitle}>9. Contact Us</Text>
        <Text style={dynamicStyles.paragraph}>
          If you have any questions about these Terms, please contact us at
          fkhan4@ucsc.edu.
        </Text>

        <View style={dynamicStyles.endIndicator} />
      </ScrollView>
    </View>
  );
}

export default TermsOfServiceScreen;
