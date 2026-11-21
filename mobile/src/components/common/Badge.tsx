import React from 'react';
import { View, Text, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { rounded, typography } from '../../theme/tokens';
import { EntryStatus } from '../../types';

interface BadgeProps {
  status: EntryStatus | string;
  label?: string;
  style?: StyleProp<ViewStyle>;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  status,
  label,
  style,
  size = 'md',
}) => {
  const { colors, isDark } = useTheme();

  const normalized = (status || '').toLowerCase();

  let bg = colors.bgSubtle;
  let text = colors.textSecondary;
  let borderColor = colors.borderColor;
  let defaultLabel = 'BALANCED';

  if (normalized === 'profit' || normalized.includes('credit')) {
    bg = colors.success50;
    text = isDark ? colors.successText : colors.success600;
    borderColor = isDark ? colors.success100 : 'rgba(45, 106, 79, 0.2)';
    defaultLabel = 'PROFIT';
  } else if (normalized === 'loss' || normalized.includes('payable')) {
    bg = colors.danger50;
    text = isDark ? colors.dangerText : colors.danger600;
    borderColor = isDark ? colors.danger100 : 'rgba(255, 177, 177, 0.65)';
    defaultLabel = 'LOSS';
  } else if (normalized === 'balanced') {
    bg = colors.bgSubtle;
    text = colors.textSecondary;
    borderColor = colors.borderColor;
    defaultLabel = 'BALANCED';
  } else {
    defaultLabel = status.toUpperCase();
  }

  const displayText = label || defaultLabel;

  return (
    <View
      style={[
        {
          backgroundColor: bg,
          borderRadius: rounded.full,
          paddingHorizontal: size === 'sm' ? 8 : 10,
          paddingVertical: size === 'sm' ? 3 : 5,
          alignSelf: 'flex-start',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor,
        },
        style,
      ]}
    >
      <Text
        style={[
          typography.micro,
          {
            color: text,
            letterSpacing: 0.5,
            fontWeight: '700',
          },
        ]}
      >
        {displayText}
      </Text>
    </View>
  );
};
