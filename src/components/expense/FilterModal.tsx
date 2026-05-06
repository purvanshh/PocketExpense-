import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Modal,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { borderRadius, categories, makeStyles, spacing, typography, useTheme } from '../../theme';
import { Button } from '../common/Button';

export interface FilterState {
    category: string | null;
    type: 'all' | 'expense' | 'income';
    startDate: Date | null;
    endDate: Date | null;
    sort: string;
}

interface FilterModalProps {
    visible: boolean;
    onClose: () => void;
    onApply: (filters: FilterState) => void;
    initialFilters: FilterState;
}

const sortOptions = [
    { value: '-date', label: 'Newest First' },
    { value: 'date', label: 'Oldest First' },
    { value: '-amount', label: 'Highest Amount' },
    { value: 'amount', label: 'Lowest Amount' },
];

export const FilterModal: React.FC<FilterModalProps> = ({
    visible,
    onClose,
    onApply,
    initialFilters,
}) => {
    const styles = useStyles();
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [filters, setFilters] = useState<FilterState>(initialFilters);

    const handleReset = () => {
        setFilters({
            category: null,
            type: 'all',
            startDate: null,
            endDate: null,
            sort: '-date',
        });
    };

    const handleApply = () => {
        onApply(filters);
        onClose();
    };

    const allCategories = Object.entries(categories);

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={[styles.content, { paddingBottom: insets.bottom + spacing.lg }]}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Filters</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.textMain} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.sectionTitle}>Type</Text>
                        <View style={styles.chipRow}>
                            {(['all', 'expense', 'income'] as const).map((t) => (
                                <TouchableOpacity
                                    key={t}
                                    style={[styles.chip, filters.type === t && styles.chipActive]}
                                    onPress={() => setFilters({ ...filters, type: t })}
                                >
                                    <Text style={[styles.chipText, filters.type === t && styles.chipTextActive]}>
                                        {t.charAt(0).toUpperCase() + t.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.sectionTitle}>Sort By</Text>
                        <View style={styles.chipRow}>
                            {sortOptions.map((opt) => (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={[styles.chip, filters.sort === opt.value && styles.chipActive]}
                                    onPress={() => setFilters({ ...filters, sort: opt.value })}
                                >
                                    <Text style={[styles.chipText, filters.sort === opt.value && styles.chipTextActive]}>
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.sectionTitle}>Category</Text>
                        <View style={styles.chipRow}>
                            <TouchableOpacity
                                style={[styles.chip, !filters.category && styles.chipActive]}
                                onPress={() => setFilters({ ...filters, category: null })}
                            >
                                <Text style={[styles.chipText, !filters.category && styles.chipTextActive]}>All</Text>
                            </TouchableOpacity>
                            {allCategories.map(([key, cat]) => (
                                <TouchableOpacity
                                    key={key}
                                    style={[styles.chip, filters.category === key && styles.chipActive]}
                                    onPress={() => setFilters({ ...filters, category: key })}
                                >
                                    <Text style={styles.chipEmoji}>{cat.icon}</Text>
                                    <Text style={[styles.chipText, filters.category === key && styles.chipTextActive]}>
                                        {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.sectionTitle}>Date Range</Text>
                        <View style={styles.datePresetsRow}>
                            {[
                                { label: 'This Week', days: 7 },
                                { label: 'This Month', days: 30 },
                                { label: '3 Months', days: 90 },
                                { label: 'All Time', days: 0 },
                            ].map((preset) => (
                                <TouchableOpacity
                                    key={preset.label}
                                    style={styles.datePreset}
                                    onPress={() => {
                                        if (preset.days === 0) {
                                            setFilters({ ...filters, startDate: null, endDate: null });
                                        } else {
                                            const start = new Date();
                                            start.setDate(start.getDate() - preset.days);
                                            setFilters({ ...filters, startDate: start, endDate: new Date() });
                                        }
                                    }}
                                >
                                    <Text style={styles.datePresetText}>{preset.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
                            <Text style={styles.resetText}>Reset</Text>
                        </TouchableOpacity>
                        <Button title="Apply Filters" onPress={handleApply} style={{ flex: 1 }} />
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const useStyles = makeStyles((c, isDark) => ({
    overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
    content: {
        backgroundColor: c.cardBg,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        padding: spacing.xl,
        maxHeight: '80%',
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
    title: { fontFamily: typography.fontFamily.bold, fontSize: typography.sizes.xl, color: c.textMain },
    sectionTitle: {
        fontFamily: typography.fontFamily.semiBold,
        fontSize: typography.sizes.md,
        color: c.textMain,
        marginTop: spacing.xl,
        marginBottom: spacing.md,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: c.inputBg,
        borderRadius: borderRadius.full,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        gap: spacing.xs,
    },
    chipActive: { backgroundColor: c.primary },
    chipText: { fontFamily: typography.fontFamily.medium, fontSize: typography.sizes.sm, color: c.textSecondary },
    chipTextActive: { color: c.textWhite },
    chipEmoji: { fontSize: 14 },
    datePresetsRow: { flexDirection: 'row', gap: spacing.sm },
    datePreset: {
        flex: 1,
        paddingVertical: spacing.md,
        alignItems: 'center',
        backgroundColor: c.inputBg,
        borderRadius: borderRadius.md,
    },
    datePresetText: { fontFamily: typography.fontFamily.medium, fontSize: typography.sizes.xs, color: c.textMain },
    actionRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl, alignItems: 'center' },
    resetBtn: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
    resetText: { fontFamily: typography.fontFamily.medium, fontSize: typography.sizes.md, color: c.textSecondary },
}));
