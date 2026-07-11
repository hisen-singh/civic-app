import 'react-native-gesture-handler';

// --- REMOTE CRASH LOGGING SETUP ---
if (global.ErrorUtils) {
  const oldHandler = global.ErrorUtils.getGlobalHandler();
  global.ErrorUtils.setGlobalHandler(async (error, isFatal) => {
    try {
      const payload = {
        message: error?.message || String(error),
        stack: error?.stack || null,
        isFatal,
        timestamp: new Date().toISOString(),
      };
      await fetch('https://us-central1-civic-d0574.cloudfunctions.net/logAppCrash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      // Avoid infinite loop if logging fails
    }
    if (oldHandler) {
      oldHandler(error, isFatal);
    }
  });
}
// -----------------------------------

import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
