import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';

export default function IndexRedirect() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<{ token: string | null, role: string | null }>({ token: null, role: null });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = await AsyncStorage.getItem('token');
    const role = await AsyncStorage.getItem('userRole');
    setSession({ token, role });
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#010409', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FFB800" />
      </View>
    );
  }

  // No session -> Login
  if (!session.token) {
    return <Redirect href="/login" />;
  }

  // Branch based on role
  if (session.role === 'admin') {
    return <Redirect href="/(admin)/dashboard" />;
  }

  if (session.role === 'employee') {
    return <Redirect href="/(employee)" />;
  }

  // Fallback (corrupted session)
  return <Redirect href="/login" />;
}
