import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { rounded, spacing, typography } from '../../theme/tokens';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  containerStyle?: StyleProp<ViewStyle>;
  rightElement?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  containerStyle,
  rightElement,
  style,
  ...rest
}) => {
  const { colors, isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[{ marginBottom: spacing.md }, containerStyle]}>
      <Text
        style={[
          typography.caption,
          {
            color: error ? colors.danger600 : colors.textSecondary,
            marginBottom: spacing.xs,
            fontWeight: '600',
            fontSize: 13,
          },
        ]}
      >
        {label}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: isDark ? colors.bgSubtle : '#ffffff',
          borderWidth: 1,
          borderColor: error
            ? colors.danger500
            : isFocused
            ? (isDark ? colors.accent : colors.primary600)
            : colors.borderColor,
          borderRadius: isDark ? 12 : 16,
          minHeight: 48,
          paddingHorizontal: spacing.md,
          overflow: 'hidden',
        }}
      >
        <TextInput
          {...rest}
          onFocus={(e) => {
            setIsFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            rest.onBlur?.(e);
          }}
          placeholderTextColor={colors.textMuted}
          style={[
            typography.body,
            {
              flex: 1,
              width: '100%',
              color: colors.textPrimary,
              paddingVertical: spacing.sm,
              fontSize: 15,
              ...(Platform.OS === 'web'
                ? ({
                    outlineStyle: 'none',
                    outlineWidth: 0,
                    outline: 'none',
                    boxShadow: 'none',
                  } as any)
                : {}),
            },
            style,
          ]}
        />
        {rightElement}
      </View>

      {error ? (
        <Text
          style={[
            typography.caption,
            { color: colors.danger600, marginTop: spacing.xs, fontSize: 11 },
          ]}
        >
          {error}
        </Text>
      ) : hint ? (
        <Text
          style={[
            typography.caption,
            { color: colors.textMuted, marginTop: spacing.xs, fontSize: 11 },
          ]}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
};
