// PocketExpense+ Theme - Violet Glassmorphism Design System

export const colors = {
    // Primary Brand Colors
    gradientStart: '#C4A6FE',
    gradientEnd: '#8A64EB',
    primary: '#8A64EB',
    primaryDark: '#181026',
    primaryLight: '#9D85FF',

    // Secondary Accent
    secondary: '#C7F2A4',

    // Backgrounds
    background: '#F8F9FE',
    cardBg: '#FFFFFF',
    inputBg: '#F2F4F8',

    // Text Colors
    textMain: '#1C1C1E',
    textSecondary: '#8E8E93',
    textLight: '#BDBDBD',
    textWhite: '#FFFFFF',

    // Status Colors
    success: '#4CD964',
    successBg: '#E0F8E3',
    error: '#FF3B30',
    errorBg: '#FFEBEE',
    warning: '#FF9500',
    warningBg: '#FFF3E0',
    info: '#007AFF',
    infoBg: '#E3F2FD',

    // Chart Colors
    chartPurple: '#8A64EB',
    chartLime: '#C7F2A4',
    chartBlue: '#5AC8FA',
    chartOrange: '#FF9500',

    // Overlay
    overlay: 'rgba(0, 0, 0, 0.5)',
};

export const borderRadius = {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 30,
    full: 9999,
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
};

export const shadows = {
    card: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 5,
    },
    cardHeavy: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
    },
    tabBar: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    fab: {
        shadowColor: '#8A64EB',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 12,
    },
};

export const typography = {
    fontFamily: {
        regular: 'Poppins_400Regular',
        medium: 'Poppins_500Medium',
        semiBold: 'Poppins_600SemiBold',
        bold: 'Poppins_700Bold',
    },
    sizes: {
        xs: 10,
        sm: 12,
        md: 14,
        lg: 16,
        xl: 18,
        xxl: 24,
        xxxl: 32,
        hero: 40,
    },
};

// Category configuration with colors and icons
export const categories = {
    groceries: { label: 'Groceries', icon: '🛒', color: '#FFE4C4', textColor: '#8B4513' },
    travel: { label: 'Travel', icon: '✈️', color: '#E8DAEF', textColor: '#6C3483' },
    car: { label: 'Car', icon: '🚗', color: '#D6EAF8', textColor: '#2471A3' },
    home: { label: 'Home', icon: '🏠', color: '#FCE4EC', textColor: '#C2185B' },
    insurance: { label: 'Insurance', icon: '✅', color: '#E8F8F5', textColor: '#1ABC9C' },
    education: { label: 'Education', icon: '🎓', color: '#FFF9C4', textColor: '#F9A825' },
    marketing: { label: 'Marketing', icon: '📈', color: '#E8F5E9', textColor: '#388E3C' },
    shopping: { label: 'Shopping', icon: '🛍️', color: '#FFE0B2', textColor: '#E65100' },
    internet: { label: 'Internet', icon: '📶', color: '#E1F5FE', textColor: '#0277BD' },
    water: { label: 'Water', icon: '💧', color: '#E3F2FD', textColor: '#1565C0' },
    rent: { label: 'Rent', icon: '🔑', color: '#FFEBEE', textColor: '#C62828' },
    gym: { label: 'Gym', icon: '🏋️', color: '#F3E5F5', textColor: '#7B1FA2' },
    subscription: { label: 'Subscription', icon: '📱', color: '#EDE7F6', textColor: '#512DA8' },
    vacation: { label: 'Vacation', icon: '🌴', color: '#E0F2F1', textColor: '#00695C' },
    food: { label: 'Food', icon: '🍕', color: '#FFF3E0', textColor: '#EF6C00' },
    entertainment: { label: 'Entertainment', icon: '🎬', color: '#E8EAF6', textColor: '#303F9F' },
    salary: { label: 'Salary', icon: '💰', color: '#E8F5E9', textColor: '#2E7D32' },
    freelance: { label: 'Freelance', icon: '💼', color: '#E0F7FA', textColor: '#00838F' },
    investment: { label: 'Investment', icon: '📊', color: '#FFF8E1', textColor: '#FF8F00' },
    other: { label: 'Other', icon: '⋯', color: '#F5F5F5', textColor: '#616161' },
};

export const paymentMethods = {
    cash: { label: 'Cash', icon: '💵' },
    credit_card: { label: 'Credit Card', icon: '💳' },
    debit_card: { label: 'Debit Card', icon: '💳' },
    bank_transfer: { label: 'Bank Transfer', icon: '🏦' },
    upi: { label: 'UPI', icon: '📲' },
    other: { label: 'Other', icon: '💱' },
};

export default {
    colors,
    borderRadius,
    spacing,
    shadows,
    typography,
    categories,
    paymentMethods,
};
