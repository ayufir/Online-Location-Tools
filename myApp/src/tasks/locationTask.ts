import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';

// Important: Task names must match between registration and definition
export const LOCATION_TASK_NAME = 'background-location-task';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('[Background Task] Error:', error.message);
    return;
  }

  if (data) {
    const { locations } = data as any;
    if (locations && locations.length > 0) {
      const location = locations[0];
      const { latitude, longitude, accuracy, speed, heading, altitude } = location.coords;

      try {
        // Force re-fetch token from storage to ensure we have the latest
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          console.warn('[Background Task] Sync skipped: No token found');
          return;
        }

        // Fetch battery level
        const batteryData = await Battery.getBatteryLevelAsync();
        const batteryLevel = Math.round(batteryData * 100);

        // REVERSE GEOCODE: Get actual address for admin
        let address = "Unknown Location";
        try {
          const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (geo && geo.length > 0) {
            const place = geo[0];
            address = `${place.name || place.street || ''}, ${place.city || place.region || ''}`.trim().replace(/^,/, '');
          }
        } catch (geoErr) {
          console.warn('[Background Task] Geocode failed');
        }

        // Use core api client
        await api.post('location/update', {
          latitude,
          longitude,
          accuracy,
          speed,
          heading,
          altitude,
          batteryLevel,
          address,
          timestamp: new Date(location.timestamp).toISOString(),
        });

        // SUCCESS: Dashboard will now show the marker moving
      } catch (err: any) {
        const status = err.response?.status;
        const msg = err.response?.data?.message || err.message;
        
        // If user is deleted or token is invalid, KILL the background task to stop spam
        if (status === 401 || status === 403) {
          console.warn('[Background Task] 🛑 Session invalid. Shutting down tracking task.');
          try {
            await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
          } catch (stopErr) {
            // Might already be stopped
          }
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('user');
          await AsyncStorage.removeItem('userRole');
        } else {
          console.error(`[Background Task] 🚨 SYNC ERROR ${status || 'NET'}:`, msg);
        }
      }
    }
  }
});

/**
 * Register the task to start background tracking
 */
export const startBackgroundTracking = async () => {
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') return false;

  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
  if (bgStatus !== 'granted') return false;

  const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  if (!isRegistered) {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Highest,
      timeInterval: 2000, // FAST: 2 seconds for permanent feel
      distanceInterval: 1, // Every single meter tracked
      foregroundService: {
        notificationTitle: "System Security Active",
        notificationBody: "Fleet monitoring is engaged. Stay within operation zone.",
        notificationColor: "#FFB800",
      },
      pausesUpdatesAutomatically: false,
      deferredUpdatesInterval: 1000,
      deferredUpdatesDistance: 1,
    });
    return true;
  }
  return true;
};

/**
 * Stop background tracking
 */
export const stopBackgroundTracking = async () => {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
};
