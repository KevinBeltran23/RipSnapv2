// src/screens/SettingsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Switch,
  TextInput,
  Alert,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { User } from '../../types/user';
import { useColors } from '../../hooks/useColors';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useResponsiveStyles } from '../../hooks/useResponsiveStyles';
import Button from '../../components/common/Button';

interface ProfileSectionProps {
  user: User | null;
  onUpdateUser: (data: Partial<User>) => Promise<void>;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({
  user,
  onUpdateUser,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const colors = useColors();
  const { scaleHeight, scaleWidth, proportionalSize, scaleFont } =
    useResponsiveStyles();

  useEffect(() => {
    setDisplayName(user?.displayName || '');
  }, [user?.displayName]);

  const handleUpdate = async () => {
    try {
      await onUpdateUser({ displayName });
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const dynamicStyles = StyleSheet.create({
    profileSectionContainer: {
      alignItems: 'center',
      marginBottom: scaleHeight(30),
      marginTop: scaleHeight(120),
    },
    avatarContainer: {
      width: scaleWidth(90),
      height: scaleHeight(90),
      borderRadius: proportionalSize(45),
      backgroundColor: colors.gray300,
      marginBottom: scaleHeight(15),
      overflow: 'hidden',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: scaleHeight(2) },
      shadowOpacity: 0.2,
      shadowRadius: proportionalSize(3),
      elevation: 3,
    },
    defaultAvatarBackground: {
      width: '100%',
      height: '100%',
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    defaultAvatarText: {
      color: colors.white,
      fontSize: scaleFont(36),
      fontWeight: 'bold',
    },
    textInput: {
      borderWidth: proportionalSize(1),
      borderColor: colors.border,
      borderRadius: proportionalSize(10),
      padding: proportionalSize(12),
      marginBottom: scaleHeight(10),
      textAlign: 'center',
      width: '90%',
      color: colors.textPrimary,
      backgroundColor: colors.backgroundSecondary,
      fontSize: scaleFont(16),
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: scaleHeight(10),
    },
    saveButton: {
      paddingHorizontal: scaleWidth(20),
      paddingVertical: scaleHeight(10),
      marginRight: scaleWidth(10),
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: scaleHeight(2) },
      shadowOpacity: 0.2,
      shadowRadius: proportionalSize(3),
      elevation: 3,
    },
    cancelButton: {
      backgroundColor: colors.gray300,
      paddingHorizontal: scaleWidth(20),
      paddingVertical: scaleHeight(10),
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: scaleHeight(2) },
      shadowOpacity: 0.2,
      shadowRadius: proportionalSize(3),
      elevation: 3,
    },
    cancelButtonText: {
      color: colors.textPrimary,
    },
    displayNameText: {
      fontSize: scaleFont(20),
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: scaleHeight(5),
    },
    emailText: {
      color: colors.textSecondary,
      fontSize: scaleFont(14),
    },
    editProfileButton: {
      marginTop: scaleHeight(15),
      paddingHorizontal: scaleWidth(18),
      paddingVertical: scaleHeight(8),
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: scaleHeight(2) },
      shadowOpacity: 0.2,
      shadowRadius: proportionalSize(3),
      elevation: 3,
    },
  });

  return (
    <View style={dynamicStyles.profileSectionContainer}>
      <View style={dynamicStyles.avatarContainer}>
        {user?.photoURL ? (
          <Image
            source={{ uri: user.photoURL }}
            style={dynamicStyles.defaultAvatarBackground}
          />
        ) : (
          <View style={dynamicStyles.defaultAvatarBackground}>
            <Text style={dynamicStyles.defaultAvatarText}>
              {user?.displayName
                ? user.displayName[0].toUpperCase()
                : user?.email?.[0].toUpperCase() || '?'}
            </Text>
          </View>
        )}
      </View>

      {isEditing ? (
        <View style={{ width: '100%', alignItems: 'center' }}>
          <TextInput
            style={dynamicStyles.textInput}
            placeholderTextColor={colors.textSecondary}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Display Name"
          />
          <View style={dynamicStyles.buttonRow}>
            <Button
              variant="primary"
              label="Save"
              onPress={handleUpdate}
              style={dynamicStyles.saveButton}
            />
            <Button
              variant="secondary"
              label="Cancel"
              onPress={() => {
                setIsEditing(false);
                setDisplayName(user?.displayName || '');
              }}
              style={dynamicStyles.cancelButton}
              textStyle={dynamicStyles.cancelButtonText}
            />
          </View>
        </View>
      ) : (
        <>
          <Text style={dynamicStyles.displayNameText}>
            {user?.displayName || 'User'}
          </Text>
          <Text style={dynamicStyles.emailText}>{user?.email}</Text>
          <Button
            variant="primary"
            label="Edit Profile"
            onPress={() => setIsEditing(true)}
            style={dynamicStyles.editProfileButton}
          />
        </>
      )}
    </View>
  );
};

const AccessibilitySettings: React.FC = () => {
  const { user, updateUser } = useAuth();
  const colors = useColors();
  const { scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles();

  if (!user) {
    return null;
  }

  const dynamicStyles = StyleSheet.create({
    settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: scaleHeight(15),
      borderBottomWidth: proportionalSize(1),
      borderBottomColor: colors.borderLight,
    },
    settingText: {
      color: colors.textPrimary,
      fontSize: scaleFont(16),
    },
  });

  return (
    <>
      <View style={dynamicStyles.settingRow}>
        <Text style={dynamicStyles.settingText}>Dark Mode</Text>
        <Switch
          trackColor={{ false: colors.gray300, true: colors.primary }}
          thumbColor={colors.white}
          value={user.darkMode}
          onValueChange={value => updateUser({ darkMode: value })}
        />
      </View>
      <View style={dynamicStyles.settingRow}>
        <Text style={dynamicStyles.settingText}>Text-to-Speech</Text>
        <Switch
          trackColor={{ false: colors.gray300, true: colors.primary }}
          thumbColor={colors.white}
          value={user.textToSpeech}
          onValueChange={value => updateUser({ textToSpeech: value })}
        />
      </View>
      <View style={dynamicStyles.settingRow}>
        <Text style={dynamicStyles.settingText}>High Contrast</Text>
        <Switch
          trackColor={{ false: colors.gray300, true: colors.primary }}
          thumbColor={colors.white}
          value={user.highContrast}
          onValueChange={value => updateUser({ highContrast: value })}
        />
      </View>
      <View style={dynamicStyles.settingRow}>
        <Text style={dynamicStyles.settingText}>Color Blind Mode</Text>
        <Switch
          trackColor={{ false: colors.gray300, true: colors.primary }}
          thumbColor={colors.white}
          value={user.colorBlindMode === 'red-green'}
          onValueChange={value =>
            updateUser({ colorBlindMode: value ? 'red-green' : 'none' })
          }
        />
      </View>
    </>
  );
};

const SignOutButton = ({ onSignOut }: { onSignOut: () => void }) => {
  const colors = useColors();
  const { scaleHeight, proportionalSize, scaleFont } = useResponsiveStyles();

  const dynamicStyles = StyleSheet.create({
    signOutButton: {
      marginBottom: scaleHeight(12),
      marginTop: scaleHeight(30),
    },
  });

  return (
    <Button
      variant="danger"
      label="Sign Out"
      onPress={onSignOut}
      style={dynamicStyles.signOutButton}
    />
  );
};

function SettingsScreen() {
  const { user, signOut, updateUser, loading } = useAuth();
  const colors = useColors();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { proportionalSize } = useResponsiveStyles();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const dynamicStyles = StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    settingsScreenContainer: {
      flex: 1,
      padding: proportionalSize(20),
      backgroundColor: colors.background,
    },
  });

  if (loading) {
    return (
      <View style={dynamicStyles.loadingContainer}>
        <ActivityIndicator
          size={proportionalSize(30)}
          color={colors.textPrimary}
        />
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: proportionalSize(16),
            marginTop: proportionalSize(10),
          }}
        >
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <View style={dynamicStyles.settingsScreenContainer}>
      <ProfileSection user={user} onUpdateUser={updateUser} />
      <AccessibilitySettings />
      <SignOutButton onSignOut={handleSignOut} />
    </View>
  );
}

export default SettingsScreen;
