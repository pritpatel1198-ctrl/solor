import React from 'react';
import { View, StyleSheet, Platform, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../theme/ThemeContext';

interface GlassTabBarBackgroundProps {
  style?: StyleProp<ViewStyle>;
}

export const GlassTabBarBackground: React.FC<GlassTabBarBackgroundProps> = ({ style }) => {
  const { isDark } = useTheme();

  return (
    <View style={[styles.outerContainer, style]}>
      {/* NATIVE / WEB BLUR LAYER */}
      <BlurView
        intensity={Platform.OS === 'ios' ? 70 : 80}
        tint={isDark ? 'dark' : 'light'}
        style={[
          StyleSheet.absoluteFill,
          styles.blurRadius,
          Platform.OS === 'web'
            ? ({
                backdropFilter: 'blur(20px) saturate(160%)',
                WebkitBackdropFilter: 'blur(20px) saturate(160%)',
              } as any)
            : undefined,
        ]}
      />

      {/* TRANSLUCENT OVERLAY */}
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.blurRadius,
          {
            backgroundColor: isDark
              ? 'rgba(23, 28, 38, 0.92)'
              : 'rgba(255, 252, 245, 0.86)',
          },
        ]}
      />

      {/* SUBTLE SPECULAR RIM HIGHLIGHT */}
      <View
        style={[
          styles.innerHighlight,
          {
            borderColor: isDark
              ? '#232a38'
              : 'rgba(240, 225, 210, 0.60)',
            borderTopColor: isDark
              ? '#333d4e'
              : 'rgba(255, 255, 255, 0.95)',
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    ...StyleSheet.absoluteFill,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: Platform.OS === 'ios' ? 0.20 : 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  blurRadius: {
    borderRadius: 32,
  },
  innerHighlight: {
    ...StyleSheet.absoluteFill,
    borderRadius: 32,
    borderWidth: 1,
  },
});
