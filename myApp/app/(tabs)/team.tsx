import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Platform, Dimensions, ScrollView } from 'react-native';
// Dynamically import Maps only for Native to avoid web bundling errors
let MapView: any = View;
let Marker: any = View;
let Polyline: any = View;
if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default || Maps;
    Marker = Maps.Marker;
    Polyline = Maps.Polyline;
  } catch (e) {
    console.warn('Maps not available');
  }
}
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
                    <Polyline
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
                  <Text style={styles.infoTitle}>Fleet Dashboard</Text>
                  <Text style={styles.infoSubtitle}>{teammates.filter(t => t.status !== 'offline').length} active agents linked</Text>
               </View>
               <TouchableOpacity style={styles.refreshBtn} onPress={fetchTeam}>
                  {refreshing ? <ActivityIndicator size="small" color="#F59E0B"/> : <Ionicons name="refresh-outline" size={20} color="#F0F6FC" />}
               </TouchableOpacity>
            </View>
         </View>
      </View>

      {/* Admin Employee List - Premium Dashboard UI */}
      <View style={styles.bottomListContainer}>
         <View style={styles.listHeader}>
            <Text style={styles.listHeaderTitle}>FIELD OPERATIVES</Text>
            <TouchableOpacity onPress={focusOnTeam}>
               <Text style={styles.listHeaderAction}>FOCUS ALL</Text>
            </TouchableOpacity>
         </View>
         
         <View style={styles.employeeListScroll}>
            {teammates.length > 0 ? (
               <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                  {teammates.map((emp) => (
                     <TouchableOpacity 
                        key={emp._id} 
                        style={[styles.empMiniCard, emp.status === 'moving' && styles.empMiniCardActive]}
                        onPress={() => {
                           if (emp.currentLocation?.latitude) {
                              mapRef.current?.animateToRegion({
                                 latitude: emp.currentLocation.latitude,
                                 longitude: emp.currentLocation.longitude,
                                 latitudeDelta: 0.01,
                                 longitudeDelta: 0.01,
                              }, 1000);
                           }
                        }}
                     >
                        <View style={[styles.statusIndicator, { backgroundColor: emp.status === 'moving' ? '#10B981' : (emp.status === 'offline' ? '#484F58' : '#3B82F6') }]} />
                        <View style={styles.empAvatarMini}>
                           <Text style={styles.empAvatarTextMini}>{emp.name.charAt(0)}</Text>
                        </View>
                        <Text style={styles.empNameMini} numberOfLines={1}>{emp.name.split(' ')[0]}</Text>
                        <Text style={styles.empStatusMini}>{emp.status.toUpperCase()}</Text>
                     </TouchableOpacity>
                  ))}
               </ScrollView>
            ) : (
               <Text style={styles.emptyText}>No operatives detected in sector</Text>
            )}
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
  bottomListContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 120 : 100,
    left: 0,
    right: 0,
    paddingVertical: 15,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  listHeaderTitle: {
    color: '#484F58',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  listHeaderAction: {
    color: '#FFB800',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  employeeListScroll: {
    paddingLeft: 15,
  },
  horizontalScroll: {
    flexDirection: 'row',
  },
  empMiniCard: {
    width: 90,
    height: 110,
    backgroundColor: 'rgba(22, 27, 34, 0.8)',
    borderRadius: 20,
    marginRight: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  empMiniCardActive: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  empAvatarMini: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#0d1117',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  empAvatarTextMini: {
    color: '#F0F6FC',
    fontSize: 14,
    fontWeight: '900',
  },
  empNameMini: {
    color: '#F0F6FC',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  empStatusMini: {
    color: '#8B949E',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  emptyText: {
    color: '#484F58',
    fontSize: 12,
    fontWeight: '600',
    paddingLeft: 5,
  },
});
