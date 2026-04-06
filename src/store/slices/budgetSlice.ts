import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import apiClient from '../api/apiClient';

export interface Budget {
    _id: string;
    category: string;
    amount: number;
    month: number;
    year: number;
    totalSpent: number;
    percentageUsed: number;
    remainingAmount: number;
}

interface BudgetState {
    items: Budget[];
    isLoading: boolean;
    error: string | null;
}

const initialState: BudgetState = {
    items: [],
    isLoading: false,
    error: null,
};

export const fetchBudgets = createAsyncThunk(
    'budgets/fetchAll',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get('/budgets');
            return response.data.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch budgets');
        }
    }
);

export const createBudget = createAsyncThunk(
    'budgets/create',
    async (data: { category: string; amount: number; month: number; year: number }, { rejectWithValue }) => {
        try {
            const response = await apiClient.post('/budgets', data);
            return response.data.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to create budget');
        }
    }
);

export const updateBudget = createAsyncThunk(
    'budgets/update',
    async ({ id, data }: { id: string; data: Partial<Budget> }, { rejectWithValue }) => {
        try {
            const response = await apiClient.put(`/budgets/${id}`, data);
            return response.data.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to update budget');
        }
    }
);

export const deleteBudget = createAsyncThunk(
    'budgets/delete',
    async (id: string, { rejectWithValue }) => {
        try {
            await apiClient.delete(`/budgets/${id}`);
            return id;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to delete budget');
        }
    }
);

const budgetSlice = createSlice({
    name: 'budgets',
    initialState,
    reducers: {
        clearBudgetError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchBudgets.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchBudgets.fulfilled, (state, action: PayloadAction<Budget[]>) => {
                state.items = action.payload;
                state.isLoading = false;
            })
            .addCase(fetchBudgets.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            .addCase(createBudget.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(createBudget.fulfilled, (state, action: PayloadAction<Budget>) => {
                state.items.push(action.payload);
                state.isLoading = false;
            })
            .addCase(createBudget.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            .addCase(updateBudget.fulfilled, (state, action: PayloadAction<Budget>) => {
                const index = state.items.findIndex((b) => b._id === action.payload._id);
                if (index !== -1) state.items[index] = action.payload;
            })
            .addCase(deleteBudget.fulfilled, (state, action: PayloadAction<string>) => {
                state.items = state.items.filter((b) => b._id !== action.payload);
            });
    },
});

export const { clearBudgetError } = budgetSlice.actions;
export default budgetSlice.reducer;
