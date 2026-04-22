import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, RefreshControl, Platform, Alert, Dimensions, Image, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/client';
import socket from '../../src/api/socket';

const { width } = Dimensions.get('window');

export default function EmployeeDashboard() {
  const [user, setUser] = useState<any>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    setupTracking();
    socket.on('target:update', (data) => {
      if (data.tasks) {
        setUser((prev: any) => ({ ...prev, tasks: data.tasks }));
        Alert.alert(
          "☀️ NEW SOLAR MISSION",
          `Destination: ${data.tasks[data.tasks.length-1].label}`,
          [
            { text: "LATER", style: "cancel" },
            { text: "VIEW MAP", onPress: () => router.push('/(employee)/assignment') }
          ]
        );
      }
    });

    return () => {
      socket.off('target:update');
    };
  }, []);

  const loadData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/login');
        return;
      }
      
      const res = await api.get('/auth/me');
      if (res.data.success) {
        const freshUser = res.data.data;
        setUser(freshUser);
        if (!socket.connected) {
          socket.connect();
          socket.on('connect', () => {
             socket.emit('employee:join', { token });
          });
        } else {
           socket.emit('employee:join', { token });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const setupTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;

    await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 5 },
      async (loc) => {
        setLocation(loc);
        if (socket.connected) {
          const battery = await Battery.getBatteryLevelAsync();
          socket.emit('employee:location:push', {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            speed: loc.coords.speed,
            accuracy: loc.coords.accuracy,
            batteryLevel: Math.round(battery * 100),
            timestamp: new Date().toISOString()
          });
        }
      }
    );
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to exit?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "LOGOUT", 
        onPress: async () => {
          await AsyncStorage.clear();
          socket.disconnect();
          router.replace('/login');
        } 
      }
    ]);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Light Header */}
      <View style={styles.header}>
         <View style={styles.headerTop}>
            <View style={styles.profileBox}>
               <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'E'}</Text>
               </View>
               <View>
                  <Text style={styles.welcome}>Welcome back,</Text>
                  <Text style={styles.name}>{user?.name || 'Employee'}</Text>
               </View>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
               <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
         </View>

         <View style={styles.statusBanner}>
            <View style={styles.statusCard}>
               <View style={[styles.statusDot, { backgroundColor: location ? '#10B981' : '#EF4444' }]} />
               <Text style={styles.statusText}>{location ? 'LIVE TRACKING' : 'SIGNAL LOST'}</Text>
            </View>
            <View style={styles.statusCard}>
               <Ionicons name="shield-checkmark" size={12} color="#007AFF" />
               <Text style={styles.statusText}>SECURE LINK</Text>
            </View>
         </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" />}
      >
        <View style={styles.statsGrid}>
           <View style={styles.statBox}>
              <Text style={styles.statVal}>{user?.tasks?.length || 0}</Text>
              <Text style={styles.statLabel}>MISSIONS</Text>
           </View>
           <View style={styles.statBox}>
              <Text style={styles.statVal}>{user?.employeeId || 'ST-000'}</Text>
              <Text style={styles.statLabel}>UNIT ID</Text>
           </View>
        </View>

        <View style={styles.sectionHeader}>
           <Text style={styles.sectionTitle}>EMPLOYEE DETAILS</Text>
        </View>

        <View style={styles.idCard}>
           <View style={styles.idCardHeader}>
              <Ionicons name="shield-checkmark" size={24} color="#007AFF" />
              <Text style={styles.idCardTitle}>OFFICIAL PROFILE</Text>
           </View>
           
           <View style={styles.idContent}>
              <View style={styles.idRow}>
                 <View style={styles.idField}>
                    <Text style={styles.idLabel}>FULL NAME</Text>
                    <Text style={styles.idValue}>{user?.name || '---'}</Text>
                 </View>
                 <View style={styles.idField}>
                    <Text style={styles.idLabel}>DUTY ID</Text>
                    <Text style={styles.idValue}>{user?.employeeId || 'ST-000'}</Text>
                 </View>
              </View>

              <View style={styles.idRow}>
                 <View style={styles.idField}>
                    <Text style={styles.idLabel}>DEPARTMENT</Text>
                    <Text style={styles.idValue}>{user?.department || 'Field Ops'}</Text>
                 </View>
                 <View style={styles.idField}>
                    <Text style={styles.idLabel}>ACCESS LEVEL</Text>
                    <Text style={[styles.idValue, { color: '#10B981' }]}>CERTIFIED</Text>
                 </View>
              </View>

              <View style={styles.idDivider} />

              <View style={styles.idField}>
                 <Text style={styles.idLabel}>OFFICIAL EMAIL</Text>
                 <Text style={styles.idValue}>{user?.email || '---'}</Text>
              </View>
           </View>

           <View style={styles.idFooter}>
              <Text style={styles.idFooterText}>Authorized for Live Telemetry & Field Maintenance</Text>
           </View>
        </View>

        <View style={styles.sectionHeader}>
           <Text style={styles.sectionTitle}>EMPLOYEE TASK</Text>
           <TouchableOpacity onPress={() => router.push('/(employee)/assignment')}>
              <Text style={styles.viewAll}>VIEW MAP</Text>
           </TouchableOpacity>
        </View>

        {user?.tasks?.length > 0 ? (
          <TouchableOpacity 
            style={styles.missionCard}
            onPress={() => router.push('/(employee)/assignment')}
          >
             <View style={styles.missionInfo}>
                <View style={styles.missionIcon}>
                   <Ionicons name="sunny" size={24} color="#007AFF" />
                </View>
                <View style={{ flex: 1 }}>
                   <Text style={styles.missionLabel}>{user.tasks[0].label}</Text>
                   <Text style={styles.missionSub}>Track your destination in real-time</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
             </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyMission}>
             <Ionicons name="clipboard-outline" size={32} color="#94A3B8" />
             <Text style={styles.emptyText}>No Active Missions</Text>
          </View>
        )}

        <View style={styles.infoRow}>
           <View style={styles.infoCard}>
              <Ionicons name="cloud-done-outline" size={24} color="#10B981" />
              <Text style={styles.infoTitle}>Sync Ready</Text>
              <Text style={styles.infoDesc}>Data is backed up</Text>
           </View>
           <View style={styles.infoCard}>
              <Ionicons name="battery-charging-outline" size={24} color="#007AFF" />
              <Text style={styles.infoTitle}>Optimized</Text>
              <Text style={styles.infoDesc}>Battery saver on</Text>
           </View>
        </View>

        <View style={styles.footer}>
           <Text style={styles.footerText}>SOLAR TRACK PRO · FLEET EDITION</Text>
           <Text style={styles.footerSub}>Powered by Operations Center</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
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
  header: {
    backgroundColor: '#FFF',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 25,
    paddingBottom: 25,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
  },
  welcome: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  name: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBanner: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 15,
    padding: 25,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statVal: {
    color: '#007AFF',
    fontSize: 24,
    fontWeight: '900',
  },
  statLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 5,
    letterSpacing: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    marginBottom: 15,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  viewAll: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '700',
  },
  missionCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 25,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  missionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  missionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  missionLabel: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  missionSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  emptyMission: {
    backgroundColor: '#FFF',
    marginHorizontal: 25,
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 15,
    padding: 25,
  },
  infoCard: {
    flex: 1,
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  infoTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 12,
  },
  infoDesc: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
  },
  idCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 25,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  idCardHeader: {
    backgroundColor: 'rgba(0, 122, 255, 0.03)',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  idCardTitle: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  idContent: {
    padding: 20,
    gap: 20,
  },
  idRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  idField: {
    flex: 1,
  },
  idLabel: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  idValue: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  idDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  idFooter: {
    padding: 15,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  idFooterText: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  footer: {
    padding: 40,
    alignItems: 'center',
  },
  footerText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  footerSub: {
    color: '#CBD5E1',
    fontSize: 9,
    marginTop: 5,
  }
});
