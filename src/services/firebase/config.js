import { firebase } from '@react-native-firebase/app';
import '@react-native-firebase/auth';
import '@react-native-firebase/firestore';
import '@react-native-firebase/storage';

// Initialize Firebase if it hasn't been initialized yet
if (!firebase.apps.length) {
  // Firebase will use the google-services.json file for configuration
  firebase.initializeApp({});
}

export default firebase;
