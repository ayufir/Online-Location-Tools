import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

// ─── CONFIGURATION ──────────────────────────────────────────────────────────
// Use your local IP for testing on physical devices, or Render URL for production.
const IS_PRODUCTION = !__DEV__; 

export const BASE_URL = IS_PRODUCTION 
  ? 'https://online-location-tools-backend.onrender.com' 
  : 'http://192.168.1.12:5000'; // Using your PC's Local IP for physical device testing

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isAuthRequest = !!error.config.headers?.Authorization;
    
    if ((error.response?.status === 401 || error.response?.status === 403) && isAuthRequest && !error.config.url?.endsWith('/auth/login')) {
      console.warn('[API] Auth Failure detected. Terminating stale session...');
      await AsyncStorage.clear();
      router.replace('/login');
    }
    return Promise.reject(error);
  }
);

export default api;
