// src/screens/ForgotPasswordScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../contexts/AuthContext';
import { getUserFacingMessage } from '../../services/errorHandler';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles'; // Import useResponsiveStyles
import Button from '../../components/common/Button';

type ForgotPasswordScreenNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

interface ResetPasswordFormProps {
  onResetPassword: (email: string) => Promise<void>;
  onNavigateBack: () => void;
}

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  onResetPassword,
  onNavigateBack,
}) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();
  const colors = useColors();
  const { scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles(); // Destructure scaling functions

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      await onResetPassword(email);
      Alert.alert(
        'Password Reset Email Sent',
        'Check your email for instructions to reset your password',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }],
      );
    } catch (error) {
      Alert.alert('Error', getUserFacingMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      padding: proportionalSize(20),
      backgroundColor: colors.background,
    },
    title: {
      fontSize: scaleFont(24),
      fontWeight: 'bold',
      marginBottom: scaleHeight(24),
      textAlign: 'center',
      color: colors.textPrimary,
    },
    instructionsText: {
      textAlign: 'center',
      marginBottom: scaleHeight(16),
      color: colors.textPrimary,
      fontSize: scaleFont(16),
    },
    textInput: {
      borderWidth: proportionalSize(1),
      borderColor: colors.borderDark,
      borderRadius: proportionalSize(8),
      padding: proportionalSize(16),
      marginBottom: scaleHeight(24),
      color: colors.textPrimary,
      backgroundColor: colors.backgroundSecondary,
      fontSize: scaleFont(16),
    },
    resetButton: {
      marginBottom: scaleHeight(16),
    },
    backToSignInLink: {
      color: colors.primary,
      textAlign: 'center',
      fontSize: scaleFont(14),
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <Text style={dynamicStyles.title}>Reset Password</Text>

      <Text style={dynamicStyles.instructionsText}>
        Enter your email address and we'll send you instructions to reset your
        password.
      </Text>

      <TextInput
        style={dynamicStyles.textInput}
        placeholder="Email"
        placeholderTextColor={colors.textSecondary}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Button
        variant="primary"
        label={isLoading ? 'Sending...' : 'Send Reset Link'}
        onPress={handleResetPassword}
        disabled={isLoading}
        style={dynamicStyles.resetButton}
      />

      <TouchableOpacity onPress={onNavigateBack}>
        <Text style={dynamicStyles.backToSignInLink}>Back to Sign In</Text>
      </TouchableOpacity>
    </View>
  );
};

function ForgotPasswordScreen() {
  const { forgotPassword } = useAuth();
  const navigation = useNavigation();

  return (
    <ResetPasswordForm
      onResetPassword={forgotPassword}
      onNavigateBack={navigation.goBack}
    />
  );
}

export default ForgotPasswordScreen;
