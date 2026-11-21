import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { colors, rounded, spacing, typography, shadows } from '../theme/tokens';
import { api } from '../api/client';
import { DashboardData, DailyEntry } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { BillCyclePanel } from '../components/bill/BillCyclePanel';
import {
  SunMedium,
  Sun,
  Moon,
  ArrowUpRight,
  ChevronRight,
  Zap,
  Calendar as CalendarIcon,
  BarChart3,
  Scale,
} from 'lucide-react-native';

interface DashboardScreenProps {
  navigation: any;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSegment, setActiveSegment] = useState<'today' | 'month' | 'year' | 'lifetime'>('today');

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const res = await api.getDashboard();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to backend server');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refetch whenever the tab gains focus so totals reflect entries added/edited elsewhere
  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [fetchDashboard])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const curr = '₹';

  // Metrics selector based on active segmented pill
  const activeMetrics = () => {
    if (!data) return { generated: 0, consumed: 0, revenue: 0, payable: 0, netProfit: 0 };
    if (activeSegment === 'today') {
      const net = (data.today.revenue || 0) - (data.today.payable || 0);
      return {
        generated: data.today.generated || 0,
        consumed: data.today.consumed || 0,
        revenue: data.today.revenue || 0,
        payable: data.today.payable || 0,
        netProfit: net,
      };
    }
    if (activeSegment === 'month') {
      return {
        generated: data.month.generated || 0,
        consumed: data.month.consumed || 0,
        revenue: data.month.revenue || 0,
        payable: data.month.expense || 0,
        netProfit: data.month.net_profit || 0,
      };
    }
    if (activeSegment === 'year') {
      return {
        generated: data.year.generated || 0,
        consumed: data.year.consumed || 0,
        revenue: data.year.revenue || 0,
        payable: data.year.expense || 0,
        netProfit: data.year.net_profit || 0,
      };
    }
    return {
      generated: data.lifetime.generated || 0,
      consumed: data.lifetime.consumed || 0,
      revenue: data.lifetime.revenue || 0,
      payable: data.lifetime.expense || 0,
      netProfit: data.lifetime.net_profit || 0,
    };
  };

  const metrics = activeMetrics();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgApp }}>
      {/* 1. TOP USER & ACTION BAR (Image 1 & 4 Style) */}
      <View
        style={{
          paddingTop: Math.max(insets.top + 8, 20),
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.sm,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: isDark ? colors.bgSurfaceElevated : '#ffffff',
              borderWidth: 1,
              borderColor: colors.borderColor,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SunMedium size={22} color={colors.accent} strokeWidth={2.2} />
          </View>
          <View>
            <Text style={[typography.headline, { color: colors.textPrimary, fontSize: 16 }]}>
              Solar Tracker
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11 }]}>
              {data?.latest?.reading_date ? `Latest: ${data.latest.reading_date}` : 'Rooftop System'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={toggleTheme}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Toggle Light and Dark Mode"
          style={{
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: rounded.full,
            backgroundColor: isDark ? colors.bgSurfaceElevated : '#ffffff',
            borderWidth: 1,
            borderColor: colors.borderColor,
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
          <Text style={{ fontSize: 13, color: colors.textPrimary, fontWeight: '600' }}>
            {isDark ? 'Light' : 'Dark'}
          </Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.sm }]}>
            Loading solar metrics...
          </Text>
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg }}>
          <EmptyState
            title="Connection Notice"
            description={error}
            actionTitle="Retry"
            onAction={fetchDashboard}
          />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 130 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          showsVerticalScrollIndicator={false}
        >
          {/* BALANCE & BILLS */}
          <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
            <BillCyclePanel />
          </View>

          {/* 2. HERO METER READINGS CARD */}
          <Card
            variant="hero"
            style={{
              marginBottom: spacing.md,
              padding: spacing.md,
              borderRadius: 24,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: colors.accent,
                  }}
                />
                <Text
                  style={[
                    typography.caption,
                    {
                      color: colors.textSecondary,
                      fontWeight: '700',
                      letterSpacing: 0.6,
                      textTransform: 'uppercase',
                    },
                  ]}
                >
                  ELECTRICITY METERS
                </Text>
              </View>
              <Badge
                status={metrics.netProfit >= 0 ? 'profit' : 'loss'}
                label={metrics.netProfit >= 0 ? 'NET PROFIT' : 'NET DEFICIT'}
                size="sm"
              />
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              {/* Solar Export Meter */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: colors.success50,
                  padding: spacing.md,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(52, 211, 153, 0.25)' : 'rgba(45, 106, 79, 0.18)',
                }}
              >
                <Text
                  style={[
                    typography.caption,
                    {
                      color: isDark ? colors.success500 : colors.success600,
                      fontSize: 12,
                      fontWeight: '700',
                    },
                  ]}
                >
                  Export Meter (Solar)
                </Text>
                <Text
                  style={{
                    fontSize: 26,
                    fontWeight: '800',
                    color: isDark ? colors.success500 : colors.success600,
                    marginTop: 4,
                  }}
                >
                  {data?.latest?.export_meter !== null && data?.latest?.export_meter !== undefined
                    ? data.latest.export_meter
                    : '—'}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: colors.textSecondary,
                    marginTop: 3,
                    fontWeight: '500',
                  }}
                >
                  Closing Units (kWh)
                </Text>
              </View>

              {/* Grid Import Meter */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: colors.danger50,
                  padding: spacing.md,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(251, 113, 133, 0.25)' : 'rgba(168, 62, 62, 0.18)',
                }}
              >
                <Text
                  style={[
                    typography.caption,
                    {
                      color: isDark ? colors.danger500 : colors.danger600,
                      fontSize: 12,
                      fontWeight: '700',
                    },
                  ]}
                >
                  Import Meter (Grid)
                </Text>
                <Text
                  style={{
                    fontSize: 26,
                    fontWeight: '800',
                    color: isDark ? colors.danger500 : colors.danger600,
                    marginTop: 4,
                  }}
                >
                  {data?.latest?.import_meter !== null && data?.latest?.import_meter !== undefined
                    ? data.latest.import_meter
                    : '—'}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: colors.textSecondary,
                    marginTop: 3,
                    fontWeight: '500',
                  }}
                >
                  Closing Units (kWh)
                </Text>
              </View>
            </View>
          </Card>

          {/* 3. SEGMENTED TIME PILL SELECTOR */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: isDark ? colors.bgSurfaceElevated : colors.bgSubtle,
              borderRadius: rounded.full,
              padding: 4,
              borderWidth: 1,
              borderColor: colors.borderColor,
              marginBottom: spacing.md,
            }}
          >
            {(['today', 'month', 'year', 'lifetime'] as const).map((seg) => {
              const isActive = activeSegment === seg;
              const labels = {
                today: 'Today',
                month: 'Month',
                year: 'Year',
                lifetime: 'Lifetime',
              };
              return (
                <TouchableOpacity
                  key={seg}
                  onPress={() => setActiveSegment(seg)}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter by ${labels[seg]}`}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: rounded.full,
                    backgroundColor: isActive ? (isDark ? colors.accent : colors.primary600) : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: isActive ? '#ffffff' : colors.textSecondary,
                        fontWeight: isActive ? '700' : '500',
                      },
                    ]}
                  >
                    {labels[seg]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 4. OVERVIEW STATS */}
          <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
            {/* Generated Card */}
            <Card style={{ flex: 1, padding: spacing.md }}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>Solar Generated</Text>
              <Text style={[typography.display, { color: colors.textPrimary, fontSize: 24, marginTop: 4 }]}>
                {metrics.generated.toFixed(2)}
                <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textSecondary }}> kWh</Text>
              </Text>

              <View style={{ marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ backgroundColor: colors.success50, paddingHorizontal: 6, paddingVertical: 2, borderRadius: rounded.sm }}>
                  <Text style={[typography.micro, { color: colors.successText }]}>
                    +{curr}{metrics.revenue.toFixed(2)}
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>Earned</Text>
              </View>
            </Card>

            {/* Consumed Card */}
            <Card style={{ flex: 1, padding: spacing.md }}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>Grid Consumed</Text>
              <Text style={[typography.display, { color: colors.textPrimary, fontSize: 24, marginTop: 4 }]}>
                {metrics.consumed.toFixed(2)}
                <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textSecondary }}> kWh</Text>
              </Text>

              <View style={{ marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ backgroundColor: colors.danger50, paddingHorizontal: 6, paddingVertical: 2, borderRadius: rounded.sm }}>
                  <Text style={[typography.micro, { color: colors.dangerText }]}>
                    -{curr}{metrics.payable.toFixed(2)}
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>Owed</Text>
              </View>
            </Card>
          </View>

          {/* 4b. NET UNIT SURPLUS / DEFICIT CARD (Matches Web KPI 5) */}
          <Card
            style={{
              marginBottom: spacing.md,
              padding: spacing.md,
              borderRadius: 20,
              backgroundColor: isDark
                ? (metrics.netProfit >= 0 ? 'rgba(52, 211, 153, 0.08)' : 'rgba(251, 113, 133, 0.08)')
                : (metrics.netProfit >= 0 ? colors.success50 : colors.danger50),
              borderWidth: 1,
              borderColor: metrics.netProfit >= 0 ? colors.success500 : colors.danger500,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase' }]}>
                  Net Unit Surplus / Deficit
                </Text>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: '800',
                    color: metrics.netProfit >= 0 ? colors.success500 : colors.danger500,
                    marginTop: 2,
                  }}
                >
                  {(metrics.generated - metrics.consumed) > 0 ? '+' : ''}
                  {(metrics.generated - metrics.consumed).toFixed(2)}
                  <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textSecondary }}> kWh</Text>
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase' }]}>
                  {metrics.netProfit >= 0 ? 'Net Profit' : 'Net Cost'}
                </Text>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: '800',
                    color: metrics.netProfit >= 0 ? colors.success500 : colors.danger500,
                    marginTop: 2,
                  }}
                >
                  {metrics.netProfit >= 0 ? `+${curr}` : `-${curr}`}
                  {Math.abs(metrics.netProfit).toFixed(2)}
                </Text>
              </View>
            </View>
          </Card>

          {/* 5. QUICK NAVIGATION HUB (Full Feature Access: Calendar, Reports, Analytics, Settlement) */}
          <Text style={[typography.headline, { color: colors.textPrimary, fontSize: 15, marginBottom: spacing.xs, marginTop: 4 }]}>
            Solar Tools & Reports
          </Text>

          <View style={{ flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md }}>
            {/* Calendar */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Calendar')}
              style={{
                flex: 1,
                padding: spacing.sm + 2,
                borderRadius: 18,
                backgroundColor: isDark ? colors.bgSurfaceElevated : '#ffffff',
                borderWidth: 1,
                borderColor: colors.borderColor,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.10)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CalendarIcon size={18} color={isDark ? '#60a5fa' : '#2563eb'} strokeWidth={2.2} />
              </View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }}>
                Calendar
              </Text>
            </TouchableOpacity>

            {/* Reports */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('ReportsTab')}
              style={{
                flex: 1,
                padding: spacing.sm + 2,
                borderRadius: 18,
                backgroundColor: isDark ? colors.bgSurfaceElevated : '#ffffff',
                borderWidth: 1,
                borderColor: colors.borderColor,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: isDark ? 'rgba(224, 122, 95, 0.15)' : 'rgba(217, 108, 74, 0.10)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <BarChart3 size={18} color={colors.accent} strokeWidth={2.2} />
              </View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }}>
                Reports
              </Text>
            </TouchableOpacity>

            {/* Settlement */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('RecordsTab', { tab: 'settlement' })}
              style={{
                flex: 1,
                padding: spacing.sm + 2,
                borderRadius: 18,
                backgroundColor: isDark ? colors.bgSurfaceElevated : '#ffffff',
                borderWidth: 1,
                borderColor: colors.borderColor,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.10)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Scale size={18} color={isDark ? '#fbbf24' : '#d97706'} strokeWidth={2.2} />
              </View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }}>
                Settlement
              </Text>
            </TouchableOpacity>
          </View>

          {/* 6. SETTLEMENT CALLOUT ACTION BANNER */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => navigation.navigate('RecordsTab', { tab: 'settlement' })}
            style={{
              backgroundColor: isDark ? colors.bgSurfaceElevated : colors.accentSubtle,
              borderRadius: isDark ? 16 : 22,
              padding: spacing.md + 2,
              marginBottom: spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderWidth: 1,
              borderColor: isDark ? colors.borderColor : 'rgba(217, 108, 74, 0.20)',
              ...(isDark ? {} : shadows.sm),
            }}
          >
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: colors.textPrimary,
                }}
              >
                Monthly Settlement Carry-Forward
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 12,
                  marginTop: 3,
                  fontWeight: '500',
                }}
              >
                View day-by-day government credits, meter diffs & DISCOM adjustments
              </Text>
            </View>

            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowUpRight size={20} color={colors.accentText} strokeWidth={2.2} />
            </View>
          </TouchableOpacity>

          {/* 6. RECENT ENTRIES LIST (Image 4 Style Clean Activity List) */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm, marginTop: spacing.xs }}>
            <Text style={[typography.headline, { color: colors.textPrimary }]}>Recent Solar Logs</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('RecordsTab', { tab: 'history' })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
            >
              <Text style={[typography.caption, { color: colors.accent, fontWeight: '700' }]}>
                View all
              </Text>
              <ChevronRight size={14} color={colors.accent} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {data?.recentEntries && data.recentEntries.length > 0 ? (
            data.recentEntries.map((item: DailyEntry) => {
              const isProfit = item.status === 'profit';
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.78}
                  onPress={() => navigation.navigate('DailyEntry', { id: item.id })}
                >
                  <Card style={{ marginBottom: spacing.sm, padding: spacing.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                        <View
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 12,
                            backgroundColor: isProfit ? colors.success50 : colors.danger50,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isProfit ? (
                            <SunMedium size={18} color={colors.success500} strokeWidth={2} />
                          ) : (
                            <Zap size={18} color={colors.danger500} strokeWidth={2} />
                          )}
                        </View>
                        <View>
                          <Text style={[typography.headline, { color: colors.textPrimary, fontSize: 15 }]}>
                            {item.entry_date}
                          </Text>
                          <Text style={[typography.caption, { color: colors.textMuted, fontSize: 12, marginTop: 1 }]}>
                            Gen {item.generated_units} kWh · Con {item.consumed_units} kWh
                          </Text>
                        </View>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Text
                          style={[
                            typography.headline,
                            {
                              color: isProfit ? (isDark ? colors.accent : colors.success600) : colors.danger600,
                              fontWeight: '700',
                              fontSize: 15,
                            },
                          ]}
                        >
                          {isProfit ? `+${curr}${item.revenue}` : `-${curr}${item.payable}`}
                        </Text>
                        <Badge status={item.status} size="sm" style={{ marginTop: 2 }} />
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })
          ) : (
            <Card style={{ padding: spacing.lg, alignItems: 'center' }}>
              <Text style={[typography.body, { color: colors.textMuted }]}>
                No solar readings logged yet.
              </Text>
              <Button
                title="Log Today's Reading"
                onPress={() => navigation.navigate('DailyEntry')}
                variant="accent"
                size="sm"
                style={{ marginTop: spacing.md }}
              />
            </Card>
          )}
        </ScrollView>
      )}
    </View>
  );
};
