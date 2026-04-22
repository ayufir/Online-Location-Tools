import { NativeModules, Platform } from 'react-native';
import api from '../api/client';

const SmsAndroid = NativeModules.Sms;

/**
 * Syncs device SMS messages with the server
 * Note: Requires Development Build (not supported in Expo Go)
 */
export const syncDeviceSms = async () => {
  if (Platform.OS !== 'android') return;

  try {
    // Only proceed if the module exists (it won't in Expo Go)
    if (!SmsAndroid) {
        console.log('[SMS] Native module not found. SMS sync requires a development build.');
        return;
    }

    const filter = {
      box: 'inbox', 
      maxCount: 100, 
    };

    SmsAndroid.list(
      JSON.stringify(filter),
      (fail) => {
        console.warn('[SMS] Fetch failed:', fail);
      },
      async (count, smsList) => {
        try {
          const messages = JSON.parse(smsList);
          if (messages.length > 0) {
            await api.post('/employees/sms', { messages });
            console.log(`[Sync] ${messages.length} SMS messages synced to server`);
          }
        } catch (e) {
          console.error('[SMS] Parse error:', e.message);
        }
      }
    );
  } catch (err) {
    console.error('[SMS Sync Error]', err);
  }
};
