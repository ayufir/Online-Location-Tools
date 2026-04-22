import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { startBackgroundTracking } from '../src/tasks/locationTask';
import api from '../src/api/client';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user, accessToken } = response.data.data;

      // Store auth state
      await AsyncStorage.setItem('token', accessToken);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      await AsyncStorage.setItem('userRole', user.role);

      // ─── Role-Based Initialization ───────────────────────────────────────
      if (user.role === 'admin') {
          // Admins go straight to Fleet Command
          router.replace('/');
          return;
      }

      // Employees must comply with Tracking Permissions
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== 'granted') {
          Alert.alert(
            'Access Denied', 
            'Fleet tracking requires location access to function. Please enable it in settings to proceed.',
            [{ text: 'OK' }]
          );
          setLoading(false);
          return;
      }

      // Request Background (Always) - Explaining why it's needed
      Alert.alert(
        'Background Tracking',
        'To ensure mission sync while your phone is locked, please select "Allow Always" for location access.',
        [{ 
          text: 'Proceed', 
          onPress: async () => {
             const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
             if (bgStatus !== 'granted') {
                console.warn('[Onboarding] Background permission not fully granted.');
             }
             // AUTO-START tracking immediately upon login
             await startBackgroundTracking().catch(e => console.log('Auto-start failed:', e));
             router.replace('/');
          } 
        }]
      );
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        <View style={styles.header}>
           <View style={styles.logoOrb}>
              <Text style={styles.logo}>🌞</Text>
           </View>
           <Text style={styles.title}>SolarTrack Pro</Text>
           <Text style={styles.subtitle}>Fleet Intelligence System</Text>
        </View>

        <View style={styles.authCard}>
          <View style={styles.cardBlur}>
            <Text style={styles.cardTitle}>Unit Access</Text>
            <Text style={styles.cardSub}>Sign in to start patrol</Text>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>COMMS ID (EMAIL)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="name@division.com"
                  placeholderTextColor="#484F58"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>SECURE KEY (PASSWORD)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#484F58"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              {error ? <View style={styles.errorContainer}><Text style={styles.errorText}>{error}</Text></View> : null}

              <TouchableOpacity 
                style={[styles.loginBtn, loading && styles.disabledBtn]} 
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.loginBtnText}>{loading ? 'INITIALIZING...' : '🚀 JOIN FLEET'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
           <Text style={styles.footerText}>Secure End-to-End Tracking Enabled</Text>
           <Text style={styles.versionText}>v1.2.0-vanguard</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#010409',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoOrb: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 184, 0, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.15)',
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 20,
  },
  logo: {
    fontSize: 54,
    textShadowColor: 'rgba(255, 184, 0, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  title: {
    fontSize: 38,
    fontWeight: '900',
    color: '#F0F6FC',
    letterSpacing: -1.5,
  },
  subtitle: {
    fontSize: 11,
    color: '#FFB800',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 4,
    marginTop: 8,
  },
  authCard: {
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.08)',
    backgroundColor: 'rgba(13, 17, 23, 0.98)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 15,
  },
  cardBlur: {
    padding: 36,
  },
  cardTitle: {
    color: '#F0F6FC',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  cardSub: {
    color: '#484F58',
    fontSize: 13,
    marginTop: 6,
    marginBottom: 36,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  form: {
    gap: 28,
  },
  inputGroup: {
    gap: 12,
  },
  label: {
    color: '#30363D',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: 'rgba(240, 246, 252, 0.01)',
    borderRadius: 20,
    padding: 20,
    color: '#F0F6FC',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(240, 246, 252, 0.05)',
    fontWeight: '700',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    color: '#F87171',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  loginBtn: {
    backgroundColor: '#FFB800',
    padding: 22,
    borderRadius: 22,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  loginBtnText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  footer: {
    marginTop: 50,
    alignItems: 'center',
    gap: 12,
  },
  footerText: {
    color: '#30363D',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  versionText: {
    color: '#21262D',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 3,
    backgroundColor: 'rgba(255, 184, 0, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.1)',
  },
});
