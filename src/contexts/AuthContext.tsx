import React, { createContext, useState, useContext, useEffect } from 'react';
import { Alert } from 'react-native';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  FirebaseAuthTypes,
} from '@react-native-firebase/auth';
import { onSnapshot } from '@react-native-firebase/firestore';
import * as GoogleAuth from '../services/firebase/auth';
import {
  getUserDocumentRef,
  createUserProfile,
  updateUser as updateUserFirestore,
} from '../services/firebase/users';
import { getUserFacingMessage } from '../services/errorHandler';
import { User } from '../types/user';
import { createMMKV } from 'react-native-mmkv';

const userStorage = createMMKV({ id: 'user-profile-cache' });

interface AuthContextType {
  authUser: FirebaseAuthTypes.User | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

const auth = getAuth();

export function AuthProvider({ children }: AuthProviderProps) {
  const [authUser, setAuthUser] = useState<FirebaseAuthTypes.User | null>(null);

  // Attempt to load the user synchronously from MMKV on boot
  const [user, setUser] = useState<User | null>(() => {
    const cachedUserStr = userStorage.getString('cached-user');
    return cachedUserStr ? (JSON.parse(cachedUserStr) as User) : null;
  });

  // Default loading to false if we successfully hydrated a cached user so the UI is instantly visible
  const [loading, setLoading] = useState<boolean>(
    !userStorage.getString('cached-user'),
  );

  const firestoreUnsubscribeRef = React.useRef<(() => void) | null>(null);

  useEffect(() => {
    const authUnsubscribe = onAuthStateChanged(auth, async firebaseUser => {
      setAuthUser(firebaseUser);
      if (firestoreUnsubscribeRef.current) {
        firestoreUnsubscribeRef.current();
        firestoreUnsubscribeRef.current = null;
      }
      if (firebaseUser) {
        // Only trigger the hard loading spinner on boot if we didn't have a cached profile ready
        if (!userStorage.getString('cached-user')) {
          setLoading(true);
        }
        const userDocRef = getUserDocumentRef(firebaseUser.uid);
        const firestoreUnsubscribe = onSnapshot(
          userDocRef,
          async docSnapshot => {
            if (docSnapshot.exists()) {
              const profile = docSnapshot.data() as User;
              setUser(profile);
              userStorage.set('cached-user', JSON.stringify(profile));
            } else {
              console.log(
                `Profile not found for user ${firebaseUser.uid}. Creating one.`,
              );
              const newProfile = await createUserProfile(firebaseUser);
              setUser(newProfile);
              userStorage.set('cached-user', JSON.stringify(newProfile));
            }
            setLoading(false);
          },
          error => {
            console.error('Error listening to user profile:', error);
            if ((error as any).code !== 'firestore/permission-denied') {
              Alert.alert('Profile Sync Error', getUserFacingMessage(error));
            }
            setUser(null);
            userStorage.remove('cached-user');
            setLoading(false);
          },
        );
        firestoreUnsubscribeRef.current = firestoreUnsubscribe;
      } else {
        setUser(null);
        userStorage.remove('cached-user');
        setLoading(false);
      }
    });
    return () => {
      authUnsubscribe();
      if (firestoreUnsubscribeRef.current) {
        firestoreUnsubscribeRef.current();
        firestoreUnsubscribeRef.current = null;
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    displayName?: string,
  ) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName && cred.user)
        await cred.user.updateProfile({ displayName });
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      await GoogleAuth.signInWithGoogle();
    } catch {
      /* error already logged in google auth service */
    }
  };

  const updateUser = async (data: Partial<User>) => {
    if (!authUser || !user) {
      console.error('No user logged in to update profile.');
      return;
    }
    try {
      const { displayName, photoURL } = data;
      if (displayName !== undefined || photoURL !== undefined) {
        await authUser.updateProfile({ displayName, photoURL });
        await authUser.reload();
        const firebaseUser = auth.currentUser;
        if (firebaseUser) setAuthUser(firebaseUser);
      }
      await updateUserFirestore(authUser.uid, data);
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await GoogleAuth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        authUser,
        user,
        loading,
        signIn,
        signUp,
        signOut,
        signInWithGoogle,
        forgotPassword,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
