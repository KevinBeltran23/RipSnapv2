import React, { createContext, useState, useContext, useEffect } from 'react';
import { Alert } from 'react-native';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  FirebaseAuthTypes,
} from '@react-native-firebase/auth';
import { onSnapshot } from '@react-native-firebase/firestore';
import * as GoogleAuth from './firebase/auth';
import * as FirestoreService from './firebase/firestore';
import { getUserFacingMessage } from './errorHandler';
import { User } from '../types/user';

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
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}


const auth = getAuth();

export function AuthProvider({ children }: AuthProviderProps) {
  const [authUser, setAuthUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Mutable ref to store the Firestore unsubscribe function
  const firestoreUnsubscribeRef = React.useRef<(() => void) | null>(null);
  // Track previous admin state to detect privilege changes
  const prevIsAdminRef = React.useRef<boolean | null>(null);

  useEffect(() => {
    const authUnsubscribe = onAuthStateChanged(auth, async firebaseUser => {
      setAuthUser(firebaseUser);

      // Clean up previous Firestore listener if it exists
      if (firestoreUnsubscribeRef.current) {
        firestoreUnsubscribeRef.current();
        firestoreUnsubscribeRef.current = null;
      }

      if (firebaseUser) {
        setLoading(true); // Set loading true while fetching user profile
        const userDocRef = FirestoreService.getUserDocumentRef(
          firebaseUser.uid,
        );

        // Set up a real-time listener for the user's Firestore profile
        const firestoreUnsubscribe = onSnapshot(
          userDocRef,
          async docSnapshot => {
            if (docSnapshot.exists()) {
              const profile = docSnapshot.data() as User;
              // Force-refresh ID token when admin privilege changes so Firestore
              // security rules honour the new role immediately (avoids up to 1hr stale JWT)
              if (
                prevIsAdminRef.current !== null &&
                prevIsAdminRef.current !== profile.isAdmin &&
                firebaseUser
              ) {
                firebaseUser.getIdToken(true).catch(e =>
                  console.warn('Token refresh after admin change failed:', e),
                );
              }
              prevIsAdminRef.current = !!profile.isAdmin;
              setUser(profile);
            } else {
              // If profile somehow disappears (unlikely but good to handle), create one
              console.log(
                `Profile not found for user ${firebaseUser.uid}. Creating one.`,
              );
              const newProfile =
                await FirestoreService.createUserProfile(firebaseUser);
              setUser(newProfile);
            }
            setLoading(false);
          },
          error => {
            console.error('Error listening to user profile:', error);
            if ((error as any).code !== 'firestore/permission-denied') {
              Alert.alert(
                'Profile Sync Error',
                getUserFacingMessage(error),
              );
            }
            setUser(null); // Clear user on error
            setLoading(false);
          },
        );
        firestoreUnsubscribeRef.current = firestoreUnsubscribe; // Store the unsubscribe function
      } else {
        // User is signed out, clear the profile and stop loading
        setUser(null);
        setLoading(false);
      }
    });

    // Cleanup for both auth state listener and any active firestore listener when component unmounts
    return () => {
      authUnsubscribe();
      if (firestoreUnsubscribeRef.current) {
        firestoreUnsubscribeRef.current();
        firestoreUnsubscribeRef.current = null;
      }
    };
  }, []); // Empty dependency array means this runs once on mount

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  // Sign up with email and password
  const signUp = async (
    email: string,
    password: string,
    displayName?: string,
  ) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      if (displayName && userCredential.user) {
        await userCredential.user.updateProfile({ displayName });
      }
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      await GoogleAuth.signInWithGoogle();
    } catch (error) {
      // Error is already logged in the google auth service
    }
  };

  // Update user's profile
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
      // Firestore onSnapshot listener will automatically update the user state,
      // so no need for optimistic update here.
      await FirestoreService.updateUser(authUser.uid, data);
    } catch (error) {
      console.error('Failed to update profile:', error);
      // No need to revert local state; onSnapshot will eventually correct it.
      throw error;
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await GoogleAuth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  // Reset password
  const forgotPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  };

  const value = {
    authUser,
    user,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    forgotPassword,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
