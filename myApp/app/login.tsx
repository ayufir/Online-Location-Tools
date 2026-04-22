import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert, Dimensions } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { startBackgroundTracking } from '../src/tasks/locationTask';
import api from '../src/api/client';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

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

      await AsyncStorage.setItem('token', accessToken);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      await AsyncStorage.setItem('userRole', user.role);

      if (user.role === 'admin') {
          router.replace('/');
          return;
      }

      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== 'granted') {
          Alert.alert('Access Denied', 'Location access is required.');
          setLoading(false);
          return;
      }

      Alert.alert(
        'System Activation',
        'Ready to start mission tracking.',
        [{ 
          text: 'ACTIVATE', 
          onPress: async () => {
             await Location.requestBackgroundPermissionsAsync();
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
    <View style={styles.mainContainer}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
          <View style={styles.header}>
             <View style={styles.logoOrb}>
                <Ionicons name="sunny" size={50} color="#007AFF" />
             </View>
             <Text style={styles.title}>SOLARTRACK</Text>
             <Text style={styles.subtitle}>FLEET COMMAND CENTER</Text>
          </View>

          <View style={styles.authCard}>
            <Text style={styles.cardTitle}>Unit Login</Text>
            <Text style={styles.cardSub}>Sign in to access your dashboard</Text>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>EMAIL ADDRESS</Text>
                <View style={styles.inputWrapper}>
                   <Ionicons name="mail-outline" size={18} color="#94A3B8" />
                   <TextInput
                     style={styles.input}
                     placeholder="your@email.com"
                     placeholderTextColor="#94A3B8"
                     value={email}
                     onChangeText={setEmail}
                     keyboardType="email-address"
                     autoCapitalize="none"
                   />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>PASSWORD</Text>
                <View style={styles.inputWrapper}>
                   <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" />
                   <TextInput
                     style={styles.input}
                     placeholder="••••••••"
                     placeholderTextColor="#94A3B8"
                     value={password}
                     onChangeText={setPassword}
                     secureTextEntry
                   />
                </View>
              </View>

              {error ? <View style={styles.errorContainer}><Text style={styles.errorText}>{error}</Text></View> : null}

              <TouchableOpacity 
                style={[styles.loginBtn, loading && styles.disabledBtn]} 
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.loginBtnText}>{loading ? 'SYNCING...' : 'LOGIN TO FLEET'}</Text>
                <Ionicons name="chevron-forward" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.footer}>
             <Text style={styles.footerText}>SOLAR TRACK PRO SYSTEM</Text>
             <Text style={styles.versionText}>V3.0.1 LIGHT OPS</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Clean Light Grey/Blue background
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 30,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoOrb: {
    width: 90,
    height: 90,
    borderRadius: 30,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '800',
    letterSpacing: 4,
    marginTop: 5,
  },
  authCard: {
    backgroundColor: '#FFF',
    borderRadius: 30,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.05,
    shadowRadius: 30,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardTitle: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '800',
  },
  cardSub: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 5,
    marginBottom: 30,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginLeft: 5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  input: {
    flex: 1,
    padding: 15,
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  loginBtn: {
    backgroundColor: '#007AFF', // Professional Blue
    padding: 18,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  disabledBtn: {
    backgroundColor: '#94A3B8',
  },
  loginBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  versionText: {
    color: '#007AFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
});
