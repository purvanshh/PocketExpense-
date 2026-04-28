import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { borderRadius, categoryTint, makeStyles, spacing, typography, useTheme } from '../../theme';

interface CategoryGridProps {
    selectedCategory: string;
    onSelectCategory: (category: string) => void;
    type?: 'expense' | 'income';
}

const EXPENSE_CATEGORIES = [
    'groceries', 'travel', 'car', 'home', 'insurance', 'education',
    'marketing', 'shopping', 'internet', 'water', 'rent', 'gym',
    'subscription', 'vacation', 'food', 'entertainment', 'other',
];

const INCOME_CATEGORIES = ['salary', 'freelance', 'investment', 'other'];

export const CategoryGrid: React.FC<CategoryGridProps> = ({
    selectedCategory,
    onSelectCategory,
    type = 'expense',
}) => {
    const styles = useStyles();
    const { isDark } = useTheme();

    const categoryList = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

    return (
        <View style={styles.container}>
            <View style={styles.grid}>
                {categoryList.map((key) => {
                    const category = categoryTint(key, isDark);
                    const isSelected = selectedCategory === key;

                    return (
                        <TouchableOpacity
                            key={key}
                            style={[
                                styles.categoryItem,
                                isSelected && styles.selectedItem,
                            ]}
                            onPress={() => onSelectCategory(key)}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel={category.label}
                            accessibilityState={{ selected: isSelected }}
                        >
                            <View
                                style={[
                                    styles.iconContainer,
                                    { backgroundColor: category.color },
                                    isSelected && styles.selectedIconContainer,
                                ]}
                            >
                                <Text style={styles.icon}>{category.icon}</Text>
                            </View>
                            <Text
                                style={[
                                    styles.label,
                                    isSelected && styles.selectedLabel,
                                ]}
                                numberOfLines={1}
                            >
                                {category.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const useStyles = makeStyles((c) => ({
    container: {
        width: '100%',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    categoryItem: {
        width: '25%',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
    },
    selectedItem: {
        backgroundColor: c.inputBg,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xs,
    },
    selectedIconContainer: {
        borderWidth: 3,
        borderColor: c.primary,
    },
    icon: {
        fontSize: 26,
    },
    label: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.xs,
        color: c.textSecondary,
        textAlign: 'center',
    },
    selectedLabel: {
        color: c.primary,
        fontFamily: typography.fontFamily.semiBold,
    },
}));

export default CategoryGrid;
