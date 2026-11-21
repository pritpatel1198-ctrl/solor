import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, typography } from '../../theme/tokens';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionTitle?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionTitle,
  onAction,
  style,
}) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: spacing.xl,
          paddingHorizontal: spacing.lg,
        },
        style,
      ]}
    >
      {icon && <View style={{ marginBottom: spacing.md }}>{icon}</View>}
      <Text
        style={[
          typography.headline,
          { color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.xs },
        ]}
      >
        {title}
      </Text>
      {description && (
        <Text
          style={[
            typography.body,
            { color: colors.textMuted, textAlign: 'center', marginBottom: spacing.md },
          ]}
        >
          {description}
        </Text>
      )}
      {actionTitle && onAction && (
        <Button
          title={actionTitle}
          onPress={onAction}
          variant="primary"
          size="sm"
          style={{ marginTop: spacing.xs }}
        />
      )}
    </View>
  );
};
