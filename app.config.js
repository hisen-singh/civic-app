export default ({ config }) => {
  const existingPlugins = config.plugins || [];
  const plugins = existingPlugins.includes('expo-mail-composer')
    ? existingPlugins
    : [...existingPlugins, 'expo-mail-composer'];

  return {
    ...config,
    plugins,
    android: {
      ...config.android,
      googleServicesFile:
        process.env.GOOGLE_SERVICES_FILE ||
        config.android?.googleServicesFile ||
        './google-services.json',
      config: {
        ...config.android?.config,
        googleMaps: {
          apiKey:
            process.env.EXPO_PUBLIC_MAPS_API_KEY ||
            config.android?.config?.googleMaps?.apiKey,
        },
      },
    },
  };
};
