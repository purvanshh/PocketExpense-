import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import apiClient from '../api/apiClient';

export interface AnomalyItem {
    amount: number;
    category: string;
    date: string;
    zScore: number;
}

export interface AdvancedInsights {
    monthlyGrowthRate: {
        rates: Array<{ month: number; year: number; total: number; growthRate: number }>;
        averageGrowthRate: number;
    };
    topCategories: Array<{
        _id: string;
        total: number;
        count: number;
        avgAmount: number;
    }>;
    weekdayVsWeekend: {
        weekday: { total: number; count: number; avgPerTransaction: number };
        weekend: { total: number; count: number; avgPerTransaction: number };
        comparison: string;
    };
    anomalies: {
        detected: boolean;
        stats?: { mean: number; stdDev: number; totalAnalyzed: number };
        message?: string;
        items: AnomalyItem[];
    };
}

interface InsightState {
    advancedInsights: AdvancedInsights | null;
    isLoading: boolean;
    error: string | null;
}

const initialState: InsightState = {
    advancedInsights: null,
    isLoading: false,
    error: null,
};

export const fetchAdvancedInsights = createAsyncThunk(
    'insights/fetchAdvanced',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get('/insights/advanced');
            return response.data.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch insights');
        }
    }
);

const insightSlice = createSlice({
    name: 'insights',
    initialState,
    reducers: {
        clearInsightError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAdvancedInsights.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchAdvancedInsights.fulfilled, (state, action: PayloadAction<AdvancedInsights>) => {
                state.advancedInsights = action.payload;
                state.isLoading = false;
            })
            .addCase(fetchAdvancedInsights.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });
    },
});

export const { clearInsightError } = insightSlice.actions;
export default insightSlice.reducer;
