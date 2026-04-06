import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';

export const formatCurrency = (amount: number, currency = 'INR'): string => {
    // Force INR if currency is USD (migration fix)
    const targetCurrency = currency === 'USD' ? 'INR' : currency;

    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: targetCurrency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
};

export const formatDate = (date: string | Date): string => {
    const d = new Date(date);

    if (isToday(d)) {
        return 'Today';
    }
    if (isYesterday(d)) {
        return 'Yesterday';
    }

    return format(d, 'dd MMM yyyy');
};

export const formatDateShort = (date: string | Date): string => {
    return format(new Date(date), 'dd MMM');
};

export const formatDateFull = (date: string | Date): string => {
    return format(new Date(date), 'EEEE, dd MMMM yyyy');
};

export const formatTime = (date: string | Date): string => {
    return format(new Date(date), 'hh:mm a');
};

export const formatRelativeTime = (date: string | Date): string => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
};

export const formatPercentage = (value: number): string => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
};

export const formatMonthYear = (date: string | Date): string => {
    return format(new Date(date), 'MMMM yyyy');
};

export const formatDayMonth = (date: string | Date): string => {
    return format(new Date(date), 'EEE, dd MMM');
};

export const getMonthName = (monthIndex: number): string => {
    const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return months[monthIndex];
};
