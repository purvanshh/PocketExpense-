// PocketExpense+ colour palettes — violet glassmorphism, light and dark.
//
// Both palettes expose exactly the same keys so a component can read
// `useTheme().colors.textMain` without caring which mode is active.

export const lightColors = {
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
    // Raised surface used where a card sits on top of another card
    surfaceElevated: '#FFFFFF',
    border: '#ECEEF5',

    // Text Colors
    textMain: '#1C1C1E',
    textSecondary: '#8E8E93',
    textLight: '#BDBDBD',
    textWhite: '#FFFFFF',
    // Text drawn on top of the violet gradient header
    textOnGradient: '#1C1C1E',

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
    // Translucent chip background on the gradient header
    glass: 'rgba(255, 255, 255, 0.3)',
};

export const darkColors: typeof lightColors = {
    // Primary Brand Colors — the gradient darkens so white text stays readable
    gradientStart: '#5B3FA8',
    gradientEnd: '#2E1F52',
    primary: '#A98BFF',
    primaryDark: '#0E0916',
    primaryLight: '#C4A6FE',

    // Secondary Accent
    secondary: '#A8D98A',

    // Backgrounds
    background: '#0F0D14',
    cardBg: '#1A1720',
    inputBg: '#232029',
    surfaceElevated: '#252130',
    border: '#302B3A',

    // Text Colors
    textMain: '#F2F0F7',
    textSecondary: '#9B95A8',
    textLight: '#6B6577',
    textWhite: '#FFFFFF',
    textOnGradient: '#F2F0F7',

    // Status Colors — desaturated so they don't glow on a dark ground
    success: '#3ED16A',
    successBg: '#16301D',
    error: '#FF6961',
    errorBg: '#3A1D1C',
    warning: '#FFA726',
    warningBg: '#3A2A14',
    info: '#4DA3FF',
    infoBg: '#152738',

    // Chart Colors
    chartPurple: '#A98BFF',
    chartLime: '#A8D98A',
    chartBlue: '#5AC8FA',
    chartOrange: '#FFA726',

    // Overlay
    overlay: 'rgba(0, 0, 0, 0.7)',
    glass: 'rgba(255, 255, 255, 0.08)',
};

export type ThemeColors = typeof lightColors;

// Category configuration. `color`/`textColor` are the light-mode chip tints;
// `darkColor`/`darkTextColor` are the dark-mode equivalents.
export const categories = {
    groceries: { label: 'Groceries', icon: '🛒', color: '#FFE4C4', textColor: '#8B4513', darkColor: '#3D2E1E', darkTextColor: '#E8B98A' },
    travel: { label: 'Travel', icon: '✈️', color: '#E8DAEF', textColor: '#6C3483', darkColor: '#2E2338', darkTextColor: '#C79FE0' },
    car: { label: 'Car', icon: '🚗', color: '#D6EAF8', textColor: '#2471A3', darkColor: '#1B2C3A', darkTextColor: '#7FB8E0' },
    home: { label: 'Home', icon: '🏠', color: '#FCE4EC', textColor: '#C2185B', darkColor: '#3A1E28', darkTextColor: '#F08FB4' },
    insurance: { label: 'Insurance', icon: '✅', color: '#E8F8F5', textColor: '#1ABC9C', darkColor: '#12302B', darkTextColor: '#5FD9C0' },
    education: { label: 'Education', icon: '🎓', color: '#FFF9C4', textColor: '#F9A825', darkColor: '#3A3416', darkTextColor: '#E8C55C' },
    marketing: { label: 'Marketing', icon: '📈', color: '#E8F5E9', textColor: '#388E3C', darkColor: '#1B2E1C', darkTextColor: '#7CC47F' },
    shopping: { label: 'Shopping', icon: '🛍️', color: '#FFE0B2', textColor: '#E65100', darkColor: '#3A2814', darkTextColor: '#F0A45C' },
    internet: { label: 'Internet', icon: '📶', color: '#E1F5FE', textColor: '#0277BD', darkColor: '#152F3D', darkTextColor: '#6BB8E0' },
    water: { label: 'Water', icon: '💧', color: '#E3F2FD', textColor: '#1565C0', darkColor: '#16283D', darkTextColor: '#6FA8E0' },
    rent: { label: 'Rent', icon: '🔑', color: '#FFEBEE', textColor: '#C62828', darkColor: '#3A1C1C', darkTextColor: '#EF8A8A' },
    gym: { label: 'Gym', icon: '🏋️', color: '#F3E5F5', textColor: '#7B1FA2', darkColor: '#2E1F36', darkTextColor: '#C88FDC' },
    subscription: { label: 'Subscription', icon: '📱', color: '#EDE7F6', textColor: '#512DA8', darkColor: '#241E38', darkTextColor: '#A692E0' },
    vacation: { label: 'Vacation', icon: '🌴', color: '#E0F2F1', textColor: '#00695C', darkColor: '#122E2A', darkTextColor: '#5CC4B4' },
    food: { label: 'Food', icon: '🍕', color: '#FFF3E0', textColor: '#EF6C00', darkColor: '#3A2A16', darkTextColor: '#F0A65C' },
    entertainment: { label: 'Entertainment', icon: '🎬', color: '#E8EAF6', textColor: '#303F9F', darkColor: '#1E2138', darkTextColor: '#8F9BE0' },
    salary: { label: 'Salary', icon: '💰', color: '#E8F5E9', textColor: '#2E7D32', darkColor: '#1B2E1C', darkTextColor: '#7CC47F' },
    freelance: { label: 'Freelance', icon: '💼', color: '#E0F7FA', textColor: '#00838F', darkColor: '#122E32', darkTextColor: '#5CC0CC' },
    investment: { label: 'Investment', icon: '📊', color: '#FFF8E1', textColor: '#FF8F00', darkColor: '#3A3216', darkTextColor: '#E8B85C' },
    other: { label: 'Other', icon: '⋯', color: '#F5F5F5', textColor: '#616161', darkColor: '#2A2733', darkTextColor: '#9B95A8' },
};

export type CategoryKey = keyof typeof categories;

/** Resolve a category's chip tint for the active scheme. */
export const categoryTint = (key: string, isDark: boolean) => {
    const c = categories[key as CategoryKey] || categories.other;
    return {
        label: c.label,
        icon: c.icon,
        color: isDark ? c.darkColor : c.color,
        textColor: isDark ? c.darkTextColor : c.textColor,
    };
};

export const paymentMethods = {
    cash: { label: 'Cash', icon: '💵' },
    credit_card: { label: 'Credit Card', icon: '💳' },
    debit_card: { label: 'Debit Card', icon: '💳' },
    bank_transfer: { label: 'Bank Transfer', icon: '🏦' },
    upi: { label: 'UPI', icon: '📲' },
    other: { label: 'Other', icon: '💱' },
};
