import { isErrorWithCode } from '../utils';

const AUTH_ERRORS: Record<string, string> = {
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/invalid-credential': 'Incorrect email or password. Please try again.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled. Contact support.',
  'auth/requires-recent-login': 'Please sign in again to complete this action.',
  'auth/network-request-failed':
    'Network error. Check your connection and try again.',
  'auth/too-many-requests':
    'Too many failed attempts. Try again later or reset your password.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled.',
  'auth/account-exists-with-different-credential':
    'An account already exists with this email using a different sign-in method.',
  'auth/unknown': 'Sign-in failed. Check your connection and try again.',
};

const FIRESTORE_ERRORS: Record<string, string> = {
  'firestore/permission-denied': "You don't have permission to do that.",
  'firestore/unavailable':
    'Service is temporarily unavailable. Try again shortly.',
  'firestore/not-found': 'The requested data could not be found.',
  'firestore/cancelled': 'The operation was cancelled.',
};

const STORAGE_ERRORS: Record<string, string> = {
  'storage/unauthorized': 'Upload failed — please sign in and try again.',
  'storage/canceled': 'Upload was cancelled.',
  'storage/quota-exceeded': 'Storage quota exceeded. Contact support.',
  'storage/object-not-found': 'File not found.',
};

const ALL_ERRORS: Record<string, string> = {
  ...AUTH_ERRORS,
  ...FIRESTORE_ERRORS,
  ...STORAGE_ERRORS,
};

/**
 * Maps a known Firebase/app error to a user-friendly string.
 * Never exposes internal error codes or stack traces to the user.
 */
export function getUserFacingMessage(error: unknown): string {
  if (isErrorWithCode(error)) {
    return ALL_ERRORS[error.code] ?? 'Something went wrong. Please try again.';
  }
  if (error instanceof Error && error.message) {
    // Don't expose the raw message — just log it and return generic
    console.error('[getUserFacingMessage] Unmapped error:', error.message);
  }
  return 'Something went wrong. Please try again.';
}
