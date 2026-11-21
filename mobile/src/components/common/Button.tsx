import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { rounded, spacing, typography } from '../../theme/tokens';

export type ButtonVariant = 'accent' | 'primary' | 'secondary' | 'outline' | 'danger';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  pill?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'accent',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  accessibilityLabel,
  pill = true,
}) => {
  const { colors, isDark } = useTheme();

  const getContainerStyle = (): ViewStyle => {
    let bg = colors.accent;
    let border = 'transparent';

    if (variant === 'primary') {
      bg = isDark ? colors.accent : colors.accent;
    } else if (variant === 'secondary') {
      bg = isDark ? colors.bgSurfaceElevated : colors.bgSubtle;
      border = colors.borderColor;
    } else if (variant === 'outline') {
      bg = 'transparent';
      border = colors.borderColor;
    } else if (variant === 'danger') {
      bg = colors.danger600;
    }

    const minHeight = size === 'sm' ? 38 : (size === 'lg' ? 54 : 48);
    const paddingHorizontal = size === 'sm' ? 14 : (size === 'lg' ? 24 : 18);

    return {
      backgroundColor: bg,
      borderColor: border,
      borderWidth: variant === 'outline' || variant === 'secondary' ? 1 : 0,
      borderRadius: pill ? rounded.full : rounded.md,
      minHeight,
      paddingHorizontal,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      opacity: disabled || loading ? 0.55 : 1,
    };
  };

  const getTextColor = (): string => {
    if (variant === 'accent' || variant === 'primary') {
      return colors.accentText;
    }
    if (variant === 'danger') {
      return '#ffffff';
    }
    return colors.textPrimary;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.78}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={[getContainerStyle(), style]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={[
              typography.headline,
              {
                color: getTextColor(),
                fontSize: size === 'sm' ? 13 : (size === 'lg' ? 16 : 15),
                fontWeight: '700',
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};
