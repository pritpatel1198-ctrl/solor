import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { rounded, spacing, typography, shadows } from '../theme/tokens';
import { api, getApiBaseUrl, setApiBaseUrl, setAuthToken } from '../api/client';
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Header } from '../components/common/Header';
import { downloadOrShareTextFile } from '../utils/exportUtils';
import { localDateStr } from '../utils/date';
import {
  Zap,
  Sun,
  Moon,
  Globe,
  Check,
  User,
  LogOut,
  Download,
  Upload,
  Database,
  X,
} from 'lucide-react-native';

interface SettingsScreenProps {
  navigation?: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();

  const [buyingRate, setBuyingRate] = useState('2.25');
  const [sellingRate, setSellingRate] = useState('2.25');
  const [currency, setCurrency] = useState('₹');
  const [apiUrl, setApiUrl] = useState(getApiBaseUrl());

  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Restore Modal State
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [restoreJsonInput, setRestoreJsonInput] = useState('');
  const [restoreLoading, setRestoreLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [settingsRes, meRes] = await Promise.allSettled([
          api.getSettings(),
          api.getMe(),
        ]);

        if (settingsRes.status === 'fulfilled' && settingsRes.value) {
          const settings = settingsRes.value;
          if (settings.default_buying_rate) setBuyingRate(String(settings.default_buying_rate));
          if (settings.default_selling_rate) setSellingRate(String(settings.default_selling_rate));
          if (settings.currency) setCurrency(settings.currency);
        }

        if (meRes.status === 'fulfilled' && meRes.value) {
          setUser(meRes.value);
        } else {
          setUser(null);
        }
      } catch (err: any) {
        console.warn('Failed to load settings:', err.message);
      } finally {
        setFetching(false);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    try {
      setLoading(true);
      if (apiUrl) {
        setApiBaseUrl(apiUrl);
      }

      await api.updateSettings({
        default_buying_rate: parseFloat(buyingRate) || 2.25,
        default_selling_rate: parseFloat(sellingRate) || 2.25,
        currency,
      });

      Alert.alert('Settings Saved', 'Your tariff preferences have been updated!');
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Could not update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out from Solar Revenue Tracker?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            // Revoke this device's session, without blocking sign-out on a slow network
            await Promise.race([api.logout(), new Promise((resolve) => setTimeout(resolve, 4000))]);
          } catch (err: any) {
            console.warn('Could not revoke session on the server:', err.message);
          }
          setAuthToken(null);
        },
      },
    ]);
  };

  // Export JSON Backup (Matching Web feature)
  const handleExportBackup = async () => {
    try {
      setLoading(true);
      const backupData = await api.exportBackup();
      const jsonContent = JSON.stringify(backupData, null, 2);
      const filename = `solar_tracker_backup_${localDateStr()}.json`;
      downloadOrShareTextFile(filename, jsonContent, 'application/json');
      Alert.alert('Backup Exported', 'Complete solar dataset backup file has been generated.');
    } catch (err: any) {
      Alert.alert('Backup Error', err.message || 'Failed to export backup data');
    } finally {
      setLoading(false);
    }
  };

  // Import JSON Backup (Matching Web feature)
  const handleRestoreBackup = async () => {
    if (!restoreJsonInput.trim()) {
      Alert.alert('Validation Error', 'Please paste or provide valid backup JSON data.');
      return;
    }

    try {
      setRestoreLoading(true);
      const parsedData = JSON.parse(restoreJsonInput);
      const res = await api.importBackup(parsedData);
      setRestoreModalVisible(false);
      setRestoreJsonInput('');
      Alert.alert('Success', res.message || 'Dataset restored successfully!');
    } catch (err: any) {
      Alert.alert('Restore Failed', 'Invalid backup JSON file or data structure: ' + err.message);
    } finally {
      setRestoreLoading(false);
    }
  };

  // Web File Picker for Restore
  const handleWebFileSelect = (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        setRestoreJsonInput(content);
      } catch (err) {
        Alert.alert('File Error', 'Could not read file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgApp }}>
      <Header
        title="Settings & Tariffs"
        subtitle="Manage DISCOM tariffs, account profile & data backup"
        style={{ paddingTop: Math.max(insets.top, 16) }}
      />

      {fetching ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary500} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 130 }}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. USER ACCOUNT PROFILE (Matches Web Profile Card) */}
          <Card style={{ marginBottom: spacing.md, padding: spacing.md, borderRadius: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: colors.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 20, fontWeight: '800', color: colors.accentText }}>
                    {user?.email ? user.email.charAt(0).toUpperCase() : 'S'}
                  </Text>
                </View>

                <View>
                  <Text style={[typography.headline, { color: colors.textPrimary, fontSize: 16 }]}>
                    {user?.email || 'Logged In User'}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textMuted, marginTop: 1 }]}>
                    User ID: {user?.id?.substring(0, 12) || 'active-session'}...
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleLogout}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 16,
                  backgroundColor: colors.danger50,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <LogOut size={14} color={colors.danger500} strokeWidth={2.2} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.danger500 }}>
                  Sign Out
                </Text>
              </TouchableOpacity>
            </View>
          </Card>

          {/* 2. TARIFF PREFERENCES */}
          <Card style={{ marginBottom: spacing.md, padding: spacing.md, borderRadius: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.primary50,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Zap size={16} color={colors.accent} strokeWidth={2.2} />
              </View>
              <Text style={[typography.headline, { color: colors.textPrimary, fontSize: 16 }]}>
                Electricity Tariffs
              </Text>
            </View>

            <Input
              label="Govt Buying Rate (Solar Export / Unit)"
              value={buyingRate}
              onChangeText={setBuyingRate}
              keyboardType="numeric"
              placeholder="2.25"
            />

            <Input
              label="Govt Selling Rate (Grid Import / Unit)"
              value={sellingRate}
              onChangeText={setSellingRate}
              keyboardType="numeric"
              placeholder="7.00"
            />

            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '600' }]}>
              Currency Symbol
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {['₹', '$', '€', '£'].map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCurrency(c)}
                  activeOpacity={0.7}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    borderRadius: 22,
                    backgroundColor: currency === c
                      ? (isDark ? colors.accent : colors.primary600)
                      : (isDark ? colors.bgSurfaceElevated : colors.bgSurface),
                    borderWidth: 1,
                    borderColor: currency === c ? 'transparent' : colors.borderColor,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '700',
                      color: currency === c ? (isDark ? colors.accentText : '#ffffff') : colors.textPrimary,
                    }}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* 3. DATA BACKUP & RESTORE (Matches Web Data Management) */}
          <Card style={{ marginBottom: spacing.md, padding: spacing.md, borderRadius: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.primary50,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Database size={16} color={colors.accent} strokeWidth={2.2} />
              </View>
              <Text style={[typography.headline, { color: colors.textPrimary, fontSize: 16 }]}>
                Data Backup & Restore
              </Text>
            </View>
            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.md }]}>
              Export your entire solar database to JSON or restore from a backup file.
            </Text>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity
                onPress={handleExportBackup}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 18,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                  borderWidth: 1,
                  borderColor: colors.borderColor,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Download size={15} color={colors.textPrimary} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
                  Export JSON
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setRestoreModalVisible(true)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 18,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                  borderWidth: 1,
                  borderColor: colors.borderColor,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Upload size={15} color={colors.textPrimary} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
                  Restore JSON
                </Text>
              </TouchableOpacity>
            </View>
          </Card>

          {/* 4. APPEARANCE */}
          <Card style={{ marginBottom: spacing.md, padding: spacing.md, borderRadius: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isDark ? (
                  <Moon size={16} color={colors.accent} strokeWidth={2.2} />
                ) : (
                  <Sun size={16} color={colors.accent} strokeWidth={2.2} />
                )}
              </View>
              <Text style={[typography.headline, { color: colors.textPrimary, fontSize: 16 }]}>
                Visual Theme
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={[typography.headline, { color: colors.textPrimary, fontSize: 14 }]}>
                  {isDark ? 'Obsidian Dark' : 'Oyster Light'}
                </Text>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  High-contrast enterprise solar theme
                </Text>
              </View>

              <TouchableOpacity
                onPress={toggleTheme}
                activeOpacity={0.7}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {isDark ? (
                  <Sun size={14} color={colors.textPrimary} strokeWidth={2.2} />
                ) : (
                  <Moon size={14} color={colors.textPrimary} strokeWidth={2.2} />
                )}
                <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 13 }}>
                  {isDark ? 'Switch to Light' : 'Switch to Dark'}
                </Text>
              </TouchableOpacity>
            </View>
          </Card>

          {/* 5. BACKEND SERVER URL */}
          <Card style={{ marginBottom: spacing.lg, padding: spacing.md, borderRadius: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.xs }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.primary50,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Globe size={16} color={colors.primary600} strokeWidth={2.2} />
              </View>
              <Text style={[typography.headline, { color: colors.textPrimary, fontSize: 16 }]}>
                API Server Configuration
              </Text>
            </View>
            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.md }]}>
              Connect to your local Node Express server or deployed cloud endpoint.
            </Text>

            <Input
              label="API Endpoint URL"
              value={apiUrl}
              onChangeText={setApiUrl}
              placeholder="http://10.0.2.2:3000/api"
              containerStyle={{ marginBottom: 0 }}
            />
          </Card>

          <Button
            title="Save Tariff Preferences"
            icon={<Check size={18} color={colors.accentText} strokeWidth={2.4} />}
            onPress={handleSave}
            variant="primary"
            size="lg"
            loading={loading}
            style={{ borderRadius: 28 }}
          />
        </ScrollView>
      )}

      {/* RESTORE JSON BACKUP MODAL */}
      <Modal
        visible={restoreModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRestoreModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.65)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 440,
              backgroundColor: isDark ? colors.bgSurfaceElevated : '#ffffff',
              borderRadius: isDark ? 16 : 24,
              borderWidth: 1,
              borderColor: colors.borderColor,
              padding: 20,
              maxHeight: '85%',
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Upload size={20} color={colors.accent} />
                <Text style={[typography.headline, { color: colors.textPrimary, fontSize: 17 }]}>
                  Restore Database Backup
                </Text>
              </View>
              <TouchableOpacity onPress={() => setRestoreModalVisible(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 12 }}>
              Paste your exported JSON backup text below or choose a JSON file.
            </Text>

            {Platform.OS === 'web' && (
              <View style={{ marginBottom: 12 }}>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleWebFileSelect}
                  style={{
                    fontSize: '12px',
                    color: isDark ? colors.textPrimary : '#000000',
                  }}
                />
              </View>
            )}

            <TextInput
              multiline
              numberOfLines={8}
              placeholder='Paste {"entries": [...], "settings": {...}} here...'
              placeholderTextColor={colors.textMuted}
              value={restoreJsonInput}
              onChangeText={setRestoreJsonInput}
              style={{
                height: 160,
                padding: 10,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.borderColor,
                backgroundColor: isDark ? colors.bgSubtle : '#f8fafc',
                color: colors.textPrimary,
                fontSize: 12,
                textAlignVertical: 'top',
                marginBottom: 16,
              }}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                title="Cancel"
                onPress={() => setRestoreModalVisible(false)}
                variant="outline"
                size="md"
                style={{ flex: 1, borderRadius: 20 }}
              />
              <Button
                title="Restore Data"
                onPress={handleRestoreBackup}
                variant="primary"
                size="md"
                loading={restoreLoading}
                style={{ flex: 1, borderRadius: 20 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
