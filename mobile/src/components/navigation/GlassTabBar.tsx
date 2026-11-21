import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  House,
  NotebookTabs,
  Plus,
  BarChart3,
  Settings,
} from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { GlassTabBarBackground } from './GlassTabBarBackground';

const TAB_LABELS: Record<string, string> = {
  DashboardTab: 'Home',
  RecordsTab: 'Records',
  ReportsTab: 'Reports',
  SettingsTab: 'Settings',
};

export const GlassTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const TAB_BAR_HEIGHT = 64;
  const bottomInset = Platform.OS === 'ios' ? Math.max(insets.bottom, 16) : 16;

  const renderTabIcon = (routeName: string, isFocused: boolean) => {
    const iconColor = isFocused ? colors.accent : colors.textMuted;
    const strokeWidth = isFocused ? 2.2 : 1.8;
    const size = 22;

    switch (routeName) {
      case 'DashboardTab':
        return <House size={size} color={iconColor} strokeWidth={strokeWidth} />;
      case 'RecordsTab':
        return <NotebookTabs size={size} color={iconColor} strokeWidth={strokeWidth} />;
      case 'ReportsTab':
        return <BarChart3 size={size} color={iconColor} strokeWidth={strokeWidth} />;
      case 'SettingsTab':
        return <Settings size={size} color={iconColor} strokeWidth={strokeWidth} />;
      default:
        return null;
    }
  };

  return (
    <View
      style={[
        styles.wrapper,
        {
          bottom: bottomInset,
          height: TAB_BAR_HEIGHT,
        },
      ]}
    >
      <GlassTabBarBackground />

      <View style={[styles.row, { height: TAB_BAR_HEIGHT }]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const isCenter = route.name === 'DailyEntryTab';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          // CENTER ACTION BUTTON (+) - ELEGANT ACCENT
          if (isCenter) {
            return (
              <View key={route.key} style={styles.tabItem}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={options.tabBarAccessibilityLabel || 'Log Daily Reading'}
                  testID={options.tabBarButtonTestID}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  activeOpacity={0.82}
                  style={[
                    styles.centerButton,
                    {
                      backgroundColor: colors.accent,
                      shadowColor: colors.accent,
                    },
                  ]}
                >
                  <Plus size={26} color={colors.accentText} strokeWidth={2.4} />
                </TouchableOpacity>
              </View>
            );
          }

          // STANDARD TAB BUTTON
          return (
            <View key={route.key} style={styles.tabItem}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel || TAB_LABELS[route.name]}
                testID={options.tabBarButtonTestID}
                onPress={onPress}
                onLongPress={onLongPress}
                activeOpacity={0.7}
                style={[
                  styles.tabButton,
                  isFocused && {
                    backgroundColor: colors.accentSubtle,
                    borderWidth: 1,
                    borderColor: isDark
                      ? 'rgba(224, 122, 95, 0.35)'
                      : 'rgba(217, 108, 74, 0.25)',
                  },
                ]}
              >
                {renderTabIcon(route.name, isFocused)}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 32,
    zIndex: 100,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
    width: '100%',
  },
  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  iconText: {
    fontSize: 20,
    lineHeight: 22,
    textAlign: 'center',
    includeFontPadding: false,
  },
  centerIconText: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 28,
    textAlign: 'center',
    includeFontPadding: false,
  },
});
