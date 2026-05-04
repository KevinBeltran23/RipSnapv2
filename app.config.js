const fs = require('fs');

const localIosGoogleServicesFile = './GoogleService-Info.plist';
const localAndroidGoogleServicesFile = './google-services.json';

const existingFile = (path) => (fs.existsSync(path) ? path : undefined);

/** @type {import('@expo/config').ConfigContext} */
module.exports = ({ config }) => {
    const { googleServicesFile: _iosGoogleServicesFile, config: iosConfig, ...ios } =
        config.ios ?? {};
    const {
        googleServicesFile: _androidGoogleServicesFile,
        config: androidConfig,
        ...android
    } = config.android ?? {};

    const googleMapsApiKeyIos = process.env.GOOGLE_MAPS_API_KEY_IOS;
    const googleMapsApiKeyAndroid = process.env.GOOGLE_MAPS_API_KEY_ANDROID;

    return {
        ...config,
        ios: {
            ...ios,
            googleServicesFile:
                process.env.GOOGLE_SERVICES_INFO_PLIST ??
                existingFile(localIosGoogleServicesFile),
            config: {
                ...iosConfig,
                ...(googleMapsApiKeyIos ? { googleMapsApiKey: googleMapsApiKeyIos } : {}),
            },
        },
        android: {
            ...android,
            googleServicesFile:
                process.env.GOOGLE_SERVICES_JSON ??
                existingFile(localAndroidGoogleServicesFile),
            config: {
                ...androidConfig,
                googleMaps: {
                    ...(androidConfig?.googleMaps ?? {}),
                    ...(googleMapsApiKeyAndroid ? { apiKey: googleMapsApiKeyAndroid } : {}),
                },
            },
        },
    };
};
