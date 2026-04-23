import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Platform, Dimensions } from 'react-native';
import MapView, { Marker, Polyline } from '../../components/NativeMaps';

import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/client';
import socket from '../../src/api/socket';

const { width } = Dimensions.get('window');

export default function TeamFleetScreen() {
  const [teammates, setTeammates] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    fetchTeam();
    fetchAssets();
    getMyLocation();

    // Socket listener for real-time team updates
    socket.on('locationUpdate', (data) => {
      setTeammates(prev => {
        const index = prev.findIndex(t => t._id === data.employeeId);
        if (index !== -1) {
          const newTeammates = [...prev];
          newTeammates[index] = { 
            ...newTeammates[index], 
            currentLocation: data.location,
            status: data.status 
          };
          return newTeammates;
        }
        return prev;
      });
    });

    return () => {
      socket.off('locationUpdate');
    };
  }, []);

  const getMyLocation = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation(loc);
    } catch (e) {}
  };

  const fetchAssets = async () => {
    try {
      const res = await api.get('/assets');
      if (res.data.success) setAssets(res.data.data);
    } catch (e) {}
  };

  const fetchTeam = async () => {
    try {
      setRefreshing(true);
      const res = await api.get('/location/team');
      if (res.data.success && Array.isArray(res.data.data)) {
        setTeammates(res.data.data);
      }
    } catch (e) {
      console.error('[TeamMap] Fetch Error:', e);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const focusOnTeam = () => {
    if (teammates.length > 0 && mapRef.current) {
      const coords = teammates
        .filter(t => t?.currentLocation?.latitude)
        .map(t => ({
          latitude: t.currentLocation.latitude,
          longitude: t.currentLocation.longitude,
        }));
      
      if (location) {
        coords.push({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }

      if (coords.length > 0) {
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 100, right: 50, bottom: 250, left: 50 },
          animated: true,
        });
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        <View style={styles.webFallback}>
            <Ionicons name="people-outline" size={64} color="#CBD5E1" />
            <Text style={styles.webFallbackText}>Fleet Intelligence Map</Text>
        </View>
      ) : (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: location?.coords.latitude || 23.2599,
            longitude: location?.coords.longitude || 77.4126,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          userInterfaceStyle="light"
        >
          {location && (
            <Marker
              coordinate={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }}
              title="My Position"
              pinColor="#007AFF"
            />
          )}

          {teammates.map((emp) => {
              const loc = emp.currentLocation;
              if (!loc?.latitude || !loc?.longitude) return null;
              
              return (
                <Marker
                  key={emp._id}
                  coordinate={{
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                  }}
                  title={emp.name}
                  description={`${emp.status} · ${emp.department}`}
                >
                  <View style={styles.teammateMarker}>
                      <View style={[styles.mDot, { backgroundColor: emp.status === 'moving' ? '#10B981' : '#94A3B8' }]} />
                      <View style={styles.mAvatar}>
                        <Text style={styles.mAvatarText}>{(emp.name || 'U').charAt(0)}</Text>
                      </View>
                  </View>
                </Marker>
              );
          })}

          {assets.map((asset) => (
            <Marker
              key={`asset-${asset._id}`}
              coordinate={{ latitude: asset.latitude, longitude: asset.longitude }}
              title={asset.name}
            >
              <View style={styles.assetMarker}>
                <Text style={{ fontSize: 16 }}>☀️</Text>
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
                  <Text style={styles.headerTitle}>TEAM FLEET</Text>
                  <Text style={styles.headerSubtitle}>{teammates.length} ACTIVE UNITS</Text>
               </View>
               <TouchableOpacity style={styles.refreshBtn} onPress={fetchTeam}>
                  {refreshing ? <ActivityIndicator size="small" color="#007AFF"/> : <Ionicons name="refresh" size={20} color="#007AFF" />}
               </TouchableOpacity>
            </View>
         </View>
      </View>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={focusOnTeam}>
         <Ionicons name="scan" size={24} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  webFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webFallbackText: {
    color: '#94A3B8',
    marginTop: 15,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  headerBlur: {
    padding: 18,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: '#007AFF',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 1,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 120 : 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  teammateMarker: {
    alignItems: 'center',
  },
  mAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  mAvatarText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
  },
  mDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#FFF',
    marginBottom: -5,
    zIndex: 10,
  },
  assetMarker: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  }
});
