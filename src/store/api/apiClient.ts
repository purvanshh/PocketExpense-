import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Dynamically determine the API base URL to prevent ERR_NETWORK errors when the IP changes
const getBaseUrl = () => {
    const PORT = '5001';
    
    // 1. Try to get the IP address from Expo's dev server configuration
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
        const ip = hostUri.split(':')[0];
        console.log(`📡 Dynamically resolved host IP from Expo: ${ip}`);
        return `http://${ip}:${PORT}/api`;
    }

    // 2. Fallback depending on the platform/environment
    if (Platform.OS === 'android') {
        console.log('📡 Using Android emulator loopback alias (10.0.2.2)');
        return `http://10.0.2.2:${PORT}/api`; // Android emulator loopback
    }
    
    console.log('📡 Using localhost loopback');
    return `http://localhost:${PORT}/api`; // iOS simulator or web
};

const BASE_URL = getBaseUrl();

const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid - logout user
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
            // Handle logout in the app
        }
        return Promise.reject(error);
    }
);

export default apiClient;
