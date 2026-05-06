import { Ionicons } from '@expo/vector-icons';
import {
    addDays,
    addMonths,
    endOfMonth,
    endOfWeek,
    format,
    isSameDay,
    isSameMonth,
    startOfMonth,
    startOfWeek,
    subMonths,
} from 'date-fns';
import React, { useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';

import { borderRadius, elevation, makeStyles, spacing, typography, useTheme } from '../../theme';

interface CustomDatePickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (date: Date) => void;
    selectedDate: Date;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
    visible,
    onClose,
    onSelect,
    selectedDate,
}) => {
    const styles = useStyles();
    const { colors } = useTheme();
    const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));

    const handlePrevMonth = () => {
        setCurrentMonth(subMonths(currentMonth, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(addMonths(currentMonth, 1));
    };

    const handleDayPress = (day: Date) => {
        onSelect(day);
        onClose();
    };

    const renderCalendar = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const dateFormat = 'd';
        const rows = [];
        let days = [];
        let day = startDate;
        let formattedDate = '';

        const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        // Render Week Headers
        const header = (
            <View style={styles.weekRow} key="header">
                {weekDays.map((d, i) => (
                    <Text key={i} style={styles.weekDayText}>
                        {d}
                    </Text>
                ))}
            </View>
        );

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                formattedDate = format(day, dateFormat);
                const cloneDay = day;

                const isSelected = isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, monthStart);

                days.push(
                    <TouchableOpacity
                        key={day.toISOString()}
                        style={[
                            styles.dayCell,
                            isSelected && styles.selectedDayCell,
                            !isCurrentMonth && styles.disabledDayCell,
                        ]}
                        onPress={() => handleDayPress(cloneDay)}
                        disabled={!isCurrentMonth}
                    >
                        <Text
                            style={[
                                styles.dayText,
                                isSelected && styles.selectedDayText,
                                !isCurrentMonth && styles.disabledDayText,
                            ]}
                        >
                            {formattedDate}
                        </Text>
                        {isSelected && <View style={styles.selectedDot} />}
                    </TouchableOpacity>
                );
                // Safely increment day
                day = addDays(day, 1);
            }
            rows.push(
                <View style={styles.weekRow} key={day.toISOString()}>
                    {days}
                </View>
            );
            days = [];
        }

        return (
            <View>
                {header}
                {rows}
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={handlePrevMonth} style={styles.arrowButton}>
                            <Ionicons name="chevron-back" size={24} color={colors.textMain} />
                        </TouchableOpacity>
                        <Text style={styles.monthTitle}>
                            {format(currentMonth, 'MMMM yyyy')}
                        </Text>
                        <TouchableOpacity onPress={handleNextMonth} style={styles.arrowButton}>
                            <Ionicons name="chevron-forward" size={24} color={colors.textMain} />
                        </TouchableOpacity>
                    </View>

                    {/* Calendar Grid */}
                    <View style={styles.calendarContainer}>{renderCalendar()}</View>

                    {/* Footer Actions */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Text style={styles.closeButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.todayButton}
                            onPress={() => {
                                const today = new Date();
                                onSelect(today);
                                onClose();
                            }}
                        >
                            <Text style={styles.todayButtonText}>Today</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const useStyles = makeStyles((c, isDark) => ({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Dimmed background
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    modalContainer: {
        width: '100%',
        backgroundColor: c.cardBg,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        ...elevation(isDark).cardHeavy,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    monthTitle: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: typography.sizes.lg,
        color: c.textMain,
    },
    arrowButton: {
        padding: spacing.xs,
        backgroundColor: c.inputBg,
        borderRadius: borderRadius.full,
    },
    calendarContainer: {
        marginBottom: spacing.lg,
    },
    weekRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    weekDayText: {
        width: 40,
        textAlign: 'center',
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.xs,
        color: c.textSecondary,
        textTransform: 'uppercase',
    },
    dayCell: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: borderRadius.full,
    },
    selectedDayCell: {
        backgroundColor: c.primary,
        ...elevation(isDark).card,
    },
    disabledDayCell: {
        opacity: 0.3,
    },
    dayText: {
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.sizes.md,
        color: c.textMain,
    },
    selectedDayText: {
        fontFamily: typography.fontFamily.semiBold,
        color: c.textWhite,
    },
    disabledDayText: {
        color: c.textLight,
    },
    selectedDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: c.textWhite,
        position: 'absolute',
        bottom: 4,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: c.inputBg,
        paddingTop: spacing.md,
    },
    closeButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
    },
    closeButtonText: {
        fontFamily: typography.fontFamily.medium,
        color: c.textSecondary,
        fontSize: typography.sizes.md,
    },
    todayButton: {
        backgroundColor: c.inputBg,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.md,
    },
    todayButtonText: {
        fontFamily: typography.fontFamily.semiBold,
        color: c.primary,
        fontSize: typography.sizes.md,
    },
}));
