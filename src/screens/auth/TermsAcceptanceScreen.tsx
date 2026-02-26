import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import BouncyCheckbox from 'react-native-bouncy-checkbox';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../contexts/AuthContext';
import { updateUserTermsAcceptance } from '../../services/firebase/users';
import Button from '../../components/common/Button';

type TermsAcceptanceScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'TermsAcceptance'
>;

function TermsAcceptanceScreen() {
  const colors = useColors();
  const navigation = useNavigation<TermsAcceptanceScreenNavigationProp>();
  const { proportionalSize, scaleFont, scaleHeight } = useResponsiveStyles();
  const { authUser, user, loading } = useAuth();
  const [isChecked, setIsChecked] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleAcceptTerms = async () => {
    if (!isChecked) {
      Alert.alert(
        'Required',
        'You must accept the terms of service to continue.',
      );
      return;
    }

    if (!authUser || !user) {
      Alert.alert(
        'Error',
        'User not authenticated. Please try logging in again.',
      );
      return;
    }

    setIsUpdating(true);
    try {
      await updateUserTermsAcceptance(authUser.uid, true);
      // No need to set user state here, AuthContext's onAuthStateChanged will handle it.
      // We directly navigate to Main as per the requirement.
      navigation.replace('Main');
    } catch (error) {
      console.error('Error accepting terms:', error);
      Alert.alert(
        'Error',
        'Failed to update terms acceptance. Please try again.',
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: proportionalSize(20),
      backgroundColor: colors.background,
    },
    title: {
      fontSize: scaleFont(24),
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: scaleHeight(20),
      textAlign: 'center',
    },
    paragraph: {
      fontSize: scaleFont(16),
      color: colors.textSecondary,
      marginBottom: scaleHeight(20),
      textAlign: 'center',
    },
    link: {
      color: colors.primary,
      fontSize: scaleFont(16),
      marginBottom: scaleHeight(20),
      textDecorationLine: 'underline',
    },
    checkboxContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: scaleHeight(30),
    },
    checkboxText: {
      marginLeft: proportionalSize(8),
      fontSize: scaleFont(16),
      color: colors.textPrimary,
    },
    button: {
      width: '100%',
    },
  });

  if (loading) {
    return (
      <View style={dynamicStyles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text
          style={{ color: colors.textPrimary, marginTop: proportionalSize(10) }}
        >
          Loading user data...
        </Text>
      </View>
    );
  }

  return (
    <View style={dynamicStyles.container}>
      <Text style={dynamicStyles.title}>Terms of Service</Text>
      <Text style={dynamicStyles.paragraph}>
        To continue using the app, you must read and accept our Terms of
        Service.
      </Text>
      <TouchableOpacity onPress={() => navigation.navigate('TermsOfService')}>
        <Text style={dynamicStyles.link}>Read Terms of Service</Text>
      </TouchableOpacity>
      <View style={dynamicStyles.checkboxContainer}>
        <BouncyCheckbox
          size={proportionalSize(25)}
          fillColor={colors.primary}
          unFillColor={colors.backgroundSecondary}
          iconStyle={{
            borderColor: colors.primary,
            borderRadius: proportionalSize(4),
          }}
          innerIconStyle={{
            borderWidth: proportionalSize(2),
            borderRadius: proportionalSize(4),
          }}
          textStyle={dynamicStyles.checkboxText}
          text="I have read and agree to the Terms of Service"
          onPress={(checked: boolean) => setIsChecked(checked)}
          isChecked={isChecked}
        />
      </View>
      <Button
        variant="primary"
        label={isUpdating ? 'Saving...' : 'Continue'}
        onPress={handleAcceptTerms}
        disabled={isUpdating || !isChecked}
        style={dynamicStyles.button}
      />
    </View>
  );
}

export default TermsAcceptanceScreen;
