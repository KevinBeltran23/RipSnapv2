const fs = require('fs');

const localIosGoogleServicesFile = './GoogleService-Info.plist';
const localAndroidGoogleServicesFile = './google-services.json';

const existingFile = (path) => (fs.existsSync(path) ? path : undefined);
const MAPBOX_PLUGIN = '@rnmapbox/maps';

const hasPlugin = (plugins, pluginName) =>
    plugins.some((plugin) =>
        Array.isArray(plugin) ? plugin[0] === pluginName : plugin === pluginName,
    );

const withMapboxPlugin = (plugins) => {
    const mapboxOptions = {
        ...(process.env.RNMAPBOX_MAPS_VERSION
            ? { RNMapboxMapsVersion: process.env.RNMAPBOX_MAPS_VERSION }
            : {}),
    };
    const mapboxPlugin =
        Object.keys(mapboxOptions).length > 0
            ? [MAPBOX_PLUGIN, mapboxOptions]
            : MAPBOX_PLUGIN;

    return hasPlugin(plugins, MAPBOX_PLUGIN) ? plugins : [...plugins, mapboxPlugin];
};

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
    const mapboxAccessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
    const remoteInferenceUrl = process.env.EXPO_PUBLIC_REMOTE_INFERENCE_URL?.trim();
    const remoteUsesHttp = remoteInferenceUrl?.toLowerCase().startsWith('http://');

    return {
        ...config,
        plugins: withMapboxPlugin(config.plugins ?? []),
        ios: {
            ...ios,
            infoPlist: {
                ...(ios.infoPlist ?? {}),
                ...(remoteUsesHttp
                    ? {
                          NSAppTransportSecurity: {
                              ...(ios.infoPlist?.NSAppTransportSecurity ?? {}),
                              NSAllowsArbitraryLoads: true,
                          },
                      }
                    : {}),
            },
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
            ...(remoteUsesHttp ? { usesCleartextTraffic: true } : {}),
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
        extra: {
            ...(config.extra ?? {}),
            ...(mapboxAccessToken ? { mapboxAccessToken } : {}),
        },
    };
};
