import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { borderRadius, categories, colors, spacing, typography } from '../../theme';

interface CategoryGridProps {
    selectedCategory: string;
    onSelectCategory: (category: string) => void;
    type?: 'expense' | 'income';
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({
    selectedCategory,
    onSelectCategory,
    type = 'expense',
}) => {
    // Filter categories based on type
    const expenseCategories = [
        'groceries', 'travel', 'car', 'home', 'insurance', 'education',
        'marketing', 'shopping', 'internet', 'water', 'rent', 'gym',
        'subscription', 'vacation', 'food', 'entertainment', 'other',
    ];

    const incomeCategories = ['salary', 'freelance', 'investment', 'other'];

    const categoryList = type === 'expense' ? expenseCategories : incomeCategories;

    return (
        <View style={styles.container}>
            <View style={styles.grid}>
                {categoryList.map((key) => {
                    const category = categories[key as keyof typeof categories];
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

const styles = StyleSheet.create({
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
    },
    selectedItem: {},
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
        borderColor: colors.primary,
    },
    icon: {
        fontSize: 26,
    },
    label: {
        fontFamily: typography.fontFamily.medium,
        fontSize: typography.sizes.xs,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    selectedLabel: {
        color: colors.primary,
        fontFamily: typography.fontFamily.semiBold,
    },
});

export default CategoryGrid;
