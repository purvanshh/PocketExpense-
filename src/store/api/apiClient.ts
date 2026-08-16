import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// IMPORTANT: When using Expo Go on a physical device or emulator,
// you need to use your computer's actual IP address
// Find your IP: run `ifconfig` or check System Preferences > Network

const YOUR_IP = '192.168.0.102';
const PORT = '5001';

const BASE_URL = `http://${YOUR_IP}:${PORT}/api`;

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
