// src/screens/LoginScreen.tsx
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
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import Button from '../../components/common/Button';

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface LoginFormProps {
  onLogin: (email: any, password: any) => Promise<void>;
  onLoginWithGoogle: () => Promise<void>;
  onNavigateToSignUp: () => void;
  onNavigateToForgotPassword: () => void;
  navigation: LoginScreenNavigationProp;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onLogin,
  onLoginWithGoogle,
  onNavigateToSignUp,
  onNavigateToForgotPassword,
  navigation,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const colors = useColors();
  const { scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      await onLogin(email, password);
      navigation.replace('Main');
    } catch (error) {
      Alert.alert('Login Failed', getUserFacingMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await onLoginWithGoogle();
      navigation.replace('Main');
    } catch (error) {
      Alert.alert('Google Sign-In Failed', getUserFacingMessage(error));
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
      marginBottom: scaleHeight(8),
      textAlign: 'center',
      color: colors.textPrimary,
    },
    subtitle: {
      marginBottom: scaleHeight(24),
      textAlign: 'center',
      color: colors.textPrimary,
      fontSize: scaleFont(16),
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
    loginButton: {
      marginBottom: scaleHeight(16),
    },
    googleLoginButton: {
      marginBottom: scaleHeight(16),
    },
    signUpLink: {
      color: colors.primary,
      textAlign: 'center',
      marginTop: scaleHeight(14),
      fontSize: scaleFont(14),
    },
    forgotPasswordLink: {
      marginTop: scaleHeight(8),
      color: colors.primary,
      textAlign: 'center',
      fontSize: scaleFont(14),
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <Text style={dynamicStyles.title}>Accessibility Tracker</Text>
      <Text style={dynamicStyles.subtitle}>Sign in to continue</Text>

      <TextInput
        style={dynamicStyles.textInput}
        placeholder="Email"
        placeholderTextColor={colors.textSecondary}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={[dynamicStyles.textInput, { marginBottom: scaleHeight(24) }]}
        placeholder="Password"
        placeholderTextColor={colors.textSecondary}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Button
        variant="primary"
        label={isLoading ? 'Signing In...' : 'Sign In'}
        onPress={handleLogin}
        disabled={isLoading}
        style={dynamicStyles.loginButton}
      />

      <Button
        variant="primary"
        label="Sign In with Google"
        onPress={handleGoogleLogin}
        disabled={isLoading}
        style={dynamicStyles.googleLoginButton}
      />

      <TouchableOpacity onPress={onNavigateToSignUp}>
        <Text style={dynamicStyles.signUpLink}>
          Don't have an account? Sign Up
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={dynamicStyles.forgotPasswordLink}
        onPress={onNavigateToForgotPassword}
      >
        <Text style={dynamicStyles.forgotPasswordLink}>Forgot Password?</Text>
      </TouchableOpacity>
    </View>
  );
};

function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { signIn, signInWithGoogle } = useAuth();

  return (
    <LoginForm
      onLogin={signIn}
      onLoginWithGoogle={signInWithGoogle}
      onNavigateToSignUp={() => navigation.navigate('SignUp')}
      onNavigateToForgotPassword={() => navigation.navigate('ForgotPassword')}
      navigation={navigation}
    />
  );
}

export default LoginScreen;
