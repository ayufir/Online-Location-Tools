import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Platform, Dimensions, Alert } from 'react-native';
// Dynamically import Maps only for Native to avoid web bundling errors
let MapView: any = View;
let Marker: any = View;
if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default || Maps;
    Marker = Maps.Marker;
  } catch (e) {
    console.warn('Maps not available');
  }
}
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/client';

const { width } = Dimensions.get('window');

export default function SolarAssetsScreen() {
  const [assets, setAssets] = useState<any[]>([]);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    fetchAssets();
    getMyLocation();
  }, []);

  const getMyLocation = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation(loc);
    } catch (e) {}
  };

  const fetchAssets = async () => {
    try {
      setRefreshing(true);
      const res = await api.get('/assets');
      if (res.data.success) {
        setAssets(res.data.data);
      }
    } catch (e: any) {
      console.error('[AssetsMap] Fetch Error:', e.message);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const focusAllAssets = () => {
    if (assets.length > 0 && mapRef.current) {
      const coords = assets.map(a => ({
        latitude: a.latitude,
        longitude: a.longitude,
      }));
      
      if (location) {
        coords.push({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }

      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
        animated: true,
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FFB800" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map Backdrop */}
      {Platform.OS === 'web' ? (
        <View style={styles.webFallback}>
            <Ionicons name="sunny-outline" size={64} color="#30363D" />
            <Text style={styles.webFallbackText}>Solar Infrastructure Map</Text>
        </View>
      ) : (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: location?.coords.latitude || 23.2599,
            longitude: location?.coords.longitude || 77.4126,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          }}
          userInterfaceStyle="dark"
        >
          {location && (
            <Marker
              coordinate={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }}
              title="Your Location"
              pinColor="#FFB800"
            />
          )}

          {assets.map((asset) => (
            <Marker
              key={asset._id}
              coordinate={{
                latitude: asset.latitude,
                longitude: asset.longitude,
              }}
              title={asset.name}
              description={`${asset.type} · ${asset.status}`}
            >
               <View style={styles.assetMarker}>
                  <View style={styles.assetOrb}>
                     <Text style={{ fontSize: 18 }}>☀️</Text>
                  </View>
                  <View style={styles.assetLabel}>
                     <Text style={styles.assetText}>{asset.name}</Text>
                  </View>
               </View>
            </Marker>
          ))}
        </MapView>
      )}

      {/* Header Overlay */}
      <View style={styles.headerOverlay}>
         <View style={styles.headerBlur}>
            <View style={styles.headerRow}>
               <View>
                  <Text style={styles.headerTitle}>Solar Grid</Text>
                  <Text style={styles.headerSubtitle}>{assets.length} panels detected in your sector</Text>
               </View>
               <TouchableOpacity style={styles.refreshBtn} onPress={fetchAssets}>
                  {refreshing ? <ActivityIndicator size="small" color="#FFB800"/> : <Ionicons name="refresh-outline" size={20} color="#F0F6FC" />}
               </TouchableOpacity>
            </View>
         </View>
      </View>

      {/* Floating Action Buttons */}
      <View style={styles.fabContainer}>
         <TouchableOpacity style={styles.fab} onPress={focusAllAssets}>
            <Ionicons name="layers-outline" size={24} color="#FFF" />
         </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#010409',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#010409',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  webFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#010409',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webFallbackText: {
    color: '#30363D',
    marginTop: 15,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 15,
    right: 15,
    zIndex: 10,
  },
  headerBlur: {
    padding: 20,
    borderRadius: 28,
    backgroundColor: 'rgba(1, 4, 9, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.15)',
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#F0F6FC',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: '#FFB800',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  refreshBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 184, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.1)',
  },
  fabContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 130 : 110,
    right: 15,
    zIndex: 10,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 22,
    backgroundColor: '#FFB800',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  assetMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetOrb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#010409',
    borderWidth: 2,
    borderColor: '#FFB800',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  assetLabel: {
    backgroundColor: 'rgba(1, 4, 9, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.2)',
  },
  assetText: {
    color: '#F0F6FC',
    fontSize: 10,
    fontWeight: '800',
  },
});
