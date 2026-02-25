/** @type {import('@expo/config').ConfigContext} */
module.exports = ({ config }) => {
    return {
        ...config,
        ios: {
            ...config.ios,
            googleServicesFile:
                process.env.GOOGLE_SERVICES_INFO_PLIST ?? './GoogleService-Info.plist',
            config: {
                googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY_IOS,
            },
        },
        android: {
            ...config.android,
            googleServicesFile:
                process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
            config: {
                googleMaps: {
                    apiKey: process.env.GOOGLE_MAPS_API_KEY_ANDROID,
                },
            },
        },
    };
};
