import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface User {
    _id: string;
    name: string;
    email: string;
    budgetLimit: number;
    currency: string;
    avatar?: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

const initialState: AuthState = {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setCredentials: (
            state,
            action: PayloadAction<{ user: User; token: string }>
        ) => {
            state.user = action.payload.user;
            state.token = action.payload.token;
            state.isAuthenticated = true;
            state.isLoading = false;
            state.error = null;
            // Persist to AsyncStorage
            AsyncStorage.setItem('token', action.payload.token);
            AsyncStorage.setItem('user', JSON.stringify(action.payload.user));
        },
        setUser: (state, action: PayloadAction<User>) => {
            state.user = action.payload;
        },
        updateBudgetLimit: (state, action: PayloadAction<number>) => {
            if (state.user) {
                state.user.budgetLimit = action.payload;
                AsyncStorage.setItem('user', JSON.stringify(state.user));
            }
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
            state.isLoading = false;
        },
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            state.isLoading = false;
            state.error = null;
            AsyncStorage.removeItem('token');
            AsyncStorage.removeItem('user');
        },
        hydrateAuth: (
            state,
            action: PayloadAction<{ user: User; token: string } | null>
        ) => {
            if (action.payload) {
                state.user = action.payload.user;
                state.token = action.payload.token;
                state.isAuthenticated = true;
            }
            state.isLoading = false;
        },
    },
});

export const {
    setCredentials,
    setUser,
    updateBudgetLimit,
    setLoading,
    setError,
    logout,
    hydrateAuth,
} = authSlice.actions;

export default authSlice.reducer;
