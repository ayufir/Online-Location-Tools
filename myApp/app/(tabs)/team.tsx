import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Platform, Dimensions } from 'react-native';
import MapView, { Marker, Popup } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/client';

const { width } = Dimensions.get('window');

export default function TeamFleetScreen() {
  const [teammates, setTeammates] = useState<any[]>([]);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    fetchTeam();
    getMyLocation();

    // Fetch team every 30 seconds
    const interval = setInterval(fetchTeam, 30000);
    return () => clearInterval(interval);
  }, []);

  const getMyLocation = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation(loc);
    } catch (e) {}
  };

  const fetchTeam = async () => {
    try {
      setRefreshing(true);
      const res = await api.get('/location/team');
      setTeammates(res.data.data);
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
        .filter(t => t.currentLocation?.latitude)
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
          edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
          animated: true,
        });
      }
    }
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
            <Ionicons name="people-circle-outline" size={64} color="#30363D" />
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
          userInterfaceStyle="dark"
        >
          {location && (
            <Marker
              coordinate={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }}
              title="You (Unit 01)"
              pinColor="#F59E0B"
            />
          )}

          {teammates.filter(t => t.currentLocation?.latitude).map((emp) => {
            const target = emp.targetLocation;
            return (
              <React.Fragment key={emp._id}>
                {/* Teammate Marker */}
                <Marker
                  coordinate={{
                    latitude: emp.currentLocation.latitude,
                    longitude: emp.currentLocation.longitude,
                  }}
                  title={emp.name}
                  description={`${emp.status} · ${emp.department}`}
                >
                   <View style={styles.teammateMarker}>
                      <View style={[styles.mDot, { backgroundColor: emp.status === 'moving' ? '#10B981' : '#8B949E' }]} />
                      <View style={styles.mAvatar}>
                        <Text style={styles.mAvatarText}>{emp.name.charAt(0)}</Text>
                      </View>
                   </View>
                </Marker>

                {/* Teammate Target & Path */}
                {target?.latitude && target?.longitude && (
                  <>
                    <Marker
                      coordinate={{
                        latitude: target.latitude,
                        longitude: target.longitude,
                      }}
                      title={`${emp.name}'s Destination`}
                      description={target.label}
                    >
                       <View style={styles.targetMarker}>
                          <Ionicons name="flag" size={24} color="#10B981" />
                       </View>
                    </Marker>
                    <MapView.Polyline
                      coordinates={[
                        { latitude: emp.currentLocation.latitude, longitude: emp.currentLocation.longitude },
                        { latitude: target.latitude, longitude: target.longitude }
                      ]}
                      strokeColor="rgba(16, 185, 129, 0.4)"
                      strokeWidth={2}
                      lineDashPattern={[5, 10]}
                    />
                  </>
                )}
              </React.Fragment>
            );
          })}
        </MapView>
      )}

      {/* Floating Info Overlay */}
      <View style={styles.infoOverlay}>
         <View style={styles.infoBlur}>
            <View style={styles.infoRow}>
               <View>
                  <Text style={styles.infoTitle}>Fleet Logistics</Text>
                  <Text style={styles.infoSubtitle}>{teammates.length} units currently on patrol</Text>
               </View>
               <TouchableOpacity style={styles.refreshBtn} onPress={fetchTeam}>
                  {refreshing ? <ActivityIndicator size="small" color="#F59E0B"/> : <Ionicons name="refresh-outline" size={20} color="#F0F6FC" />}
               </TouchableOpacity>
            </View>
         </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.fabContainer}>
         <TouchableOpacity style={styles.fab} onPress={focusOnTeam}>
            <Ionicons name="scan-outline" size={24} color="#FFF" />
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
  infoOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 15,
    right: 15,
    zIndex: 10,
  },
  infoBlur: {
    padding: 20,
    borderRadius: 28,
    backgroundColor: 'rgba(1, 4, 9, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoTitle: {
    color: '#F0F6FC',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  infoSubtitle: {
    color: '#FFB800',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
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
  teammateMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#010409',
    borderWidth: 2,
    borderColor: '#FFB800',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  mAvatarText: {
    color: '#F0F6FC',
    fontSize: 16,
    fontWeight: '900',
  },
  mDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: '#010409',
    marginBottom: -8,
    zIndex: 10,
  },
  targetMarker: {
    backgroundColor: 'rgba(1, 4, 9, 0.8)',
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
});
