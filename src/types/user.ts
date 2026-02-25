export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: any;
  darkMode: boolean;
  textToSpeech: boolean;
  colorBlindMode: 'none' | 'red-green';
  highContrast: boolean;
  defaultDisabilityCategory: number | null;
  isAdmin?: boolean;
  hasAcceptedTerms?: boolean;
}
