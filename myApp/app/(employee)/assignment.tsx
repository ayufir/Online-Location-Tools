import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Platform, Dimensions, Linking, Alert, FlatList, RefreshControl } from 'react-native';
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
import socket from '../../src/api/socket';

const { width, height } = Dimensions.get('window');

export default function AssignmentScreen() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    fetchMyData();
    socket.on('target:update', async (data) => {
      if (data.tasks) {
        setTasks(data.tasks);
        if (data.tasks.length > 0 && !selectedTask) {
          setSelectedTask(data.tasks[0]);
        }
      }
    });
    const interval = setInterval(getMyLocation, 5000);
    getMyLocation();
    return () => {
      socket.off('target:update');
      clearInterval(interval);
    };
  }, []);

  const getMyLocation = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(loc);
    } catch (e) {}
  };

  const fetchMyData = async () => {
    try {
      setRefreshing(true);
      const res = await api.get('/auth/me');
      if (res.data.success) {
        const userTasks = res.data.data.tasks || [];
        setTasks(userTasks);
        if (userTasks.length > 0) setSelectedTask(userTasks[0]);
      }
    } catch (e: any) {
      Alert.alert('Error', 'Connection failed');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const openNavigation = (task: any) => {
    if (!task?.latitude) return;
    const lat = task.latitude;
    const lng = task.longitude;
    const url = Platform.select({
      ios: `maps:0,0?q=${task.label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${task.label})`
    });
    if (url) {
      Linking.canOpenURL(url).then(supported => {
        if (supported) Linking.openURL(url);
        else Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
      });
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const centerOnTask = (task: any) => {
    if (!task || !mapRef.current || !location) return;
    setSelectedTask(task);
    mapRef.current.fitToCoordinates([
      { latitude: location.coords.latitude, longitude: location.coords.longitude },
      { latitude: task.latitude, longitude: task.longitude }
    ], { edgePadding: { top: 100, right: 50, bottom: 400, left: 50 }, animated: true });
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#007AFF" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.mapWrapper}>
        {Platform.OS === 'web' ? (
          <View style={styles.webFallback}><Ionicons name="navigate" size={64} color="#E2E8F0" /><Text style={styles.webFallbackText}>Maps Module</Text></View>
        ) : (
          <MapView ref={mapRef} style={styles.map} userInterfaceStyle="light">
            {location && (
              <Marker coordinate={{ latitude: location.coords.latitude, longitude: location.coords.longitude }}>
                 <View style={styles.dot} />
              </Marker>
            )}
            {tasks.map((task, index) => (
              <Marker key={task._id || index} coordinate={{ latitude: task.latitude, longitude: task.longitude }} onPress={() => setSelectedTask(task)}>
                <View style={[styles.targetMarker, selectedTask?._id === task._id && styles.selectedMarker]}>
                   <Ionicons name="sunny" size={30} color={selectedTask?._id === task._id ? "#007AFF" : "#64748B"} />
                </View>
              </Marker>
            ))}
            {selectedTask && location && (
              <Polyline coordinates={[{ latitude: location.coords.latitude, longitude: location.coords.longitude }, { latitude: selectedTask.latitude, longitude: selectedTask.longitude }]} strokeColor="#007AFF" strokeWidth={3} lineDashPattern={[10, 10]} />
            )}
          </MapView>
        )}
      </View>

      <View style={styles.listOverlay}>
         <View style={styles.listHeader}>
            <Text style={styles.listTitle}>MISSION CONTROL ({tasks.length})</Text>
         </View>
         <FlatList
           data={tasks}
           keyExtractor={(item, index) => item._id || index.toString()}
           renderItem={({ item }) => (
             <TouchableOpacity style={[styles.taskCard, selectedTask?._id === item._id && styles.activeTaskCard]} onPress={() => centerOnTask(item)}>
                <View style={styles.taskCardHeader}>
                   <View>
                      <Text style={styles.taskLabel}>{item.label}</Text>
                      <Text style={styles.taskDate}>{new Date(item.setAt).toLocaleTimeString()}</Text>
                   </View>
                   <View style={styles.statusTag}><Text style={styles.statusTagText}>{item.status.toUpperCase()}</Text></View>
                </View>
                <View style={styles.taskMetaRow}>
                   <Text style={styles.taskDist}>{location ? calculateDistance(location.coords.latitude, location.coords.longitude, item.latitude, item.longitude).toFixed(1) : '--'} km</Text>
                   {selectedTask?._id === item._id && <TouchableOpacity style={styles.navActionBtn} onPress={() => openNavigation(item)}><Text style={styles.navActionText}>START</Text></TouchableOpacity>}
                </View>
             </TouchableOpacity>
           )}
         />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  mapWrapper: { height: height * 0.45, width: '100%' },
  map: { ...StyleSheet.absoluteFillObject },
  webFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  webFallbackText: { color: '#94A3B8', marginTop: 15, fontWeight: '900' },
  listOverlay: { flex: 1, backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, marginTop: -30, padding: 25 },
  listHeader: { marginBottom: 20 },
  listTitle: { color: '#0F172A', fontSize: 13, fontWeight: '900' },
  taskCard: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  activeTaskCard: { borderColor: '#007AFF', backgroundColor: 'rgba(0, 122, 255, 0.05)' },
  taskCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  taskLabel: { color: '#0F172A', fontSize: 16, fontWeight: '800' },
  taskDate: { color: '#64748B', fontSize: 11 },
  statusTag: { backgroundColor: '#F1F5F9', padding: 5, borderRadius: 6 },
  statusTagText: { fontSize: 9, fontWeight: '900', color: '#475569' },
  taskMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskDist: { color: '#007AFF', fontWeight: '800' },
  navActionBtn: { backgroundColor: '#007AFF', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 },
  navActionText: { color: '#FFF', fontWeight: '900', fontSize: 11 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#007AFF', borderWidth: 2, borderColor: '#FFF' },
  targetMarker: { alignItems: 'center' },
  selectedMarker: { shadowColor: '#007AFF', shadowOpacity: 0.5, shadowRadius: 10 }
});
