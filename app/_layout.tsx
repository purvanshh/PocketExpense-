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
import { ActivityIndicator, AppState, Platform, StyleSheet, View } from 'react-native';
import { Provider, useDispatch } from 'react-redux';

import AutoAddToast from '../src/components/sms/AutoAddToast';
import SmsTransactionModal from '../src/components/sms/SmsTransactionModal';
import { checkBudgets } from '../src/services/budgetAlerts';
import { initSmsListener, stopSmsListener } from '../src/services/smsListener';
import { syncEngine } from '../src/services/syncEngine';
import { store } from '../src/store';
import { useAppSelector } from '../src/store/hooks';
import { flushPersistence } from '../src/store/persistMiddleware';
import { hydrateAuth } from '../src/store/slices/authSlice';
import { hydrateExpenses } from '../src/store/slices/expenseSlice';
import { hydrateNotifications } from '../src/store/slices/notificationSlice';
import { hydrateSmsSettings } from '../src/store/slices/smsSlice';
import { ThemeProvider, useTheme } from '../src/theme';

/** Full-screen spinner used while fonts and persisted state load. */
function LoadingScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const dispatch = useDispatch();
  const { isDark } = useTheme();
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

        // Hydrate expenses, the pending upload queue, and unsent deletes
        const [
            expensesJson,
            pendingQueueJson,
            tombstonesJson,
            notificationsJson,
        ] = await Promise.all([
          AsyncStorage.getItem('expenses'),
          AsyncStorage.getItem('pendingQueue'),
          AsyncStorage.getItem('tombstones'),
          AsyncStorage.getItem('notifications'),
        ]);

        dispatch(
          hydrateExpenses({
            items: expensesJson ? JSON.parse(expensesJson) : [],
            pendingQueue: pendingQueueJson ? JSON.parse(pendingQueueJson) : [],
            tombstones: tombstonesJson ? JSON.parse(tombstonesJson) : [],
          })
        );

        if (notificationsJson) {
          dispatch(hydrateNotifications(JSON.parse(notificationsJson)));
        }

        // Hydrate SMS detection preferences (Android only)
        if (Platform.OS === 'android') {
          const settingsJson = await AsyncStorage.getItem('smsSettings');

          if (settingsJson) {
            dispatch(hydrateSmsSettings(JSON.parse(settingsJson)));
          } else {
            // Fall back to the pre-auto-add storage key.
            const legacy = await AsyncStorage.getItem('smsDetectionEnabled');
            dispatch(hydrateSmsSettings({ isEnabled: legacy === 'true' }));
          }
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

  // Persistence is debounced, so force a flush before the app is backgrounded
  // rather than risk losing the last few hundred milliseconds of edits.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') {
        flushPersistence();
      }
    });
    return () => sub.remove();
  }, []);

  // Re-evaluate budgets once state is loaded, so an alert crossed while the app
  // was closed still surfaces on next launch.
  useEffect(() => {
    if (isHydrating || !isAuthenticated) return;
    checkBudgets(store.getState().auth.user?.currency ?? 'INR');
  }, [isHydrating, isAuthenticated]);

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
    return <LoadingScreen />;
  }

  const modal = { presentation: 'modal', headerShown: false } as const;

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="expense/add" options={modal} />
        <Stack.Screen name="expense/[id]" options={modal} />
        <Stack.Screen name="expense/scan" options={{ headerShown: false }} />
        <Stack.Screen name="budgets" options={modal} />
        <Stack.Screen name="insights" options={modal} />
        <Stack.Screen name="export" options={modal} />
        <Stack.Screen name="settings/sms-detection" options={modal} />
        <Stack.Screen name="settings/appearance" options={modal} />
        <Stack.Screen name="settings/notifications" options={modal} />
      </Stack>
      {Platform.OS === 'android' && (
        <>
          <SmsTransactionModal />
          <AutoAddToast />
        </>
      )}
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

  return (
    <Provider store={store}>
      <ThemeProvider>
        {fontsLoaded ? <RootLayoutNav /> : <LoadingScreen />}
      </ThemeProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
