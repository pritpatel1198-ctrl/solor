import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { rounded, spacing, typography, shadows } from '../theme/tokens';
import { api } from '../api/client';
import { SettlementReport, SettlementDayRow } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { EmptyState } from '../components/common/EmptyState';
import { downloadOrShareTextFile } from '../utils/exportUtils';
import { generateAndShareSettlementPdf } from '../utils/settlementPdf';
import {
  Scale,
  FileSpreadsheet,
  Download,
  Printer,
  Edit3,
  Sun,
  Zap,
  ShieldCheck,
  AlertTriangle,
  X,
  FileText,
} from 'lucide-react-native';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const AVAILABLE_YEARS = [2024, 2025, 2026, 2027, 2028];

interface SettlementScreenProps {
  navigation: any;
  embedded?: boolean; // shown inside Records, which has its own title
}

export const SettlementScreen: React.FC<SettlementScreenProps> = ({ navigation, embedded }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const [buyingRate, setBuyingRate] = useState('2.25');
  const [sellingRate, setSellingRate] = useState('2.25');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [report, setReport] = useState<SettlementReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [statementModalVisible, setStatementModalVisible] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Rates come from Settings; reload them whenever this screen comes into view
  useFocusEffect(
    useCallback(() => {
      api.getSettings()
        .then((s) => {
          if (s?.default_buying_rate) setBuyingRate(String(s.default_buying_rate));
          if (s?.default_selling_rate) setSellingRate(String(s.default_selling_rate));
        })
        .catch((err: any) => console.warn('Could not load rates from Settings:', err.message));
    }, [])
  );

  const fetchSettlement = useCallback(async () => {
    try {
      setError(null);
      const res = await api.getSettlement({
        month: selectedMonth,
        year: selectedYear,
        buyingRate: parseFloat(buyingRate) || 2.25,
        sellingRate: parseFloat(sellingRate) || 2.25,
      });
      setReport(res);
    } catch (err: any) {
      setError(err.message || 'Failed to calculate settlement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedMonth, selectedYear, buyingRate, sellingRate]);

  // Refetch on focus as well as when month/year/rates change
  useFocusEffect(
    useCallback(() => {
      fetchSettlement();
    }, [fetchSettlement])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchSettlement();
  };

  const curr = '₹';

  // Support both new server response { summary, history } and direct fields
  const summary = report?.summary || {
    month_opening_balance: 0,
    month_closing_balance: report?.closing_balance || 0,
    final_settlement_amount_rs: report?.final_settlement_amount || 0,
    final_status: report?.final_settlement_status || 'Balanced',
    total_export_units: report?.rows?.reduce((a, b) => a + (b.daily_export_units || 0), 0) || 0,
    total_import_units: report?.rows?.reduce((a, b) => a + (b.daily_import_units || 0), 0) || 0,
    total_credit_generated: report?.total_credit_generated || 0,
    total_credit_used: report?.total_credit_used || 0,
    total_payable_generated: report?.total_payable_generated || 0,
    month_closing_export_meter: null,
    month_closing_import_meter: null,
    net_gross_difference: 0,
  };

  const rows: SettlementDayRow[] = report?.history || report?.rows || [];
  const closingBal = summary.month_closing_balance;
  const isCredit = closingBal >= 0;
  const amountVal = summary.final_settlement_amount_rs.toFixed(2);

  const handleExportCSV = () => {
    if (!rows || rows.length === 0) {
      Alert.alert('Notice', 'No settlement data available to export.');
      return;
    }

    const headers = [
      'Date', 'Opening Import Meter', 'Closing Import Meter', 'Daily Import Units',
      'Opening Export Meter', 'Closing Export Meter', 'Daily Export Units',
      'Gross Difference', 'Opening Settlement Balance', 'Previous Balance Adjusted',
      'Govt Credit Generated', 'Govt Credit Used', 'Govt Payable',
      'Closing Settlement Balance', 'Settlement Status', 'Settlement Rate', 'Settlement Amount'
    ];

    const csvRows = rows.map((r) => [
      r.date,
      r.opening_import_meter ?? '',
      r.closing_import_meter ?? '',
      r.daily_import_units,
      r.opening_export_meter ?? '',
      r.closing_export_meter ?? '',
      r.daily_export_units,
      r.gross_difference,
      r.opening_settlement_balance,
      r.previous_balance_adjusted,
      r.govt_credit_generated,
      r.govt_credit_used,
      r.govt_payable,
      r.closing_settlement_balance,
      `"${r.settlement_status || ''}"`,
      r.settlement_rate ?? '',
      r.settlement_amount_rs,
    ]);

    const csvContent = [headers.join(','), ...csvRows.map((e) => e.join(','))].join('\n');
    downloadOrShareTextFile(
      `solar_settlement_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.csv`,
      csvContent,
      'text/csv'
    );
  };

  const handleExportPDF = async () => {
    if (!rows || rows.length === 0) {
      Alert.alert('Notice', 'No settlement records available to export.');
      return;
    }

    setIsExportingPdf(true);
    try {
      await generateAndShareSettlementPdf(
        report || { summary, rows },
        'consumer@solar.com',
        '₹',
        MONTH_NAMES[selectedMonth - 1],
        selectedYear,
        {
          month: selectedMonth,
          year: selectedYear,
          buyingRate: parseFloat(buyingRate) || 2.25,
          sellingRate: parseFloat(sellingRate) || 2.25,
        }
      );
    } catch (err: any) {
      Alert.alert('PDF Export Error', err.message || 'Failed to generate PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgApp }}>
      {/* 1. SCREEN TITLE HEADER */}
      <View
        style={{
          paddingTop: embedded ? spacing.xs : Math.max(insets.top + 8, 20),
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.xs,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <View style={{ flex: 1 }}>
          {!embedded && (
            <Text style={[typography.title, { color: colors.textPrimary, letterSpacing: -0.4, fontSize: 20 }]}>
              Monthly Settlement
            </Text>
          )}
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 1 }]}>
            DISCOM carry-forward credit & deficit ledger
          </Text>
        </View>

        {/* EXPORT ACTION BUTTONS */}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity
            onPress={handleExportCSV}
            style={{
              paddingHorizontal: 9,
              paddingVertical: 5,
              borderRadius: 16,
              backgroundColor: isDark ? colors.bgSurfaceElevated : '#ffffff',
              borderWidth: 1,
              borderColor: colors.borderColor,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Download size={13} color={colors.textPrimary} strokeWidth={2} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textPrimary }}>CSV</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleExportPDF}
            disabled={isExportingPdf}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 16,
              backgroundColor: isDark ? colors.accent : colors.primary600,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              opacity: isExportingPdf ? 0.7 : 1,
            }}
          >
            {isExportingPdf ? (
              <ActivityIndicator size={12} color={isDark ? colors.accentText : '#ffffff'} />
            ) : (
              <FileText size={13} color={isDark ? colors.accentText : '#ffffff'} strokeWidth={2} />
            )}
            <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? colors.accentText : '#ffffff' }}>
              {isExportingPdf ? 'Exporting...' : 'PDF'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setStatementModalVisible(true)}
            style={{
              paddingHorizontal: 9,
              paddingVertical: 5,
              borderRadius: 16,
              backgroundColor: isDark ? colors.bgSurfaceElevated : '#ffffff',
              borderWidth: 1,
              borderColor: colors.borderColor,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Printer size={13} color={colors.textPrimary} strokeWidth={2} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textPrimary }}>Bill</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. YEAR & MONTH SELECTORS */}
      <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs, gap: 6 }}>
        {/* YEAR CAPSULES */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {AVAILABLE_YEARS.map((y) => {
            const isSelected = y === selectedYear;
            return (
              <TouchableOpacity
                key={y}
                onPress={() => setSelectedYear(y)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 5,
                  borderRadius: rounded.full,
                  backgroundColor: isSelected ? (isDark ? colors.accent : colors.primary600) : (isDark ? colors.bgSurfaceElevated : colors.bgSurface),
                  borderWidth: 1,
                  borderColor: isSelected ? 'transparent' : colors.borderColor,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: isSelected ? '700' : '500', color: isSelected ? (isDark ? colors.accentText : '#ffffff') : colors.textSecondary }}>
                  {y}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* MONTH CAPSULES */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {MONTH_NAMES.map((name, index) => {
            const m = index + 1;
            const isSelected = m === selectedMonth;
            return (
              <TouchableOpacity
                key={name}
                onPress={() => setSelectedMonth(m)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: rounded.full,
                  backgroundColor: isSelected ? (isDark ? colors.accent : colors.primary600) : (isDark ? colors.bgSurfaceElevated : colors.bgSurface),
                  borderWidth: 1,
                  borderColor: isSelected ? 'transparent' : colors.borderColor,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: isSelected ? '700' : '500', color: isSelected ? (isDark ? colors.accentText : '#ffffff') : colors.textSecondary }}>
                  {name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading && !refreshing ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.sm }]}>
            Calculating running settlement series...
          </Text>
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg }}>
          <EmptyState
            icon={<Scale size={36} color={colors.textMuted} strokeWidth={1.5} />}
            title="Settlement Engine Notice"
            description={error}
            actionTitle="Retry"
            onAction={fetchSettlement}
          />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 130 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          showsVerticalScrollIndicator={false}
        >
          {/* RATE OVERRIDES CARD (Interactive Tariff Simulator matching Web) */}
          <Card style={{ marginBottom: spacing.md, padding: spacing.md, borderRadius: 20 }}>
            <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 }]}>
              DISCOM Tariff Rates Simulation
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Govt Credit Rate (₹/u)"
                  value={buyingRate}
                  onChangeText={setBuyingRate}
                  keyboardType="numeric"
                  placeholder="2.25"
                  containerStyle={{ marginBottom: 0 }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Govt Payable Rate (₹/u)"
                  value={sellingRate}
                  onChangeText={setSellingRate}
                  keyboardType="numeric"
                  placeholder="7.00"
                  containerStyle={{ marginBottom: 0 }}
                />
              </View>
            </View>
          </Card>

          {/* 3. HERO SETTLEMENT STATUS CARD */}
          <Card variant="hero" style={{ marginBottom: spacing.md, padding: spacing.lg, borderRadius: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
              <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' }]}>
                {MONTH_NAMES[selectedMonth - 1].toUpperCase()} {selectedYear} STATEMENT
              </Text>
              <Badge
                status={isCredit ? 'profit' : 'loss'}
                label={isCredit ? 'GOVT CREDIT' : 'GOVT PAYABLE'}
                size="sm"
              />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: spacing.xs }}>
              <View>
                <Text style={[typography.caption, { color: colors.textMuted, fontSize: 12, fontWeight: '600' }]}>
                  Closing Carry-Forward Units
                </Text>
                <Text style={[typography.display, { fontSize: 32, color: isCredit ? colors.success500 : colors.danger500, fontWeight: '800', marginTop: 2 }]}>
                  {closingBal > 0 ? `+${closingBal}` : `${closingBal}`}
                  <Text style={{ fontSize: 16, color: colors.textMuted }}> kWh</Text>
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[typography.caption, { color: colors.textMuted, fontSize: 12, fontWeight: '600' }]}>
                  Monetary Settlement
                </Text>
                <Text style={[typography.title, { fontSize: 26, color: isCredit ? colors.success500 : colors.danger500, fontWeight: '800', marginTop: 2 }]}>
                  {curr}{amountVal}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderColor }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                Credit Rate: <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{curr}{parseFloat(buyingRate).toFixed(2)}/u</Text>
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>•</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                Payable Rate: <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{curr}{parseFloat(sellingRate).toFixed(2)}/u</Text>
              </Text>
            </View>
          </Card>

          {/* 4. RUNNING BREAKDOWN METRICS */}
          <View style={{ flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md }}>
            <Card style={{ flex: 1, padding: spacing.sm + 2, borderRadius: 16 }}>
              <Text style={[typography.caption, { color: colors.textMuted, fontSize: 10, fontWeight: '700' }]}>EXPORT kWh</Text>
              <Text style={[typography.headline, { color: colors.success500, fontSize: 16, marginTop: 4, fontWeight: '800' }]}>
                +{summary.total_export_units}
              </Text>
            </Card>

            <Card style={{ flex: 1, padding: spacing.sm + 2, borderRadius: 16 }}>
              <Text style={[typography.caption, { color: colors.textMuted, fontSize: 10, fontWeight: '700' }]}>IMPORT kWh</Text>
              <Text style={[typography.headline, { color: colors.danger500, fontSize: 16, marginTop: 4, fontWeight: '800' }]}>
                -{summary.total_import_units}
              </Text>
            </Card>

            <Card style={{ flex: 1, padding: spacing.sm + 2, borderRadius: 16 }}>
              <Text style={[typography.caption, { color: colors.textMuted, fontSize: 10, fontWeight: '700' }]}>CREDIT GEN</Text>
              <Text style={[typography.headline, { color: colors.success500, fontSize: 16, marginTop: 4, fontWeight: '800' }]}>
                +{summary.total_credit_generated}
              </Text>
            </Card>

            <Card style={{ flex: 1, padding: spacing.sm + 2, borderRadius: 16 }}>
              <Text style={[typography.caption, { color: colors.textMuted, fontSize: 10, fontWeight: '700' }]}>DEFICIT</Text>
              <Text style={[typography.headline, { color: colors.danger500, fontSize: 16, marginTop: 4, fontWeight: '800' }]}>
                {summary.total_payable_generated}
              </Text>
            </Card>
          </View>

          {/* 5. VERDICT BANNER BOX (Matches Web Explanatory Banner) */}
          <View
            style={{
              padding: spacing.md,
              borderRadius: isDark ? 16 : 20,
              backgroundColor: isCredit ? colors.success50 : colors.danger50,
              borderWidth: 1,
              borderColor: isCredit ? colors.success500 : colors.danger500,
              marginBottom: spacing.md,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              {isCredit ? (
                <ShieldCheck size={20} color={isDark ? colors.successText : colors.success500} strokeWidth={2.2} />
              ) : (
                <AlertTriangle size={20} color={isDark ? colors.dangerText : colors.danger500} strokeWidth={2.2} />
              )}
              <Text style={{ fontWeight: '800', fontSize: 15, color: isCredit ? (isDark ? colors.successText : colors.success500) : (isDark ? colors.dangerText : colors.danger500) }}>
                {isCredit ? `Overall: POSITIVE (+${closingBal} Units Surplus)` : `Overall: NEGATIVE (${closingBal} Units Deficit)`}
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18 }}>
              {isCredit
                ? `Total Export (${summary.total_export_units} kWh) exceeds Total Import (${summary.total_import_units} kWh). Final government credit value is ${curr}${amountVal}.`
                : `Total Import (${summary.total_import_units} kWh) exceeds Total Export (${summary.total_export_units} kWh). Final payable owed is ${curr}${amountVal}.`}
            </Text>
          </View>

          {/* 6. DAY-BY-DAY RUNNING LEDGER */}
          <Text style={[typography.headline, { color: colors.textPrimary, marginBottom: spacing.sm, fontSize: 16 }]}>
            Daily Running Ledger Records
          </Text>

          {rows && rows.length > 0 ? (
            rows.map((row: SettlementDayRow, index: number) => {
              const rowIsCredit = row.closing_settlement_balance >= 0;
              return (
                <Card key={row.date || index} style={{ marginBottom: spacing.sm, padding: spacing.md, borderRadius: 18 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[typography.headline, { color: colors.textPrimary, fontSize: 15 }]}>{row.date}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Badge
                        status={rowIsCredit ? 'profit' : 'loss'}
                        label={row.settlement_status || (rowIsCredit ? 'Credit' : 'Payable')}
                        size="sm"
                      />
                      <TouchableOpacity
                        onPress={() => {
                          const id = (row as any).id;
                          if (id) {
                            navigation.navigate('DailyEntry', { id });
                          } else {
                            navigation.navigate('DailyEntry', { date: row.date });
                          }
                        }}
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 12,
                          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 3,
                        }}
                      >
                        <Edit3 size={12} color={colors.textPrimary} />
                        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textPrimary }}>Edit</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm, paddingVertical: spacing.xs }}>
                    <View>
                      <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11 }]}>Export</Text>
                      <Text style={[typography.body, { fontWeight: '700', color: colors.success500 }]}>
                        +{row.daily_export_units} kWh
                      </Text>
                    </View>

                    <View>
                      <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11 }]}>Import</Text>
                      <Text style={[typography.body, { fontWeight: '700', color: colors.danger500 }]}>
                        -{row.daily_import_units} kWh
                      </Text>
                    </View>

                    <View>
                      <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11 }]}>Gross Diff</Text>
                      <Text style={[typography.body, { fontWeight: '700', color: row.gross_difference >= 0 ? colors.accent : colors.danger500 }]}>
                        {row.gross_difference > 0 ? `+${row.gross_difference}` : row.gross_difference}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11 }]}>Closing Bal</Text>
                      <Text style={[typography.body, { fontWeight: '800', color: rowIsCredit ? colors.accent : colors.danger500 }]}>
                        {row.closing_settlement_balance > 0 ? `+${row.closing_settlement_balance}` : row.closing_settlement_balance}
                      </Text>
                    </View>
                  </View>

                  {row.result_summary ? (
                    <View style={{ marginTop: spacing.xs, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.borderColor }}>
                      <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 11 }]}>
                        ↳ {row.result_summary}
                      </Text>
                    </View>
                  ) : null}
                </Card>
              );
            })
          ) : (
            <Card style={{ padding: spacing.xl, alignItems: 'center' }}>
              <FileSpreadsheet size={36} color={colors.textMuted} strokeWidth={1.5} style={{ marginBottom: 12 }} />
              <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center' }]}>
                No solar readings logged for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}.
              </Text>
            </Card>
          )}
        </ScrollView>
      )}

      {/* DISCOM STATEMENT MODAL (Matches Web Print Statement) */}
      <Modal
        visible={statementModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStatementModalVisible(false)}
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
              maxWidth: 420,
              backgroundColor: isDark ? colors.bgSurfaceElevated : '#ffffff',
              borderRadius: 24,
              borderWidth: 1,
              borderColor: colors.borderColor,
              padding: 20,
              maxHeight: '80%',
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <FileText size={20} color={colors.accent} />
                <Text style={[typography.headline, { color: colors.textPrimary, fontSize: 17 }]}>
                  DISCOM Statement
                </Text>
              </View>
              <TouchableOpacity onPress={() => setStatementModalVisible(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ gap: 10, paddingVertical: 4 }}>
                <Text style={{ fontSize: 13, color: colors.textMuted }}>
                  Period: <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</Text>
                </Text>
                <Text style={{ fontSize: 13, color: colors.textMuted }}>
                  Total Days Tracked: <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{rows.length}</Text>
                </Text>

                <View style={{ height: 1, backgroundColor: colors.borderColor, marginVertical: 4 }} />

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Total Solar Export:</Text>
                  <Text style={{ fontWeight: '700', color: colors.success500 }}>+{summary.total_export_units} kWh</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Total Grid Import:</Text>
                  <Text style={{ fontWeight: '700', color: colors.danger500 }}>-{summary.total_import_units} kWh</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Total Credit Generated:</Text>
                  <Text style={{ fontWeight: '700', color: colors.textPrimary }}>+{summary.total_credit_generated} Units</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Total Credit Used:</Text>
                  <Text style={{ fontWeight: '700', color: colors.textPrimary }}>-{summary.total_credit_used} Units</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Closing Carry Balance:</Text>
                  <Text style={{ fontWeight: '800', color: isCredit ? colors.success500 : colors.danger500 }}>
                    {closingBal > 0 ? `+${closingBal}` : closingBal} Units
                  </Text>
                </View>

                <View style={{ height: 1, backgroundColor: colors.borderColor, marginVertical: 4 }} />

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontWeight: '700', fontSize: 14, color: colors.textPrimary }}>Net Monetary Settlement:</Text>
                  <Text style={{ fontWeight: '800', fontSize: 18, color: isCredit ? colors.success500 : colors.danger500 }}>
                    {curr}{amountVal} ({summary.final_status})
                  </Text>
                </View>
              </View>
            </ScrollView>

            <Button
              title="Share Official PDF Statement"
              onPress={() => {
                setStatementModalVisible(false);
                setTimeout(() => handleExportPDF(), 250);
              }}
              variant="primary"
              size="md"
              style={{ marginTop: 14, borderRadius: 20 }}
            />
            <Button
              title="Close Statement"
              onPress={() => setStatementModalVisible(false)}
              variant="outline"
              size="md"
              style={{ marginTop: 8, borderRadius: 20 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};
