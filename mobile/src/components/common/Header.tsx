import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, typography } from '../../theme/tokens';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onBack,
  rightAction,
  style,
}) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        {
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
          paddingBottom: spacing.sm,
          backgroundColor: colors.bgApp,
        },
        style,
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flex: 1 }}>
          {onBack && (
            <TouchableOpacity
              onPress={onBack}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={{
                marginBottom: spacing.xs,
                alignSelf: 'flex-start',
                minWidth: 44,
                minHeight: 44,
                justifyContent: 'center',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <ChevronLeft size={20} color={colors.primary600} strokeWidth={2.2} />
                <Text style={{ fontSize: 15, color: colors.primary600, fontWeight: '600' }}>
                  Back
                </Text>
              </View>
            </TouchableOpacity>
          )}
          <Text
            style={[
              typography.title,
              { color: colors.textPrimary, letterSpacing: -0.3 },
            ]}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[
                typography.caption,
                { color: colors.textSecondary, marginTop: 2 },
              ]}
            >
              {subtitle}
            </Text>
          )}
        </View>

        {rightAction && <View style={{ marginLeft: spacing.md }}>{rightAction}</View>}
      </View>
    </View>
  );
};
