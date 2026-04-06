import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from '@expo-google-fonts/poppins';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { Provider, useDispatch } from 'react-redux';

import { syncEngine } from '../src/services/syncEngine';
import { initSmsListener, stopSmsListener } from '../src/services/smsListener';
import SmsTransactionModal from '../src/components/sms/SmsTransactionModal';
import { store } from '../src/store';
import { useAppSelector } from '../src/store/hooks';
import { hydrateAuth } from '../src/store/slices/authSlice';
import { hydrateExpenses } from '../src/store/slices/expenseSlice';
import { hydrateSmsSettings } from '../src/store/slices/smsSlice';
import { colors } from '../src/theme';

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const dispatch = useDispatch();
  const { isAuthenticated, isLoading } = useAppSelector(
    (state) => state.auth
  );
  const [isHydrating, setIsHydrating] = useState(true);

  // Hydrate auth and expenses from AsyncStorage
  useEffect(() => {
    const hydrate = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const userJson = await AsyncStorage.getItem('user');

        if (token && userJson) {
          const user = JSON.parse(userJson);
          dispatch(hydrateAuth({ user, token }));
        } else {
          dispatch(hydrateAuth(null));
        }

        // Hydrate expenses
        const expensesJson = await AsyncStorage.getItem('expenses');
        const pendingQueueJson = await AsyncStorage.getItem('pendingQueue');

        const expenses = expensesJson ? JSON.parse(expensesJson) : [];
        const pendingQueue = pendingQueueJson ? JSON.parse(pendingQueueJson) : [];

        dispatch(hydrateExpenses({ items: expenses, pendingQueue }));

        // Hydrate SMS detection preference (Android only)
        if (Platform.OS === 'android') {
          const smsEnabled = await AsyncStorage.getItem('smsDetectionEnabled');
          dispatch(hydrateSmsSettings({ isEnabled: smsEnabled === 'true' }));
        }
      } catch (error) {
        console.error('Hydration error:', error);
        dispatch(hydrateAuth(null));
      } finally {
        setIsHydrating(false);
      }
    };

    hydrate();
  }, [dispatch]);

  // Initialize sync engine
  useEffect(() => {
    syncEngine.init();
    return () => syncEngine.cleanup();
  }, []);

  // Initialize SMS listener (Android only)
  useEffect(() => {
    if (Platform.OS === 'android' && isAuthenticated) {
      initSmsListener();
      return () => stopSmsListener();
    }
  }, [isAuthenticated]);

  // Handle navigation based on auth state
  useEffect(() => {
    if (isHydrating || isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to home if authenticated
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, isHydrating, isLoading]);

  if (isHydrating || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="expense/add"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="expense/[id]"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="budgets"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="insights"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="settings/sms-detection"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
      </Stack>
      {Platform.OS === 'android' && <SmsTransactionModal />}
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Provider store={store}>
      <RootLayoutNav />
    </Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
