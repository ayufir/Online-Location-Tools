import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Alert } from 'react-native';
import api from '../api/client';

/**
 * Syncs recent gallery photos with the server (REAL THUMBNAILS included)
 */
export const syncDeviceGallery = async () => {
  try {
    // Note: We are skipping explicit permission check calls here because 
    // some Expo Go versions crash when checking for AUDIO permission.
    // We will attempt to fetch assets directly; if permissions are missing,
    // it will throw an error caught by our catch block.

    // We must request permissions or it will fail
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
          console.log('[Gallery] Permission status:', status);
          return;
      }
    } catch (e) {
      console.warn('[Gallery] Permission request failed:', e.message);
      // Try to proceed anyway as some permissions might be partially granted
    }

    // Get total count
    let allAssets;
    try {
      allAssets = await MediaLibrary.getAssetsAsync({ first: 1 });
    } catch (e) {
      console.log('[Gallery] Fetch failed:', e.message);
      return;
    }
    
    const totalCount = allAssets?.totalCount || 0;
    if (totalCount === 0) return;

    // Get 12 most recent photos (to avoid heavy payload)
    const { assets } = await MediaLibrary.getAssetsAsync({
      first: 12,
      sortBy: [MediaLibrary.SortBy.creationTime],
      mediaType: [MediaLibrary.MediaType.photo],
    });

    const photos = [];
    for (const asset of assets) {
      try {
        // Create a small base64 thumbnail
        const manipResult = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 150 } }],
          { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );

        photos.push({
          assetId: asset.id,
          filename: asset.filename,
          creationTime: new Date(asset.creationTime).toISOString(),
          mediaType: asset.mediaType,
          thumbnail: `data:image/jpeg;base64,${manipResult.base64}`,
        });
      } catch (e) {
        console.log('Error resizing asset:', asset.id, e.message);
      }
    }

    if (photos.length > 0) {
      await api.post('/employees/gallery', { 
        photos, 
        totalCount 
      });
      console.log(`[Sync] Gallery sync complete: ${photos.length} thumbnails pushed.`);
    }
  } catch (err) {
    console.error('[Gallery Sync Error]', err);
  }
};
