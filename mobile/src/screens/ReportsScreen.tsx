import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { rounded, spacing, typography } from '../theme/tokens';
import { api } from '../api/client';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Header } from '../components/common/Header';
import { downloadOrShareTextFile } from '../utils/exportUtils';
import { generateAndShareFinancialReportPdf } from '../utils/reportPdf';
import { localDateStr } from '../utils/date';
import {
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Sun,
  Zap,
  TrendingUp,
  Download,
  FileText,
  Percent,
  Calendar,
  Filter,
} from 'lucide-react-native';

const REPORT_PERIODS = [
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This Week' },
  { id: 'monthly', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'quarterly', label: 'Quarterly' },
  { id: 'this_fy', label: 'Financial Year' },
  { id: 'yearly', label: 'Yearly' },
  { id: 'lifetime', label: 'Lifetime' },
  { id: 'custom', label: 'Custom Range' },
] as const;

const STATUS_FILTERS = [
  { id: 'all', label: 'All Status' },
  { id: 'profit', label: 'Profit Only' },
  { id: 'loss', label: 'Loss Only' },
] as const;

interface ReportsScreenProps {
  navigation?: any;
}

export const ReportsScreen: React.FC<ReportsScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [period, setPeriod] = useState<string>('monthly');
  const [statusFilter, setStatusFilter] = useState<'all' | 'profit' | 'loss'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showCustomInputs, setShowCustomInputs] = useState<boolean>(false);

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      const params: any = {
        period,
        status: statusFilter,
      };
      if (period === 'custom' && customStartDate && customEndDate) {
        params.startDate = customStartDate;
        params.endDate = customEndDate;
      }
      const res = await api.getReports(params);
      setData(res);
    } catch (err: any) {
      console.warn('Reports error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, statusFilter, customStartDate, customEndDate]);

  useEffect(() => {
    setLoading(true);
    fetchReports();
  }, [fetchReports]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    if (newPeriod === 'custom') {
      setShowCustomInputs(true);
      if (!customStartDate) {
        const now = new Date();
        const start = localDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
        const end = localDateStr(now);
        setCustomStartDate(start);
        setCustomEndDate(end);
      }
    } else {
      setShowCustomInputs(false);
    }
  };

  const handleExportCSV = () => {
    if (!data?.grouped || data.grouped.length === 0) {
      Alert.alert('Notice', 'No report breakdown data to export.');
      return;
    }

    const headers = [
      'Period', 'Solar Generated (kWh)', 'Grid Consumed (kWh)',
      'Export Units', 'Import Units', 'Revenue', 'Expense', 'Net Profit', 'Avg Units/Day'
    ];

    const rows = data.grouped.map((g: any) => [
      g.period_label || g.group_key,
      g.solar_generated,
      g.grid_consumption,
      g.export_units,
      g.import_units,
      g.revenue,
      g.expense,
      g.net_profit,
      g.average_units
    ]);

    const csvContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    downloadOrShareTextFile(
      `financial_report_${period}_${localDateStr()}.csv`,
      csvContent,
      'text/csv'
    );
  };

  const handleExportPDF = async () => {
    setIsExportingPdf(true);
    try {
      const params: any = {
        period,
        status: statusFilter,
        currency: '₹'
      };
      if (period === 'custom' && customStartDate && customEndDate) {
        params.startDate = customStartDate;
        params.endDate = customEndDate;
      }
      await generateAndShareFinancialReportPdf(params);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const curr = '₹';
  const summary = data?.summary || {};
  const isProfit = (summary.net_profit || 0) >= 0;
  const coverageRatio = summary.solar_coverage_ratio ?? (summary.total_consumed > 0 ? ((summary.total_generated / summary.total_consumed) * 100).toFixed(1) : '0.0');
  const exportRatio = summary.solar_export_ratio ?? (summary.total_generated > 0 ? ((summary.total_export_units / summary.total_generated) * 100).toFixed(1) : '0.0');
  const profitMargin = summary.profit_margin ?? (summary.total_revenue > 0 ? ((summary.net_profit / summary.total_revenue) * 100).toFixed(1) : '0.0');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgApp }}>
      <Header
        title="Financial & Performance Reports"
        subtitle="Audited statements, variance & energy efficiency"
        style={{ paddingTop: Math.max(insets.top, 16) }}
      />

      {/* TOP CONTROLS & EXPORT TOOLBAR */}
      <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xs, gap: 8 }}>
        {/* ACTION BUTTONS (CSV + PDF) */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Filter size={14} color={colors.textMuted} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase' }}>
              Filter Criteria
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity
              onPress={handleExportCSV}
              style={{
                paddingHorizontal: 10,
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
                paddingHorizontal: 12,
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
                {isExportingPdf ? 'Exporting...' : 'Export PDF'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* PERIOD CAPSULES (Horizontal Scroll) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
        >
          {REPORT_PERIODS.map((p) => {
            const isSelected = p.id === period;
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => handlePeriodChange(p.id)}
                style={{
                  paddingHorizontal: 13,
                  paddingVertical: 5,
                  borderRadius: 16,
                  backgroundColor: isSelected
                    ? (isDark ? colors.accent : colors.primary600)
                    : (isDark ? colors.bgSurfaceElevated : colors.bgSurface),
                  borderWidth: 1,
                  borderColor: isSelected ? 'transparent' : colors.borderColor,
                }}
              >
                <Text
                  style={{
                    color: isSelected ? (isDark ? colors.accentText : '#ffffff') : colors.textSecondary,
                    fontWeight: isSelected ? '700' : '500',
                    fontSize: 11,
                  }}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* STATUS FILTER CAPSULES */}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {STATUS_FILTERS.map((s) => {
            const isSelected = s.id === statusFilter;
            return (
              <TouchableOpacity
                key={s.id}
                onPress={() => setStatusFilter(s.id as any)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                  backgroundColor: isSelected
                    ? (s.id === 'profit' ? '#dcfce7' : s.id === 'loss' ? '#fee2e2' : (isDark ? '#334155' : '#e2e8f0'))
                    : (isDark ? colors.bgSurfaceElevated : '#f8fafc'),
                  borderWidth: 1,
                  borderColor: isSelected
                    ? (s.id === 'profit' ? '#86efac' : s.id === 'loss' ? '#fca5a5' : colors.borderColor)
                    : colors.borderColor,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: isSelected ? '700' : '500',
                    color: isSelected
                      ? (s.id === 'profit' ? '#166534' : s.id === 'loss' ? '#991b1b' : colors.textPrimary)
                      : colors.textSecondary,
                  }}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* CUSTOM DATE RANGE ROW */}
        {showCustomInputs && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <TextInput
                value={customStartDate}
                onChangeText={setCustomStartDate}
                placeholder="Start: YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                style={{
                  backgroundColor: isDark ? colors.bgSurfaceElevated : '#ffffff',
                  borderWidth: 1,
                  borderColor: colors.borderColor,
                  borderRadius: 12,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  fontSize: 12,
                  color: colors.textPrimary,
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextInput
                value={customEndDate}
                onChangeText={setCustomEndDate}
                placeholder="End: YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                style={{
                  backgroundColor: isDark ? colors.bgSurfaceElevated : '#ffffff',
                  borderWidth: 1,
                  borderColor: colors.borderColor,
                  borderRadius: 12,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  fontSize: 12,
                  color: colors.textPrimary,
                }}
              />
            </View>
            <TouchableOpacity
              onPress={() => fetchReports()}
              style={{
                backgroundColor: isDark ? colors.accent : colors.primary600,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 12,
              }}
            >
              <Text style={{ color: isDark ? colors.accentText : '#ffffff', fontWeight: '700', fontSize: 11 }}>
                Apply
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {loading && !refreshing ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary500} />
          <Text style={{ marginTop: 8, fontSize: 13, color: colors.textMuted }}>
            Generating audit report statement...
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 130 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary500} />}
          showsVerticalScrollIndicator={false}
        >
          {/* HERO NET BALANCE CARD */}
          <Card style={{ marginBottom: spacing.md, padding: spacing.lg, borderRadius: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
              <View>
                <Text style={[typography.caption, { color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                  {data?.label || period.toUpperCase()}
                </Text>
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: '800',
                    color: isProfit ? colors.success500 : colors.danger500,
                    marginTop: 2,
                  }}
                >
                  {isProfit ? `+${curr}` : `-${curr}`}
                  {Math.abs(summary.net_profit || 0).toFixed(2)}
                </Text>
              </View>
              <Badge
                status={isProfit ? 'profit' : 'loss'}
                label={isProfit ? 'OPERATING PROFIT' : 'OPERATING EXPENSE'}
              />
            </View>

            {/* DUAL ENERGY TOTALS */}
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                borderRadius: 18,
                padding: spacing.md,
                marginBottom: spacing.md,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>Solar Export Units</Text>
                <Text style={{ fontSize: 17, fontWeight: '700', color: colors.success500, marginTop: 2 }}>
                  +{Number(summary.total_export_units || 0).toFixed(1)} kWh
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                  Gross Revenue: {curr}{Number(summary.total_revenue || 0).toFixed(2)}
                </Text>
              </View>

              <View style={{ width: 1, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)', marginHorizontal: 10 }} />

              <View style={{ flex: 1 }}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>Grid Import Units</Text>
                <Text style={{ fontSize: 17, fontWeight: '700', color: colors.danger500, marginTop: 2 }}>
                  -{Number(summary.total_import_units || 0).toFixed(1)} kWh
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                  Gross Cost: {curr}{Number(summary.total_expense || 0).toFixed(2)}
                </Text>
              </View>
            </View>

            {/* AUDIT SUMMARY STATS */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={[typography.caption, { color: colors.textMuted }]}>Audited Readings</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginTop: 2 }}>
                  {summary.entry_count || (data?.entries || []).length} Days Logged
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>Daily Average Gen</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginTop: 2 }}>
                  {summary.average_daily_generated ? `${Number(summary.average_daily_generated).toFixed(1)} kWh/d` : '-'}
                </Text>
              </View>
            </View>
          </Card>

          {/* 3-METRIC EFFICIENCY & PERFORMANCE RATIOS */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.md }}>
            <Card style={{ flex: 1, padding: 12, borderRadius: 16 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' }}>
                Coverage
              </Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.success500, marginVertical: 2 }}>
                {coverageRatio}%
              </Text>
              <Text style={{ fontSize: 9.5, color: colors.textMuted }}>Gen vs Consumed</Text>
            </Card>

            <Card style={{ flex: 1, padding: 12, borderRadius: 16 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' }}>
                Export
              </Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#0284c7', marginVertical: 2 }}>
                {exportRatio}%
              </Text>
              <Text style={{ fontSize: 9.5, color: colors.textMuted }}>Sent to Grid</Text>
            </Card>

            <Card style={{ flex: 1, padding: 12, borderRadius: 16 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' }}>
                Margin
              </Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: isProfit ? colors.success500 : colors.danger500, marginVertical: 2 }}>
                {profitMargin}%
              </Text>
              <Text style={{ fontSize: 9.5, color: colors.textMuted }}>Profit / Revenue</Text>
            </Card>
          </View>

          {/* PEAK & LOWEST DAY CARD */}
          {(summary.highest_day || summary.lowest_day) && (
            <Card style={{ marginBottom: spacing.md, padding: spacing.md, borderRadius: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <TrendingUp size={16} color={colors.accent} />
                <Text style={[typography.headline, { color: colors.textPrimary, fontSize: 14 }]}>
                  Peak & Lowest Generation Day
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.caption, { color: colors.success500, fontWeight: '700' }]}>HIGH PEAK</Text>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary, marginTop: 2 }}>
                    {summary.highest_day ? `${(summary.highest_day as any).generated || (summary.highest_day as any).generated_units} kWh` : '-'}
                  </Text>
                  <Text style={{ fontSize: 10.5, color: colors.textMuted }}>
                    {summary.highest_day ? `${(summary.highest_day as any).date || (summary.highest_day as any).entry_date}` : ''}
                  </Text>
                </View>

                <View style={{ width: 1, backgroundColor: colors.borderColor, marginHorizontal: 8 }} />

                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={[typography.caption, { color: colors.danger500, fontWeight: '700' }]}>LOWEST DAY</Text>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary, marginTop: 2 }}>
                    {summary.lowest_day ? `${(summary.lowest_day as any).generated || (summary.lowest_day as any).generated_units} kWh` : '-'}
                  </Text>
                  <Text style={{ fontSize: 10.5, color: colors.textMuted }}>
                    {summary.lowest_day ? `${(summary.lowest_day as any).date || (summary.lowest_day as any).entry_date}` : ''}
                  </Text>
                </View>
              </View>
            </Card>
          )}

          {/* ITEMIZED PERIOD BREAKDOWN LIST */}
          <Text style={[typography.headline, { color: colors.textPrimary, fontSize: 15, marginBottom: spacing.sm, marginLeft: 4 }]}>
            Detailed Financial Breakdown
          </Text>

          {data?.grouped && data.grouped.length > 0 ? (
            data.grouped.map((item: any, idx: number) => {
              const rowProfit = (item.net_profit || 0) >= 0;
              const label = item.period_label || item.group_key;
              return (
                <Card key={idx} style={{ marginBottom: spacing.sm, padding: spacing.md, borderRadius: 18 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: rowProfit ? colors.success50 : colors.danger50,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {rowProfit ? (
                          <ArrowUpRight size={17} color={colors.success500} strokeWidth={2.2} />
                        ) : (
                          <ArrowDownRight size={17} color={colors.danger500} strokeWidth={2.2} />
                        )}
                      </View>
                      <View>
                        <Text style={[typography.headline, { color: colors.textPrimary, fontSize: 14 }]}>
                          {label}
                        </Text>
                        <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                          Export {Number(item.export_units || 0).toFixed(1)} kWh · Import {Number(item.import_units || 0).toFixed(1)} kWh
                        </Text>
                      </View>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '700',
                          color: rowProfit ? colors.success500 : colors.danger500,
                        }}
                      >
                        {rowProfit ? `+${curr}${Number(item.net_profit).toFixed(2)}` : `-${curr}${Math.abs(Number(item.net_profit)).toFixed(2)}`}
                      </Text>
                      <Text style={[typography.caption, { color: colors.textMuted, fontSize: 10.5, marginTop: 2 }]}>
                        {curr}{Number(item.revenue || 0).toFixed(2)} / {curr}{Number(item.expense || 0).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </Card>
              );
            })
          ) : (
            <Card style={{ padding: spacing.xl, alignItems: 'center', borderRadius: 24 }}>
              <BarChart3 size={34} color={colors.textMuted} strokeWidth={1.5} style={{ marginBottom: 10 }} />
              <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center' }]}>
                No financial statement records found for the selected filter criteria.
              </Text>
            </Card>
          )}
        </ScrollView>
      )}
    </View>
  );
};
