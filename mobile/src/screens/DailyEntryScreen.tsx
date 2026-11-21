import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { colors as defaultColors, rounded, spacing, typography } from '../theme/tokens';
import { api } from '../api/client';
import { DailyEntry } from '../types';
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Header } from '../components/common/Header';
import { Zap, SunMedium, RotateCcw, Check, Calendar, Trash2, AlertCircle } from 'lucide-react-native';
import { localDateStr } from '../utils/date';

interface DailyEntryScreenProps {
  navigation: any;
  route?: any;
}

export const DailyEntryScreen: React.FC<DailyEntryScreenProps> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const editId = route?.params?.id;
  const initialDate = route?.params?.date;

  const todayStr = localDateStr();
  const [entryDate, setEntryDate] = useState(initialDate || todayStr);
  const [existingEntryForDate, setExistingEntryForDate] = useState<DailyEntry | null>(null);

  // Meter Readings
  const [openImport, setOpenImport] = useState('');
  const [closeImport, setCloseImport] = useState('');
  const [openExport, setOpenExport] = useState('');
  const [closeExport, setCloseExport] = useState('');

  // Units
  const [generatedUnits, setGeneratedUnits] = useState('');
  const [consumedUnits, setConsumedUnits] = useState('');

  // Rates
  const [buyingRate, setBuyingRate] = useState('2.25');
  const [sellingRate, setSellingRate] = useState('2.25');

  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  // Load defaults from user settings or existing entry
  useEffect(() => {
    async function loadData() {
      try {
        setFetching(true);
        const settings = await api.getSettings();
        if (settings) {
          if (settings.default_buying_rate) setBuyingRate(String(settings.default_buying_rate));
          if (settings.default_selling_rate) setSellingRate(String(settings.default_selling_rate));
        }

        if (editId) {
          const entry = await api.getEntryById(editId);
          if (entry) {
            setEntryDate(entry.entry_date);
            setGeneratedUnits(String(entry.generated_units));
            setConsumedUnits(String(entry.consumed_units));
            if (entry.buying_rate) setBuyingRate(String(entry.buying_rate));
            if (entry.selling_rate) setSellingRate(String(entry.selling_rate));
            if (entry.opening_import_meter !== null && entry.opening_import_meter !== undefined) {
              setOpenImport(String(entry.opening_import_meter));
            }
            if (entry.closing_import_meter !== null && entry.closing_import_meter !== undefined) {
              setCloseImport(String(entry.closing_import_meter));
            }
            if (entry.opening_export_meter !== null && entry.opening_export_meter !== undefined) {
              setOpenExport(String(entry.opening_export_meter));
            }
            if (entry.closing_export_meter !== null && entry.closing_export_meter !== undefined) {
              setCloseExport(String(entry.closing_export_meter));
            }
            if (entry.notes) setNotes(entry.notes);
          }
        }
      } catch (err: any) {
        console.warn('Failed to load entry/settings:', err.message);
      } finally {
        setFetching(false);
      }
    }
    loadData();
  }, [editId]);

  // Auto pre-fill previous closing meters into today's opening meters (Matching Web feature)
  useEffect(() => {
    if (editId) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) return; // wait until a full date is typed
    async function prefillForDate() {
      try {
        // The selected date's own entry (if any) and the latest entry before it
        const res = await api.getEntries({
          endDate: entryDate,
          limit: 2,
          sortBy: 'entry_date',
          sortOrder: 'desc',
        });
        const entries = res.entries || [];
        const match = entries.find((e) => e.entry_date === entryDate);
        setExistingEntryForDate(match || null);

        const sorted = [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
        const prevList = sorted.filter((e) => e.entry_date < entryDate);
        // No earlier entry: don't prefill (a later entry's readings are not this day's opening)
        const prev = prevList.length > 0 ? prevList[prevList.length - 1] : null;

        if (prev) {
          let prevCloseImp = prev.closing_import_meter;
          if ((prevCloseImp === undefined || prevCloseImp === null) && prev.opening_import_meter !== null && prev.consumed_units !== undefined) {
            prevCloseImp = parseFloat(String(prev.opening_import_meter)) + parseFloat(String(prev.consumed_units));
          }
          let prevCloseExp = prev.closing_export_meter;
          if ((prevCloseExp === undefined || prevCloseExp === null) && prev.opening_export_meter !== null && prev.generated_units !== undefined) {
            prevCloseExp = parseFloat(String(prev.opening_export_meter)) + parseFloat(String(prev.generated_units));
          }

          if (prevCloseImp !== undefined && prevCloseImp !== null && !isNaN(prevCloseImp)) {
            setOpenImport(String(prevCloseImp));
          }
          if (prevCloseExp !== undefined && prevCloseExp !== null && !isNaN(prevCloseExp)) {
            setOpenExport(String(prevCloseExp));
          }
        }
      } catch (err: any) {
        console.warn('Could not auto-fill previous meters:', err.message);
      }
    }
    prefillForDate();
  }, [entryDate, editId]);

  // Auto-calculate Import Delta (Consumed Units)
  useEffect(() => {
    if (closeImport && openImport) {
      const close = parseFloat(closeImport);
      const open = parseFloat(openImport);
      if (!isNaN(close) && !isNaN(open) && close >= open) {
        setConsumedUnits((close - open).toFixed(2));
      }
    }
  }, [closeImport, openImport]);

  // Auto-calculate Export Delta (Generated Units)
  useEffect(() => {
    if (closeExport && openExport) {
      const close = parseFloat(closeExport);
      const open = parseFloat(openExport);
      if (!isNaN(close) && !isNaN(open) && close >= open) {
        setGeneratedUnits((close - open).toFixed(2));
      }
    }
  }, [closeExport, openExport]);

  // Live Metric Calculation
  const genVal = parseFloat(generatedUnits) || 0;
  const conVal = parseFloat(consumedUnits) || 0;
  const buyVal = parseFloat(buyingRate) || 2.25;
  const sellVal = parseFloat(sellingRate) || 2.25;

  const netUnits = parseFloat((genVal - conVal).toFixed(2));
  let revenue = 0;
  let payable = 0;
  let status: 'profit' | 'loss' | 'balanced' = 'balanced';

  if (netUnits > 0) {
    revenue = parseFloat((netUnits * buyVal).toFixed(2));
    payable = 0;
    status = 'profit';
  } else if (netUnits < 0) {
    revenue = 0;
    payable = parseFloat((Math.abs(netUnits) * sellVal).toFixed(2));
    status = 'loss';
  }

  const handleDelete = () => {
    if (!editId) return;
    Alert.alert(
      'Delete Entry',
      `Are you sure you want to delete the solar entry for ${entryDate}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await api.deleteEntry(editId);
              Alert.alert('Deleted', 'Solar entry deleted successfully.');
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Delete Failed', err.message || 'Could not delete entry');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
      Alert.alert('Validation Error', 'Reading date is required in YYYY-MM-DD format');
      return;
    }
    // Validate the raw inputs: genVal/conVal default blanks to 0, which would save a fake 0/0 entry
    const genRaw = parseFloat(generatedUnits);
    const conRaw = parseFloat(consumedUnits);
    if (isNaN(genRaw) || isNaN(conRaw) || genRaw < 0 || conRaw < 0) {
      Alert.alert('Validation Error', 'Please enter valid generated and consumed units');
      return;
    }

    const openImpVal = openImport ? parseFloat(openImport) : null;
    const closeImpVal = closeImport ? parseFloat(closeImport) : null;
    const openExpVal = openExport ? parseFloat(openExport) : null;
    const closeExpVal = closeExport ? parseFloat(closeExport) : null;

    // Logical meter checks matching Web
    if (openImpVal !== null && closeImpVal !== null && closeImpVal < openImpVal) {
      Alert.alert('Validation Error', 'Closing import meter cannot be less than opening import meter.');
      return;
    }
    if (openExpVal !== null && closeExpVal !== null && closeExpVal < openExpVal) {
      Alert.alert('Validation Error', 'Closing export meter cannot be less than opening export meter.');
      return;
    }
    if ([openImpVal, closeImpVal, openExpVal, closeExpVal, genVal, conVal, buyVal, sellVal].some(v => v !== null && !isNaN(v) && v < 0)) {
      Alert.alert('Validation Error', 'Negative values are not allowed. Please enter positive meter readings.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        entry_date: entryDate,
        generated_units: genVal,
        consumed_units: conVal,
        buying_rate: buyVal,
        selling_rate: sellVal,
        opening_import_meter: openImpVal,
        closing_import_meter: closeImpVal,
        opening_export_meter: openExpVal,
        closing_export_meter: closeExpVal,
        notes,
      };

      if (editId) {
        await api.updateEntry(editId, payload);
        Alert.alert('Success', 'Solar meter entry updated successfully!');
      } else {
        await api.createEntry(payload);
        Alert.alert('Success', 'Solar meter entry saved successfully!');
      }

      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Could not save entry to server');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setOpenImport('');
    setCloseImport('');
    setOpenExport('');
    setCloseExport('');
    setGeneratedUnits('');
    setConsumedUnits('');
    setNotes('');
  };

  const curr = '₹';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.bgApp }}
    >
      <Header
        title={editId ? 'Edit Solar Log' : 'New Solar Log'}
        subtitle="Log opening & closing bi-directional meters"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        style={{ paddingTop: Math.max(insets.top, 16) }}
      />

      {fetching ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary500} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 130 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* DATE SELECTOR CARD */}
          <Card style={{ marginBottom: spacing.md, padding: spacing.md, borderRadius: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Calendar size={16} color={colors.textPrimary} strokeWidth={2} />
                </View>
                <Text style={[typography.headline, { color: colors.textPrimary, fontSize: 16 }]}>Reading Date</Text>
              </View>
              <Badge status={status} />
            </View>

            <Input
              label="Date (YYYY-MM-DD)"
              value={entryDate}
              onChangeText={setEntryDate}
              placeholder="2026-08-01"
              containerStyle={{ marginBottom: 0 }}
            />

            {existingEntryForDate && !editId ? (
              <TouchableOpacity
                onPress={() => navigation.navigate('DailyEntry', { id: existingEntryForDate.id })}
                style={{
                  marginTop: 10,
                  padding: 10,
                  borderRadius: 12,
                  backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.12)',
                  borderWidth: 1,
                  borderColor: 'rgba(245, 158, 11, 0.35)',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertCircle size={16} color={colors.warning500} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: isDark ? colors.warningText : '#b45309', fontWeight: '600' }}>
                    An entry already exists for {entryDate}. Tap here to load & edit.
                  </Text>
                </View>
              </TouchableOpacity>
            ) : null}
          </Card>

          {/* DUAL METER SECTIONS */}
          <Card style={{ marginBottom: spacing.md, padding: spacing.md, borderRadius: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.danger50,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Zap size={16} color={colors.danger500} strokeWidth={2.2} />
                </View>
                <View>
                  <Text style={[typography.headline, { color: colors.textPrimary, fontSize: 16 }]}>
                    Import Meter
                  </Text>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    Grid power consumed by home
                  </Text>
                </View>
              </View>

              {consumedUnits ? (
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  }}
                >
                  <Text style={[typography.caption, { fontWeight: '700', color: colors.textPrimary }]}>
                    {consumedUnits} kWh
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Opening Meter"
                  value={openImport}
                  onChangeText={setOpenImport}
                  keyboardType="numeric"
                  placeholder="e.g. 5408"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Closing Meter"
                  value={closeImport}
                  onChangeText={setCloseImport}
                  keyboardType="numeric"
                  placeholder="e.g. 5449"
                />
              </View>
            </View>
          </Card>

          <Card style={{ marginBottom: spacing.md, padding: spacing.md, borderRadius: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.success50,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <SunMedium size={16} color={colors.success500} strokeWidth={2.2} />
                </View>
                <View>
                  <Text style={[typography.headline, { color: colors.textPrimary, fontSize: 16 }]}>
                    Export Meter
                  </Text>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    Solar surplus fed back to grid
                  </Text>
                </View>
              </View>

              {generatedUnits ? (
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                    backgroundColor: colors.success50,
                  }}
                >
                  <Text style={[typography.caption, { fontWeight: '700', color: colors.success500 }]}>
                    {generatedUnits} kWh
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Opening Meter"
                  value={openExport}
                  onChangeText={setOpenExport}
                  keyboardType="numeric"
                  placeholder="e.g. 15128"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Closing Meter"
                  value={closeExport}
                  onChangeText={setCloseExport}
                  keyboardType="numeric"
                  placeholder="e.g. 15173"
                />
              </View>
            </View>
          </Card>

          {/* CALCULATED UNITS & RATES */}
          <Card style={{ marginBottom: spacing.md, padding: spacing.md, borderRadius: 24 }}>
            <Text style={[typography.headline, { color: colors.textPrimary, fontSize: 16, marginBottom: spacing.sm }]}>
              Tariff Rates & Overrides
            </Text>

            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Total Solar Gen (kWh)"
                  value={generatedUnits}
                  onChangeText={setGeneratedUnits}
                  keyboardType="numeric"
                  placeholder="0.00"
                  hint="Auto from Export Close - Open"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Total Grid Consumed (kWh)"
                  value={consumedUnits}
                  onChangeText={setConsumedUnits}
                  keyboardType="numeric"
                  placeholder="0.00"
                  hint="Auto from Import Close - Open"
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Input
                  label={`Govt Buying Rate (${curr})`}
                  value={buyingRate}
                  onChangeText={setBuyingRate}
                  keyboardType="numeric"
                  placeholder="2.25"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label={`Govt Selling Rate (${curr})`}
                  value={sellingRate}
                  onChangeText={setSellingRate}
                  keyboardType="numeric"
                  placeholder="7.00"
                />
              </View>
            </View>

            <Input
              label="Notes & Observations"
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. High sunshine, AC ran 4 hours"
              containerStyle={{ marginBottom: 0 }}
            />
          </Card>

          {/* REAL-TIME SETTLEMENT PREVIEW BOX (Apple Card Style) */}
          <View
            style={{
              marginBottom: spacing.lg,
              padding: spacing.lg,
              borderRadius: 24,
              backgroundColor: status === 'profit'
                ? colors.success50
                : status === 'loss'
                ? colors.danger50
                : colors.bgSubtle,
              borderWidth: 1,
              borderColor: colors.borderColor,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={[typography.caption, { color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                  Net Energy Balance
                </Text>
                <Text
                  style={[
                    typography.title,
                    {
                      color: colors.textPrimary,
                      marginTop: 4,
                      fontSize: 22,
                      fontWeight: '800',
                    },
                  ]}
                >
                  {netUnits > 0 ? `+${netUnits}` : `${netUnits}`} kWh
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[typography.caption, { color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                  {status === 'profit' ? 'Govt Credit (Profit)' : (status === 'loss' ? 'Govt Payable (Cost)' : 'Net Position')}
                </Text>
                <Text
                  style={[
                    typography.title,
                    {
                      color: status === 'profit'
                        ? colors.success500
                        : status === 'loss'
                        ? colors.danger500
                        : colors.textPrimary,
                      marginTop: 4,
                      fontSize: 22,
                      fontWeight: '800',
                    },
                  ]}
                >
                  {status === 'profit'
                    ? `+${curr}${revenue.toFixed(2)}`
                    : (status === 'loss' ? `-${curr}${payable.toFixed(2)}` : `${curr}0.00`)}
                </Text>
              </View>
            </View>
          </View>

          {/* ACTION BUTTONS */}
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
            {editId ? (
              <Button
                title="Delete"
                icon={<Trash2 size={16} color={colors.danger500} strokeWidth={2} />}
                onPress={handleDelete}
                variant="outline"
                size="lg"
                style={{ flex: 1, borderRadius: 28, borderColor: colors.danger500 }}
              />
            ) : (
              <Button
                title="Reset"
                icon={<RotateCcw size={16} color={colors.textPrimary} strokeWidth={2} />}
                onPress={handleReset}
                variant="outline"
                size="lg"
                style={{ flex: 1, borderRadius: 28 }}
              />
            )}
            <Button
              title={editId ? 'Update Entry' : 'Save Daily Entry'}
              icon={<Check size={18} color={colors.accentText} strokeWidth={2.4} />}
              onPress={handleSave}
              variant="primary"
              size="lg"
              loading={loading}
              style={{ flex: 2, borderRadius: 28 }}
            />
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
};
