import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

// REPLACE WITH YOUR BACKEND IP ADDRESS (eg. http://192.168.1.10:5000)
// Do not use localhost on physical devices
export const BASE_URL = 'http://192.168.1.12:5000'; 

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 10000,
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
