import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { rounded, spacing, typography } from '../theme/tokens';
import { api, setAuthToken } from '../api/client';
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Eye, EyeOff, SunMedium, Zap } from 'lucide-react-native';

interface AuthScreenProps {
  navigation: any;
  onLoginSuccess?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ navigation, onLoginSuccess }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return;
    }
    if (!password || password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      await api.login(email, password);
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        navigation.replace('MainTabs');
      }
    } catch (err: any) {
      Alert.alert('Authentication Failed', err.message || 'Check your credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setAuthToken('demo-token');
    if (onLoginSuccess) {
      onLoginSuccess();
    } else {
      navigation.replace('MainTabs');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.bgApp }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          padding: spacing.lg,
          paddingTop: Math.max(insets.top + 20, 40),
          paddingBottom: Math.max(insets.bottom + 20, 40),
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* HERO BRAND GRAPHIC (Apple style like Image 1 & 3) */}
        <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: colors.accentSubtle,
              borderWidth: 1,
              borderColor: colors.borderColor,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.md,
            }}
          >
            <SunMedium size={40} color={colors.accent} strokeWidth={2} />
          </View>
          <Text
            style={[
              typography.display,
              {
                color: colors.textPrimary,
                letterSpacing: -0.8,
                textAlign: 'center',
                fontSize: 28,
                fontWeight: '800',
              },
            ]}
          >
            Solar Revenue
          </Text>
          <Text
            style={[
              typography.body,
              {
                color: colors.textMuted,
                marginTop: 6,
                textAlign: 'center',
                fontSize: 14,
                maxWidth: 280,
                lineHeight: 20,
              },
            ]}
          >
            Smart bi-directional rooftop metering and DISCOM net billing settlement
          </Text>
        </View>

        {/* AUTH CARD */}
        <Card style={{ padding: spacing.lg, marginBottom: spacing.lg, borderRadius: 24 }}>
          <Text style={[typography.title, { color: colors.textPrimary, fontSize: 18, marginBottom: 4 }]}>
            Sign In
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.lg }]}>
            Enter your account details to access your live portal
          </Text>

          <Input
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="operator@solar.com"
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
            placeholder="••••••••"
            rightElement={
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                accessibilityState={{ selected: showPassword }}
                hitSlop={8}
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                {showPassword ? (
                  <EyeOff size={20} color={colors.textSecondary} strokeWidth={2} />
                ) : (
                  <Eye size={20} color={colors.textSecondary} strokeWidth={2} />
                )}
              </TouchableOpacity>
            }
          />

          <Button
            title="Sign In"
            onPress={handleSubmit}
            variant="primary"
            size="lg"
            loading={loading}
            style={{ marginTop: spacing.xs, borderRadius: 28 }}
          />

        </Card>

        {/* QUICK DEMO ACCESS PILL: development builds only (works only against a server without Supabase configured) */}
        {__DEV__ && <Button
          title="Instant Demo Access (No Credentials)"
          icon={<Zap size={16} color={colors.textPrimary} strokeWidth={2.2} />}
          onPress={handleDemoLogin}
          variant="outline"
          size="md"
          style={{ borderRadius: 28 }}
        />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
