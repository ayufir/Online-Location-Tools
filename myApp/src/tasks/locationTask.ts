import * as Location from 'expo-location';

// Simplified task for foreground tracking
export const startBackgroundTracking = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return false;
  
  // Just a placeholder now to avoid breaking other imports
  console.log('Background tracking simplified to foreground only.');
  return true;
};

export const stopBackgroundTracking = async () => {
  // No-op
};
