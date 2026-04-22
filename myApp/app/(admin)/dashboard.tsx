import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Dimensions, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

export default function AdminDashboardScreen() {
  const [stats, setStats] = useState({ total: 0, online: 0, moving: 0, idle: 0, lowBattery: 0 });
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadUser();
    fetchStats();
    
    // Vanguard Socket Integration
    const setupSocket = async () => {
      try {
        const socket = require('../../src/api/socket').default;
        if (!socket.connected) socket.connect();
        
        socket.on('activity', (data: any) => {
          setActivity(prev => [data, ...prev.slice(0, 15)]);
        });

        socket.on('locationUpdate', () => {
           fetchStats(); // Update counters on every pulse
        });
      } catch (e) {}
    };

    setupSocket();
    const interval = setInterval(fetchStats, 20000);
    return () => {
      clearInterval(interval);
      try {
        const socket = require('../../src/api/socket').default;
        socket.off('activity');
        socket.off('locationUpdate');
      } catch (e) {}
    };
  }, []);

  const loadUser = async () => {
    const data = await AsyncStorage.getItem('user');
    if (data) setUser(JSON.parse(data));
  };

  const fetchStats = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }

    try {
      const res = await api.get('/location/live');
      if (res.data.success) {
        const units = res.data.data;
        setStats({
          total: units.length,
          online: units.filter((u: any) => u.status !== 'offline').length,
          moving: units.filter((u: any) => u.status === 'moving').length,
          idle: units.filter((u: any) => u.status === 'idle').length,
          lowBattery: units.filter((u: any) => (u.batteryLevel || 100) < 25 || (u.currentLocation?.batteryLevel || 100) < 25 || (u.location?.batteryLevel || 100) < 25).length,
        });
      }
    } catch (e: any) {
      if (e.response?.status === 401 || e.response?.status === 403) {
        router.replace('/login');
      }
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FFB800" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFB800" />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Sentinel Dashboard</Text>
          <Text style={styles.headerSub}>ADMIN COMMAND: {(user?.name || 'VANGUARD').toUpperCase()}</Text>
        </View>
        <TouchableOpacity style={styles.profileBadge} onPress={() => router.push('/(admin)/units')}>
           <Text style={styles.pBadgeText}>PRO</Text>
        </TouchableOpacity>
      </View>

      {/* Hero Stats */}
      <View style={styles.heroGrid}>
        <View style={styles.heroMain}>
           <View style={styles.hContent}>
              <Text style={styles.hVal}>{stats.online}</Text>
              <Text style={styles.hLabel}>UNITS ACTIVE</Text>
           </View>
           <View style={styles.hIcon}>
              <Ionicons name="shield-checkmark" size={40} color="#FFB800" />
           </View>
        </View>
        
        <View style={styles.miniGrid}>
           <View style={[styles.miniCard, { backgroundColor: 'rgba(16, 185, 129, 0.05)' }]}>
              <Text style={[styles.mVal, { color: '#10B981' }]}>{stats.moving}</Text>
              <Text style={styles.mLabel}>MOBILE</Text>
           </View>
           <View style={[styles.miniCard, { backgroundColor: 'rgba(239, 68, 68, 0.05)' }]}>
              <Text style={[styles.mVal, { color: '#EF4444' }]}>{stats.total - stats.online}</Text>
              <Text style={styles.mLabel}>OFFLINE</Text>
           </View>
        </View>
      </View>

      {/* Critical Status Cards */}
      <View style={styles.statusStack}>
         {stats.lowBattery > 0 && (
           <TouchableOpacity style={styles.alertCard} onPress={() => router.push('/(admin)/units')}>
              <View style={styles.alertPulse} />
              <Ionicons name="battery-dead" size={24} color="#EF4444" />
              <View style={{ flex: 1, marginLeft: 15 }}>
                 <Text style={styles.alertTitle}>POWER CRITICAL</Text>
                 <Text style={styles.alertDesc}>{stats.lowBattery} operatives reporting low battery levels.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#30363D" />
           </TouchableOpacity>
         )}

         <View style={styles.healthCard}>
            <View style={styles.hRow}>
               <View style={styles.hStat}>
                  <Text style={styles.hSVal}>{stats.total}</Text>
                  <Text style={styles.hSLab}>TOTAL FLEET</Text>
               </View>
               <View style={styles.hDivider} />
               <View style={styles.hStat}>
                  <Text style={styles.hSVal}>{stats.idle}</Text>
                  <Text style={styles.hSLab}>IDLE UNITS</Text>
               </View>
               <View style={styles.hDivider} />
               <View style={styles.hStat}>
                  <Text style={styles.hSVal}>100%</Text>
                  <Text style={styles.hSLab}>SYNC HEALTH</Text>
               </View>
            </View>
         </View>
      </View>

      {/* Navigation Shortcuts */}
      <View style={styles.sectionHeader}>
         <Text style={styles.sectionTitle}>COMMAND ACCESS</Text>
      </View>
      
      <View style={styles.navGrid}>
         <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/(admin)')}>
            <View style={[styles.navIcon, { backgroundColor: 'rgba(255, 184, 0, 0.1)' }]}>
               <Ionicons name="map" size={24} color="#FFB800" />
            </View>
            <Text style={styles.navText}>FLEET MAP</Text>
            <Text style={styles.navSubtext}>Live Tracking</Text>
         </TouchableOpacity>

         <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/(admin)/units')}>
            <View style={[styles.navIcon, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
               <Ionicons name="people" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.navText}>PERSONNEL</Text>
            <Text style={styles.navSubtext}>Manage Team</Text>
         </TouchableOpacity>
      </View>

      {/* Live Tactical Feed */}
      <View style={styles.sectionHeader}>
         <Text style={styles.sectionTitle}>TACTICAL FEED</Text>
         <View style={styles.liveTag}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE STREAM</Text>
         </View>
      </View>

      <View style={styles.feedContainer}>
         {activity.length === 0 ? (
            <View style={styles.emptyFeed}>
               <Ionicons name="radio-outline" size={40} color="#30363D" />
               <Text style={styles.emptyTxt}>Connecting to Sentinel satellite network...</Text>
            </View>
         ) : (
            activity.map((item, i) => (
              <View key={i} style={styles.feedItem}>
                 <View style={styles.feedLine} />
                 <View style={styles.feedDot} />
                 <View style={styles.feedContent}>
                    <Text style={styles.fMsg}>{item.message}</Text>
                    <Text style={styles.fTime}>{new Date(item.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                 </View>
              </View>
            ))
         )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#010409',
  },
  scrollContent: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingBottom: 100,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#010409',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 35,
  },
  headerTitle: {
    color: '#F0F6FC',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
  },
  headerSub: {
    color: '#FFB800',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2.5,
    marginTop: 4,
  },
  profileBadge: {
    backgroundColor: 'rgba(255, 184, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.2)',
  },
  pBadgeText: {
    color: '#FFB800',
    fontSize: 10,
    fontWeight: '900',
  },
  heroGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 15,
  },
  heroMain: {
    flex: 2,
    backgroundColor: '#0D1117',
    borderRadius: 32,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.05)',
  },
  hContent: {
  },
  hVal: {
    color: '#F0F6FC',
    fontSize: 48,
    fontWeight: '900',
  },
  hLabel: {
    color: '#8B949E',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: 5,
  },
  hIcon: {
    opacity: 0.8,
  },
  miniGrid: {
    flex: 1,
    gap: 12,
  },
  miniCard: {
    flex: 1,
    borderRadius: 22,
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  mVal: {
    fontSize: 20,
    fontWeight: '900',
  },
  mLabel: {
    color: '#484F58',
    fontSize: 7,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: 1.5,
  },
  statusStack: {
    gap: 12,
    marginBottom: 40,
  },
  alertCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.03)',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.1)',
  },
  alertPulse: {
    position: 'absolute',
    left: 15,
    top: 15,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  alertTitle: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  alertDesc: {
    color: '#F0F6FC',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  healthCard: {
    backgroundColor: '#0D1117',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.02)',
  },
  hRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hStat: {
    alignItems: 'center',
    flex: 1,
  },
  hSVal: {
    color: '#F0F6FC',
    fontSize: 16,
    fontWeight: '900',
  },
  hSLab: {
    color: '#30363D',
    fontSize: 7,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: 1,
  },
  hDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#30363D',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2.5,
  },
  navGrid: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 40,
  },
  navBtn: {
    flex: 1,
    backgroundColor: '#0D1117',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  navIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  navText: {
    color: '#F0F6FC',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  navSubtext: {
    color: '#484F58',
    fontSize: 10,
    marginTop: 2,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  liveText: {
    color: '#EF4444',
    fontSize: 8,
    fontWeight: '900',
  },
  feedContainer: {
    backgroundColor: '#0D1117',
    borderRadius: 32,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.02)',
  },
  emptyFeed: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTxt: {
    color: '#30363D',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 15,
    textAlign: 'center',
  },
  feedItem: {
    flexDirection: 'row',
    padding: 15,
    minHeight: 60,
  },
  feedLine: {
    position: 'absolute',
    left: 23,
    top: 35,
    bottom: -15,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  feedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#30363D',
    marginTop: 6,
    marginRight: 15,
    zIndex: 10,
    borderWidth: 2,
    borderColor: '#0D1117',
  },
  feedContent: {
    flex: 1,
  },
  fMsg: {
    color: '#F0F6FC',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  fTime: {
    color: '#484F58',
    fontSize: 9,
    marginTop: 5,
    fontWeight: '700',
  },
});
