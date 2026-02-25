import auth from '@react-native-firebase/auth';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';

// Must be called before any GoogleSignin methods
GoogleSignin.configure({
  webClientId:
    '703962492488-q98nua8ure5o3h02fu78i8eh8d3g0okv.apps.googleusercontent.com',
});


export const signInWithGoogle = async () => {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    await GoogleSignin.signIn();

    const { idToken } = await GoogleSignin.getTokens();

    const googleCredential = auth.GoogleAuthProvider.credential(idToken!);

    return auth().signInWithCredential(googleCredential);
  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      console.log('User cancelled the login flow');
      return null;
    } else if (error.code === statusCodes.IN_PROGRESS) {
      console.log('Sign in is in progress already');
      return null;
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      console.log('Play services not available or outdated');
      return null;
    } else {
      console.error('Something else went wrong', error);
      throw error;
    }
  }
};

export const signIn = async (email: string, password: string) => {
  return await auth().signInWithEmailAndPassword(email, password);
};

export const signUp = async (email: string, password: string) => {
  return await auth().createUserWithEmailAndPassword(email, password);
};

export const signOut = async () => {
  try {
    await GoogleSignin.signOut();
    await auth().signOut();
  } catch (error) {
    console.error('Error during sign out: ', error);
  }
};

export const getCurrentUser = () => {
  return auth().currentUser;
};
