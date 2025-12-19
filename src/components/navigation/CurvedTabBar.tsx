import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { colors, shadows, spacing } from '../../theme';

const { width } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 70;
const CURVE_HEIGHT = 30;

interface TabBarIconProps {
    name: keyof typeof Ionicons.glyphMap;
    focused: boolean;
}

const TabBarIcon: React.FC<TabBarIconProps> = ({ name, focused }) => (
    <View style={styles.iconContainer}>
        <Ionicons
            name={name}
            size={24}
            color={focused ? colors.primary : colors.textSecondary}
        />
        {focused && <View style={styles.activeIndicator} />}
    </View>
);

export const CurvedTabBar: React.FC<BottomTabBarProps> = ({
    state,
    descriptors,
    navigation,
}) => {
    const insets = useSafeAreaInsets();

    const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
        index: 'home',
        transactions: 'receipt',
        analytics: 'stats-chart',
        account: 'person',
    };

    // SVG path for the curved cutout
    const curvedPath = `
    M 0 ${CURVE_HEIGHT}
    L 0 ${TAB_BAR_HEIGHT + insets.bottom}
    L ${width} ${TAB_BAR_HEIGHT + insets.bottom}
    L ${width} ${CURVE_HEIGHT}
    C ${width * 0.75} ${CURVE_HEIGHT} ${width * 0.65} 0 ${width / 2} 0
    C ${width * 0.35} 0 ${width * 0.25} ${CURVE_HEIGHT} 0 ${CURVE_HEIGHT}
    Z
  `;

    const handleAddPress = () => {
        navigation.navigate('expense/add');
    };

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
            {/* Curved Background */}
            <Svg
                width={width}
                height={TAB_BAR_HEIGHT + insets.bottom}
                style={styles.svgBackground}
            >
                <Path d={curvedPath} fill={colors.cardBg} />
            </Svg>

            {/* FAB Button */}
            <TouchableOpacity
                style={styles.fabButton}
                onPress={handleAddPress}
                activeOpacity={0.8}
            >
                <Ionicons name="add" size={32} color={colors.textWhite} />
            </TouchableOpacity>

            {/* Tab Buttons */}
            <View style={styles.tabsContainer}>
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const isFocused = state.index === index;

                    const onPress = () => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name);
                        }
                    };

                    // Skip middle position for FAB
                    if (index === 2) {
                        return (
                            <React.Fragment key={route.key}>
                                <View style={styles.fabPlaceholder} />
                                <TouchableOpacity
                                    style={styles.tabButton}
                                    onPress={onPress}
                                    activeOpacity={0.7}
                                >
                                    <TabBarIcon
                                        name={icons[route.name] || 'ellipse'}
                                        focused={isFocused}
                                    />
                                </TouchableOpacity>
                            </React.Fragment>
                        );
                    }

                    return (
                        <TouchableOpacity
                            key={route.key}
                            style={styles.tabButton}
                            onPress={onPress}
                            activeOpacity={0.7}
                        >
                            <TabBarIcon
                                name={icons[route.name] || 'ellipse'}
                                focused={isFocused}
                            />
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: TAB_BAR_HEIGHT + 60,
        ...shadows.tabBar,
    },
    svgBackground: {
        position: 'absolute',
        bottom: 0,
    },
    tabsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: TAB_BAR_HEIGHT,
        paddingTop: CURVE_HEIGHT,
        paddingHorizontal: spacing.lg,
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fabPlaceholder: {
        width: 70,
    },
    fabButton: {
        position: 'absolute',
        top: 0,
        left: width / 2 - 30,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.primaryDark,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.fab,
    },
    iconContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xs,
    },
    activeIndicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.primary,
        marginTop: 4,
    },
});

export default CurvedTabBar;
