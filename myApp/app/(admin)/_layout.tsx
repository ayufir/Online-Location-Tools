import { View, Platform } from 'react-native';
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AdminLayout() {
  useEffect(() => {
    // Session Sentinel: Force redirect if session is wiped
    const checkSession = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) router.replace('/login');
    };
    
    // Check every 2 seconds to catch interceptor wipe
    const interval = setInterval(checkSession, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(1, 4, 9, 0.9)',
          borderTopWidth: 1,
          borderTopColor: 'rgba(255, 184, 0, 0.1)',
          height: Platform.OS === 'ios' ? 90 : 70,
          paddingTop: 10,
          paddingBottom: Platform.OS === 'ios' ? 30 : 12,
          position: 'absolute',
          bottom: 15,
          left: 15,
          right: 15,
          borderRadius: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.3,
          shadowRadius: 20,
          elevation: 10,
        },
        tabBarActiveTintColor: '#FFB800',
        tabBarInactiveTintColor: '#484F58',
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '900',
          letterSpacing: 2,
          marginBottom: 4,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'OVERVIEW',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'LIVE MAP',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="units"
        options={{
          title: 'INVENTORY',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
