/**
 * User-related Firestore operations.
 */
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
} from '@react-native-firebase/firestore';
import { User } from '../../types/user';

const db = getFirestore();

export const USERS_COLLECTION = 'users';

export function getUserDocumentRef(userId: string) {
  return doc(db, USERS_COLLECTION, userId);
}

export async function createUserProfile(user: {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}): Promise<User | null> {
  const userRef = doc(db, USERS_COLLECTION, user.uid);
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    return snapshot.data() as User;
  }

  const { email, displayName, photoURL } = user;
  const newUserProfile: Omit<User, 'createdAt'> = {
    uid: user.uid,
    displayName: displayName || 'Anonymous User',
    email: email ?? null,
    photoURL: photoURL || null,
    darkMode: false,
    textToSpeech: false,
    colorBlindMode: 'none',
    highContrast: false,
    defaultDisabilityCategory: null,
    isAdmin: false,
    hasAcceptedTerms: false,
  };

  await setDoc(userRef, {
    ...newUserProfile,
    createdAt: serverTimestamp(),
  });

  return {
    ...newUserProfile,
    createdAt: new Date(),
  } as User;
}

export async function getUserProfile(userId: string): Promise<User | null> {
  const docSnap = await getDoc(doc(db, USERS_COLLECTION, userId));
  return docSnap.exists() ? (docSnap.data() as User) : null;
}

export async function updateUser(
  userId: string,
  data: Partial<User>,
): Promise<void> {
  await updateDoc(
    doc(db, USERS_COLLECTION, userId),
    data as { [key: string]: any },
  );
}

export async function updateUserTermsAcceptance(
  userId: string,
  hasAccepted: boolean,
): Promise<void> {
  await updateDoc(doc(db, USERS_COLLECTION, userId), {
    hasAcceptedTerms: hasAccepted,
  });
}
