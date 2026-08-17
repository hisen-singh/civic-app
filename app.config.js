export default ({ config }) => {
  const APP_ENV = process.env.APP_ENV || "development";
  let appName = config.name || "Civic";
  let identifier = "com.civic.app";

  if (APP_ENV === "development") {
    appName = "Civic Dev";
    identifier = "com.civic.app.dev";
  } else if (APP_ENV === "staging") {
    appName = "Civic Staging";
    identifier = "com.civic.app.staging";
  }

  return {
    ...config,
    name: appName,
    ios: {
      ...config.ios,
      bundleIdentifier: identifier,
    },
    android: {
      ...config.android,
      package: identifier,
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
