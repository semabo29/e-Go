module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const androidAdmobAppId =
    process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID?.trim() ||
    'ca-app-pub-3940256099942544~3347511713';
  const iosAdmobAppId =
    process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID?.trim() ||
    'ca-app-pub-3940256099942544~1458002511';

  const plugins = [...(config.plugins ?? [])];
  const hasAdmobPlugin = plugins.some(
    (entry) =>
      entry === 'react-native-google-mobile-ads' ||
      (Array.isArray(entry) && entry[0] === 'react-native-google-mobile-ads')
  );
  if (!hasAdmobPlugin) {
    plugins.push([
      'react-native-google-mobile-ads',
      {
        androidAppId: androidAdmobAppId,
        iosAppId: iosAdmobAppId,
      },
    ]);
  }

  return {
    ...config,
    plugins,
    ios: {
      ...config.ios,
      config: {
        ...config.ios?.config,
        googleMapsApiKey,
      },
    },
    android: {
      ...config.android,
      // En desarrollo el backend suele ser http://IP_DEL_PC:3000; sin esto Android 9+ bloquea HTTP.
      usesCleartextTraffic: true,
      config: {
        ...config.android?.config,
        googleMaps: {
          ...config.android?.config?.googleMaps,
          apiKey: googleMapsApiKey,
        },
      },
    },
  };
};