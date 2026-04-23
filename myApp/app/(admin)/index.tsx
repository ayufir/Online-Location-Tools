import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Platform, Dimensions, Alert, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

import MapView, { Marker, Polyline } from '../../components/NativeMaps';


const { width } = Dimensions.get('window');

export default function FleetCommandMap() {
  const [units, setUnits] = useState<any[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSatellite, setIsSatellite] = useState(false);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    fetchFleet();
    const interval = setInterval(fetchFleet, 10000); 

    const setupSocket = async () => {
      try {
        const socket = require('../../src/api/socket').default;
        socket.on('locationUpdate', (data: any) => {
          if (!data || !data.employeeId) return;
          setUnits(prev => prev.map(u => u._id === data.employeeId ? { 
            ...u, 
            currentLocation: data.location || data.currentLocation, 
            status: data.status 
          } : u));
        });
      } catch (e) {}
    };
    setupSocket();

    return () => {
      clearInterval(interval);
      try {
        const socket = require('../../src/api/socket').default;
        socket.off('locationUpdate');
      } catch (e) {}
    };
  }, []);

  const fetchFleet = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }

    try {
      setRefreshing(true);
      const res = await api.get('/location/live');
      if (res.data.success && Array.isArray(res.data.data)) {
        setUnits(res.data.data);
      }
    } catch (e: any) {
      console.error('[FleetMap] Sync Error:', e);
      if (e.response?.status === 401 || e.response?.status === 403) {
        router.replace('/login');
      }
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const setMissionTarget = async (latitude: number, longitude: number) => {
    if (!selectedUnitId) {
      Alert.alert('Selection Required', 'Tap a unit marker or select from the fleet list to designate objectives.');
      return;
    }

    const unit = units.find(u => u._id === selectedUnitId);
    if (!unit) return;

    Alert.alert(
      'Vanguard Command',
      `Transmit new mission objective to ${unit.name}?`,
      [
        { text: 'Aborted', style: 'cancel' },
        { 
          text: 'Transmit Now', 
          onPress: async () => {
            try {
              const label = `OBJ-${Math.floor(Math.random() * 9000) + 1000}`;
              await api.put(`/location/target/${selectedUnitId}`, {
                latitude,
                longitude,
                label
              });
              fetchFleet();
            } catch (err) {
              Alert.alert('Transmission Failed', 'Signal lost. Check network and try again.');
            }
          }
        }
      ]
    );
  };

  const focusUnit = (id: string, location: any) => {
    if (!location?.latitude || !location?.longitude) return;
    
    setSelectedUnitId(id);
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 800);
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
      {Platform.OS === 'web' ? (
        <View style={styles.webFallback}>
            <Ionicons name="map-outline" size={64} color="#30363D" />
            <Text style={styles.webFallbackText}>Map Intelligence (Native Only)</Text>
        </View>
      ) : (
        <MapView
          ref={mapRef}
          style={styles.map}
          onLongPress={(e: any) => {
             const coord = e?.nativeEvent?.coordinate;
             if (coord) setMissionTarget(coord.latitude, coord.longitude);
          }}
          initialRegion={{
            latitude: 23.2599,
            longitude: 77.4126,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          }}
          mapType={isSatellite ? 'satellite' : 'standard'}
          userInterfaceStyle="dark"
        >
          {units.filter(u => (u?.currentLocation?.latitude || u?.location?.latitude)).map((unit) => {
            const loc = unit.currentLocation || unit.location;
            if (!loc?.latitude) return null;
            
            return (
              <React.Fragment key={unit._id}>
                <Marker
                  coordinate={{
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                  }}
                  onPress={() => focusUnit(unit._id, loc)}
                >
                   <View style={styles.unitMarker}>
                      <View style={[styles.statusPulse, { backgroundColor: unit.status === 'moving' ? '#10B981' : '#F59E0B' }]} />
                      <View style={[styles.avatar, selectedUnitId === unit._id && styles.avatarActive]}>
                         <Text style={styles.avatarText}>{unit.name.charAt(0)}</Text>
                      </View>
                   </View>
                </Marker>

                {unit.targetLocation?.latitude && unit.targetLocation?.longitude && (
                  <React.Fragment>
                    <Marker
                      coordinate={{
                        latitude: unit.targetLocation.latitude,
                        longitude: unit.targetLocation.longitude,
                      }}
                      anchor={{ x: 0.5, y: 0.5 }}
                    >
                       <View style={styles.targetIcon}>
                          <Ionicons name="flag" size={14} color="#10B981" />
                       </View>
                    </Marker>
                    <Polyline
                      coordinates={[
                        { latitude: loc.latitude, longitude: loc.longitude },
                        { latitude: unit.targetLocation.latitude, longitude: unit.targetLocation.longitude }
                      ]}
                      strokeColor="rgba(16, 185, 129, 0.5)"
                      strokeWidth={2}
                      lineDashPattern={[5, 5]}
                    />
                  </React.Fragment>
                )}
              </React.Fragment>
            );
          })}
        </MapView>
      )}

      {/* Strategic Command Bar */}
      <View style={styles.overlayTop}>
         <View style={styles.glassHeader}>
            <View style={styles.topRow}>
               <View>
                  <Text style={styles.brandTitle}>Vanguard Pro</Text>
                  <Text style={styles.brandSubtitle}>STRATEGIC LIVE MAP</Text>
               </View>
               <View style={styles.toolRow}>
                  <TouchableOpacity style={styles.toolBtn} onPress={() => setIsSatellite(!isSatellite)}>
                     <Ionicons name={isSatellite ? "map-outline" : "earth-outline"} size={20} color="#F0F6FC" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.toolBtn} onPress={fetchFleet}>
                     <Ionicons name="sync-outline" size={20} color="#FFB800" />
                  </TouchableOpacity>
               </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fleetRoster}>
               {units.map(u => (
                  <TouchableOpacity 
                    key={u._id} 
                    style={[styles.unitChip, selectedUnitId === u._id && styles.chipActive]}
                    onPress={() => focusUnit(u._id, u.currentLocation || u.location)}
                  >
                     <View style={[styles.chipDot, { backgroundColor: u.status === 'moving' ? '#10B981' : '#F59E0B' }]} />
                     <Text style={[styles.chipText, selectedUnitId === u._id && styles.chipTextActive]}>{u.name.split(' ')[0]}</Text>
                  </TouchableOpacity>
               ))}
            </ScrollView>
         </View>
      </View>

      {/* Mission Execution Feedback */}
      {selectedUnitId && (
        <View style={styles.missionBrief}>
           <View style={styles.mBadge}>
              <Text style={styles.mBadgeText}>MISSION MODE ACTIVE</Text>
           </View>
           <Text style={styles.mDesc}>Long-press map to assign new SIGNAL objective</Text>
           <TouchableOpacity style={styles.mCancel} onPress={() => setSelectedUnitId(null)}>
              <Text style={styles.mCancelText}>ABORT MISSION MODE</Text>
           </TouchableOpacity>
        </View>
      )}
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D1117',
  },
  webFallbackText: {
    color: '#8B949E',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2.5,
    marginTop: 20,
    textTransform: 'uppercase',
  },
  overlayTop: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 15,
    right: 15,
    zIndex: 10,
  },
  glassHeader: {
    backgroundColor: 'rgba(1, 4, 9, 0.95)',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.14)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandTitle: {
    color: '#F0F6FC',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    color: '#FFB800',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 2,
  },
  toolRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toolBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  fleetRoster: {
    marginTop: 18,
  },
  unitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(240, 246, 252, 0.03)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  chipActive: {
    backgroundColor: '#FFB800',
    borderColor: '#FFB800',
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  chipText: {
    color: '#8B949E',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  chipTextActive: {
    color: '#000',
  },
  unitMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPulse: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: '#010409',
    marginBottom: -8,
    zIndex: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#010409',
    borderWidth: 2,
    borderColor: '#FFB800',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  avatarActive: {
    borderColor: '#FFF',
    transform: [{ scale: 1.1 }],
  },
  avatarText: {
    color: '#F0F6FC',
    fontSize: 16,
    fontWeight: '900',
  },
  targetIcon: {
    backgroundColor: 'rgba(1, 4, 9, 0.9)',
    padding: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  missionBrief: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(1, 4, 9, 0.98)',
    padding: 24,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.2)',
    alignItems: 'center',
  },
  mBadge: {
    backgroundColor: 'rgba(255, 184, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  mBadgeText: {
    color: '#FFB800',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  mDesc: {
    color: '#F0F6FC',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
  },
  mCancel: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  mCancelText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
