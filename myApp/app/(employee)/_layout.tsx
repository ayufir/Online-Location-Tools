import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform } from 'react-native';
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

export default function EmployeeLayout() {
  useEffect(() => {
    // Session Sentinel: Force redirect if session is wiped
    const checkSession = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) router.replace('/login');
    };
    
    const interval = setInterval(checkSession, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFF',
          borderTopWidth: 1,
          borderTopColor: '#F1F5F9',
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
          shadowOpacity: 0.1,
          shadowRadius: 20,
          elevation: 10,
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '900',
          letterSpacing: 1,
          marginBottom: 4,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'MY TRACKER',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="location-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: 'TEAM FLEET',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="assets"
        options={{
          title: 'SOLAR GRID',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sunny-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="assignment"
        options={{
          title: 'MY TASK',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="navigate-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
