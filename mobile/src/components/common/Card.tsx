import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { rounded, shadows, spacing } from '../../theme/tokens';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'elevated' | 'outlined' | 'subtle' | 'hero';
  padding?: keyof typeof spacing | number;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'elevated',
  padding = 'md',
}) => {
  const { colors, isDark } = useTheme();

  const padVal = typeof padding === 'number' ? padding : spacing[padding];

  let bg = colors.bgSurface;
  let borderColor = colors.borderColor;

  if (variant === 'subtle') {
    bg = colors.bgSubtle;
  } else if (variant === 'hero') {
    bg = isDark ? colors.heroCardBg : colors.bgSurface;
    borderColor = isDark ? colors.heroCardBorder : colors.borderColor;
  } else if (variant === 'elevated') {
    bg = isDark ? colors.bgSurfaceElevated : colors.bgSurface;
  }

  const containerStyle: ViewStyle = {
    backgroundColor: bg,
    borderColor,
    borderWidth: 1,
    borderRadius: isDark ? 16 : rounded.lg,
    padding: padVal,
    ...(variant === 'elevated' && !isDark ? shadows.sm : {}),
    ...(variant === 'hero' && !isDark ? shadows.md : {}),
  };

  return <View style={[containerStyle, style]}>{children}</View>;
};
