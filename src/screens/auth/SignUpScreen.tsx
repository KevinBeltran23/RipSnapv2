// src/screens/SignUpScreen.tsx
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
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'; // Import this
import { useAuth } from '../../contexts/AuthContext';
import { getUserFacingMessage } from '../../services/errorHandler';
import { useColors } from '../../hooks/useColors';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import { RootStackParamList } from '../../navigation/types'; // Import RootStackParamList
import Button from '../../components/common/Button';

interface SignUpFormProps {
  onSignUp: (email: any, password: any, displayName: any) => Promise<void>;
  onNavigateBack: () => void;
}

type SignUpScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'SignUp'
>; // Define the type for navigation prop

const SignUpForm: React.FC<SignUpFormProps> = ({
  onSignUp,
  onNavigateBack,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const colors = useColors();
  const { scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles();
  const navigation = useNavigation<SignUpScreenNavigationProp>();

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await onSignUp(email, password, displayName);
      navigation.replace('Main');
    } catch (error) {
      Alert.alert('Sign Up Error', getUserFacingMessage(error));
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
    textInput: {
      borderWidth: proportionalSize(1),
      borderColor: colors.borderDark,
      borderRadius: proportionalSize(8),
      padding: proportionalSize(16),
      marginBottom: scaleHeight(16),
      color: colors.textPrimary,
      backgroundColor: colors.backgroundSecondary,
      fontSize: scaleFont(16),
    },
    signUpButton: {
      marginBottom: scaleHeight(16),
    },
    signInLink: {
      color: colors.primary,
      textAlign: 'center',
      marginTop: scaleHeight(14),
      fontSize: scaleFont(14),
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <Text style={dynamicStyles.title}>Create Account</Text>

      <TextInput
        style={dynamicStyles.textInput}
        placeholder="Email *"
        placeholderTextColor={colors.textSecondary}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={dynamicStyles.textInput}
        placeholder="Display Name (optional)"
        placeholderTextColor={colors.textSecondary}
        value={displayName}
        onChangeText={setDisplayName}
      />

      <TextInput
        style={dynamicStyles.textInput}
        placeholder="Password *"
        placeholderTextColor={colors.textSecondary}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TextInput
        style={[dynamicStyles.textInput, { marginBottom: scaleHeight(24) }]}
        placeholder="Confirm Password *"
        placeholderTextColor={colors.textSecondary}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />

      <Button
        variant="primary"
        label={isLoading ? 'Creating Account...' : 'Create Account'}
        onPress={handleSignUp}
        disabled={isLoading}
        style={dynamicStyles.signUpButton}
      />

      <TouchableOpacity onPress={onNavigateBack}>
        <Text style={dynamicStyles.signInLink}>
          Already have an account? Sign In
        </Text>
      </TouchableOpacity>
    </View>
  );
};

function SignUpScreen() {
  const { signUp } = useAuth();
  const navigation = useNavigation();

  return <SignUpForm onSignUp={signUp} onNavigateBack={navigation.goBack} />;
}

export default SignUpScreen;
