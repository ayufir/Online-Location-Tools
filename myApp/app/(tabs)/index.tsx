import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform, Dimensions } from 'react-native';
import * as Location from 'expo-location';

// Dynamically import Maps only for Native to avoid web bundling errors
let MapView: any = View;
let Marker: any = View;
if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
  } catch (e) {
    console.warn('Maps not available');
  }
}
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { startBackgroundTracking, stopBackgroundTracking, LOCATION_TASK_NAME } from '../../src/tasks/locationTask';
import * as TaskManager from 'expo-task-manager';
import { Ionicons } from '@expo/vector-icons';
import socket from '../../src/api/socket';
import api from '../../src/api/client';

const { width } = Dimensions.get('window');

export default function MyTrackerScreen() {
  const [user, setUser] = useState<any>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [syncStatus, setSyncStatus] = useState<any>({ ok: true, msg: 'Active' });
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    loadData();
    checkTrackingStatus();
    
    let foregroundSubscription: Location.LocationSubscription | null = null;

    const startForegroundUpdate = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      foregroundSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced, // High reliability indoors
          distanceInterval: 5, // Balanced update frequency
        },
        (loc) => {
          setLocation(loc);
          
          // Live Socket Push for instant movement on dashboard
          if (socket.connected) {
             socket.emit('employee:location:push', {
               latitude: loc.coords.latitude,
               longitude: loc.coords.longitude,
               speed: loc.coords.speed,
               accuracy: loc.coords.accuracy,
               heading: loc.coords.heading,
               batteryLevel: 100, // Placeholder or fetch actual
               timestamp: new Date().toISOString()
             });
          }
        }
      );
    };

    startForegroundUpdate();

    return () => {
      if (foregroundSubscription) foregroundSubscription.remove();
    };
  }, []);

  const loadData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/login');
        return;
      }
      const userData = await AsyncStorage.getItem('user');
      if (userData) setUser(JSON.parse(userData));

      // ─── Fetch latest profile from API to sync Target Waypoints ──────────
      const res = await api.get('/auth/me');
      if (res.data.success) {
        const freshUser = res.data.data;
        setUser(freshUser);
        await AsyncStorage.setItem('user', JSON.stringify(freshUser));
        console.log('[Sync] Profile Refreshed:', freshUser.targetLocation?.label || 'No Target');
      }
      
      // Connect socket after loading session
      await connectSocketGracefully();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // ─── Socket Events ────────────────────────────────────────────────────────
    socket.on('connect', async () => {
      console.log('[Socket] Connected to backend');
      const token = await AsyncStorage.getItem('token');
      if (token) {
        socket.emit('employee:join', { token });
      }
    });

    socket.on('trackingCommand', async (data) => {
      console.log('[Socket] Tracking Command Received:', data.command);
      if (data.command === 'START') {
        const started = await startBackgroundTracking();
        if (started) {
          setIsTracking(true);
          Alert.alert('Tracking Active', 'Administrator has remotely activated tracking.');
        }
      } else if (data.command === 'STOP') {
        await stopBackgroundTracking();
        setIsTracking(false);
        Alert.alert('Tracking Paused', 'Administrator has remotely paused tracking.');
      }
    });

    socket.on('target:update', (data) => {
      console.log('[Socket] Waypoint Update:', data.targetLocation?.label || 'Cleared');
      if (data.employeeId === user?._id || !user) {
        setUser((prev: any) => ({ ...prev, targetLocation: data.targetLocation }));
        if (data.targetLocation?.latitude) {
          Alert.alert('New Objective', `Admin has assigned a new destination: ${data.targetLocation.label}`);
        }
      }
    });

    socket.on('error', (err) => {
      console.error('[Socket] Error:', err.message);
    });

    return () => {
      socket.off('connect');
      socket.off('trackingCommand');
      socket.off('target:update');
      socket.off('error');
    };
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const connectSocketGracefully = async () => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      if (socket.connected) socket.disconnect();
      socket.auth = { token };
      socket.connect();
      
      // ─── Instant Fleet Presence ───────────────────────────────────────────
      // Wait 500ms to ensure AsyncStorage / User State is locked
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Immediately try to get a one-time balanced fix and push it
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setLocation(loc);
          socket.emit('employee:location:push', {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            speed: loc.coords.speed,
            accuracy: loc.coords.accuracy,
            heading: loc.coords.heading,
            batteryLevel: 100,
            timestamp: new Date().toISOString()
          });
          console.log('[Sync] Instant location pulse sent');
          
          // AUTO-START background tracking if not already running
          const registered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
          if (!registered) {
            const started = await startBackgroundTracking();
            if (started) {
              setIsTracking(true);
              api.put(`/employees/${user?._id}/tracking`, { enable: true }).catch(() => {});
              console.log('[Auto] Background tracking activated');
            }
          }
        }
      } catch (e) {
        console.warn('[Sync] Instant pulse failed:', e);
      }
    }
  };

  const checkTrackingStatus = async () => {
    const registered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    setIsTracking(registered);
  };

  const handleToggleTracking = async () => {
    if (isTracking) {
      await stopBackgroundTracking();
      setIsTracking(false);
      try { await api.put(`/employees/${user?._id}/tracking`, { enable: false }); } catch(e) {}
    } else {
      // Logic for background permission request
      const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
      if (bgStatus !== 'granted') {
        Alert.alert(
          'Background Access',
          'Fleet tracking requires "Allow Always" location access to monitor your position during duty hours.',
          [
            { 
              text: 'Setup Permission', 
              onPress: async () => {
                const { status: newBg } = await Location.requestBackgroundPermissionsAsync();
                if (newBg === 'granted') startTracking();
              }
            },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      } else {
        startTracking();
      }
    }
  };

  const startTracking = async () => {
    const started = await startBackgroundTracking();
    if (started) {
      setIsTracking(true);
      try { await api.put(`/employees/${user?._id}/tracking`, { enable: true }); } catch(e) {}
    }
  };

  const handleLogout = async () => {
    await stopBackgroundTracking();
    await AsyncStorage.clear();
    router.replace('/login');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map Backdrop */}
      {Platform.OS === 'web' ? (
        <View style={styles.webFallback}>
            <Ionicons name="map-outline" size={64} color="#30363D" />
            <Text style={styles.webFallbackText}>Native Tracking Interface</Text>
        </View>
      ) : (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: location?.coords.latitude || 23.2599,
            longitude: location?.coords.longitude || 77.4126,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
          userInterfaceStyle="dark"
        >
          {location && (
            <Marker
              coordinate={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }}
            >
              <View style={styles.markerContainer}>
                 <View style={[styles.markerRing, isTracking && styles.markerRingPulse]} />
                 <View style={styles.markerPoint} />
              </View>
            </Marker>
          )}

          {user?.targetLocation?.latitude && (
            <Marker
              coordinate={{
                latitude: user.targetLocation.latitude,
                longitude: user.targetLocation.longitude,
              }}
              title={user.targetLocation.label}
              pinColor="#10B981"
            />
          )}
        </MapView>
      )}

      {/* Top Header */}
      <View style={styles.headerSpacer} />
      <View style={styles.topNav}>
        <View style={styles.topNavBlur}>
          <View style={styles.userRow}>
             <View style={styles.avatar}>
               <Text style={styles.avatarText}>{user?.name?.charAt(0)}</Text>
               <View style={[styles.statusDot, { backgroundColor: isTracking ? '#10B981' : '#8B949E' }]} />
             </View>
             <View>
               <Text style={styles.greeting}>Field Unit</Text>
               <Text style={styles.name}>{user?.name || 'Employee'}</Text>
             </View>
          </View>
          {user?.targetLocation?.latitude && (
            <View style={styles.targetBadge}>
               <Ionicons name="flag" size={12} color="#10B981" />
               <Text style={styles.targetBadgeText}>TASK ACTIVE</Text>
            </View>
          )}
          <TouchableOpacity style={styles.iconBtn} onPress={handleLogout}>
             <Ionicons name="log-out-outline" size={20} color="#F0F6FC" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Target Destination Card (Exclusive) */}
      {user?.targetLocation?.latitude && location && (
        <View style={styles.targetCard}>
           <View style={styles.targetCardInner}>
              <View style={styles.targetIconCircle}>
                 <Ionicons name="navigate" size={24} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                 <Text style={styles.targetLabel}>{user.targetLocation.label}</Text>
                 <Text style={styles.targetDist}>
                    {calculateDistance(
                      location.coords.latitude, 
                      location.coords.longitude, 
                      user.targetLocation.latitude, 
                      user.targetLocation.longitude
                    ).toFixed(2)} km away
                 </Text>
              </View>
              <TouchableOpacity 
                style={styles.targetAction}
                onPress={() => {
                  const url = `https://www.google.com/maps/dir/?api=1&destination=${user.targetLocation.latitude},${user.targetLocation.longitude}`;
                  // In a real app we'd use Linking.openURL(url)
                  Alert.alert('Navigation', 'Redirecting to Google Maps... (Simulated)');
                }}
              >
                 <Ionicons name="chevron-forward" size={20} color="#8B949E" />
              </TouchableOpacity>
           </View>
        </View>
      )}

      {/* Bottom Control Panel */}
      <View style={styles.controlPanel}>
        <View style={styles.controlBlur}>
          <View style={styles.handle} />
          
          <View style={styles.statusRow}>
            <View>
               <Text style={styles.controlTitle}>{isTracking ? 'Active Patrol' : 'Unit Offline'}</Text>
               <Text style={styles.controlSubtitle}>
                 {isTracking ? 'Your location is being synced live' : 'Tracking is suspended'}
               </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: isTracking ? 'rgba(16, 185, 129, 0.15)' : 'rgba(139, 148, 158, 0.1)' }]}>
               <Text style={[styles.badgeText, { color: isTracking ? '#10B981' : '#8B949E' }]}>
                 {isTracking ? 'ON DUTY' : 'OFF DUTY'}
               </Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
               <Ionicons name="battery-charging-outline" size={20} color="#F59E0B" />
               <Text style={styles.statLabel}>SYNC</Text>
               <Text style={styles.statValue}>ONLINE</Text>
            </View>
            <View style={styles.statBox}>
               <Ionicons name="navigate-outline" size={20} color="#60A5FA" />
               <Text style={styles.statLabel}>ACCURACY</Text>
               <Text style={styles.statValue}>{location?.coords.accuracy ? location.coords.accuracy.toFixed(1) + 'm' : '--'}</Text>
            </View>
            <View style={styles.statBox}>
               <Ionicons name="time-outline" size={20} color="#F472B6" />
               <Text style={styles.statLabel}>UPTIME</Text>
               <Text style={styles.statValue}>{isTracking ? 'Live' : 'Paused'}</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.mainBtn, isTracking ? styles.btnDanger : styles.btnSuccess]} 
            onPress={handleToggleTracking}
            activeOpacity={0.8}
          >
             <Ionicons name={isTracking ? "stop-circle-outline" : "play-circle-outline"} size={24} color="#FFF" />
             <Text style={styles.mainBtnText}>{isTracking ? 'END TRACKING' : 'START TRACKING'}</Text>
          </TouchableOpacity>
        </View>
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
    color: '#8B949E',
    marginTop: 15,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerSpacer: {
    height: Platform.OS === 'ios' ? 60 : 40,
  },
  topNav: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 15,
    right: 15,
    zIndex: 10,
  },
  topNavBlur: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 24,
    backgroundColor: 'rgba(1, 4, 9, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.15)',
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#FFB800',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#000',
    fontSize: 20,
    fontWeight: '900',
  },
  statusDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: '#010409',
  },
  greeting: {
    color: '#8B949E',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  name: {
    color: '#F0F6FC',
    fontSize: 17,
    fontWeight: '800',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(240, 246, 252, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(240, 246, 252, 0.1)',
  },
  controlPanel: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 120 : 100,
    left: 15,
    right: 15,
  },
  controlBlur: {
    padding: 22,
    borderRadius: 32,
    backgroundColor: 'rgba(1, 4, 9, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.1)',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(139, 148, 158, 0.15)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 26,
  },
  controlTitle: {
    color: '#F0F6FC',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  controlSubtitle: {
    color: '#8B949E',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 26,
  },
  statBox: {
    width: (width - 80) / 3,
    padding: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(240, 246, 252, 0.03)',
  },
  statLabel: {
    color: '#8B949E',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 10,
    letterSpacing: 1.5,
  },
  statValue: {
    color: '#F0F6FC',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  mainBtn: {
    flexDirection: 'row',
    height: 64,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  btnSuccess: {
    backgroundColor: '#FFB800',
  },
  btnDanger: {
    backgroundColor: '#EF4444',
  },
  mainBtnText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '900',
    marginLeft: 12,
    letterSpacing: 1,
  },
  markerContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 184, 0, 0.2)',
    position: 'absolute',
  },
  markerRingPulse: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  markerPoint: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFB800',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  targetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    marginRight: 10,
  },
  targetBadgeText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '900',
    marginLeft: 4,
    letterSpacing: 1,
  },
  targetCard: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 140 : 120,
    left: 15,
    right: 15,
    zIndex: 5,
  },
  targetCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(1, 4, 9, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  targetIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  targetLabel: {
    color: '#F0F6FC',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  targetDist: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  targetAction: {
    padding: 8,
  },
});
