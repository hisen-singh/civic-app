import { useState, useEffect } from "react";
import { remoteConfig } from "../config/firebaseConfig";
import { fetchAndActivate, getBoolean } from "firebase/remote-config";

export const useFeatureFlags = () => {
  const [flags, setFlags] = useState({
    admin_dashboard_enabled: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFlags = async () => {
      try {
        // In dev, you might want remoteConfig.settings.minimumFetchIntervalMillis = 0;
        // That is configured in firebaseConfig.js
        await fetchAndActivate(remoteConfig);

        setFlags({
          admin_dashboard_enabled: getBoolean(
            remoteConfig,
            "admin_dashboard_enabled",
          ),
        });
      } catch (error) {
        console.error("[RemoteConfig] Failed to fetch flags:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFlags();
  }, []);

  return { flags, loading };
};
