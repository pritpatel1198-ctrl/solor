import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { rounded, spacing, typography, shadows } from '../theme/tokens';
import { api } from '../api/client';
import { DailyEntry } from '../types';
import { Header } from '../components/common/Header';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { localDateStr } from '../utils/date';
import {
  ChevronLeft,
  ChevronRight,
  SunMedium,
  Zap,
  Calendar as CalendarIcon,
  X,
  Edit3,
  Plus,
} from 'lucide-react-native';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface CalendarScreenProps {
  navigation: any;
}

export const CalendarScreen: React.FC<CalendarScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [entriesMap, setEntriesMap] = useState<Record<string, DailyEntry>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const loadMonthData = useCallback(async () => {
    try {
      setLoading(true);
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const startDateStr = localDateStr(new Date(year, month, 1 - firstDay.getDay()));
      const endDateStr = localDateStr(new Date(year, month + 1, 6 - lastDay.getDay()));

      const res = await api.getEntries({
        startDate: startDateStr,
        endDate: endDateStr,
        limit: 100,
      });

      const map: Record<string, DailyEntry> = {};
      (res.entries || []).forEach((e) => {
        map[e.entry_date] = e;
      });
      setEntriesMap(map);
    } catch (err: any) {
      console.warn('Calendar data error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  // Refetch on focus as well as on month change
  useFocusEffect(
    useCallback(() => {
      loadMonthData();
    }, [loadMonthData])
  );

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDayPress = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    setModalVisible(true);
  };

  const selectedEntry = selectedDateStr ? entriesMap[selectedDateStr] : null;

  // Build 35 or 42 grid cells
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const totalDaysInMonth = lastDay.getDate();
  const startingDayIndex = firstDay.getDay();

  const totalCells = startingDayIndex + totalDaysInMonth > 35 ? 42 : 35;
  const startGridDate = new Date(year, month, 1 - startingDayIndex);
  const todayStr = localDateStr();

  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const cellDate = new Date(startGridDate);
    cellDate.setDate(startGridDate.getDate() + i);
    const dateStr = localDateStr(cellDate);
    const isOtherMonth = cellDate.getMonth() !== month;
    const isToday = dateStr === todayStr;
    const entry = entriesMap[dateStr];

    cells.push({
      dateStr,
      dayNum: cellDate.getDate(),
      isOtherMonth,
      isToday,
      entry,
    });
  }

  const curr = '₹';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgApp }}>
      <Header
        title="Calendar View"
        subtitle="Day-by-day generation & billing breakdown"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        style={{ paddingTop: Math.max(insets.top, 16) }}
      />

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
      >
        {/* MONTH HEADER CARD */}
        <Card style={{ marginBottom: spacing.md, padding: spacing.md, borderRadius: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                onPress={handlePrevMonth}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ChevronLeft size={20} color={colors.textPrimary} strokeWidth={2.2} />
              </TouchableOpacity>

              <Text style={[typography.headline, { color: colors.textPrimary, fontSize: 17 }]}>
                {MONTH_NAMES[month]} {year}
              </Text>

              <TouchableOpacity
                onPress={handleNextMonth}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ChevronRight size={20} color={colors.textPrimary} strokeWidth={2.2} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleToday}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 18,
                backgroundColor: isDark ? colors.accent : colors.primary600,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? colors.accentText : '#ffffff' }}>
                Today
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* CALENDAR GRID */}
        <Card style={{ padding: spacing.sm, borderRadius: 24 }}>
          {/* DAY NAMES HEADER */}
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderColor, paddingBottom: 8, marginBottom: 4 }}>
            {DAYS_OF_WEEK.map((d, idx) => (
              <View key={d} style={{ flex: 1, alignItems: 'center' }}>
                <Text
                  style={[
                    typography.caption,
                    {
                      color: idx === 0 || idx === 6 ? colors.accent : colors.textMuted,
                      fontWeight: '700',
                      fontSize: 12,
                    },
                  ]}
                >
                  {d}
                </Text>
              </View>
            ))}
          </View>

          {loading ? (
            <View style={{ padding: 60, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={[typography.caption, { color: colors.textMuted, marginTop: 12 }]}>
                Loading calendar logs...
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {cells.map((cell) => {
                const hasEntry = !!cell.entry;
                const isProfit = cell.entry?.status === 'profit';
                const isLoss = cell.entry?.status === 'loss';

                return (
                  <TouchableOpacity
                    key={cell.dateStr}
                    onPress={() => handleDayPress(cell.dateStr)}
                    activeOpacity={0.7}
                    style={{
                      width: '14.28%',
                      minHeight: 68,
                      padding: 2,
                      borderWidth: cell.isToday ? 1.5 : 0.5,
                      borderColor: cell.isToday
                        ? colors.accent
                        : isDark
                        ? 'rgba(255,255,255,0.06)'
                        : 'rgba(0,0,0,0.05)',
                      borderRadius: 10,
                      backgroundColor: cell.isToday
                        ? isDark
                          ? 'rgba(16, 185, 129, 0.12)'
                          : 'rgba(217, 108, 74, 0.08)'
                        : cell.isOtherMonth
                        ? 'transparent'
                        : isDark
                        ? 'rgba(255,255,255,0.02)'
                        : 'rgba(0,0,0,0.01)',
                      justifyContent: 'space-between',
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 2 }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: cell.isToday ? '800' : '600',
                          color: cell.isToday
                            ? colors.accent
                            : cell.isOtherMonth
                            ? colors.textMuted
                            : colors.textPrimary,
                          opacity: cell.isOtherMonth ? 0.45 : 1,
                        }}
                      >
                        {cell.dayNum}
                      </Text>
                      {hasEntry && (
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: isProfit
                              ? colors.success500
                              : isLoss
                              ? colors.danger500
                              : colors.accent,
                          }}
                        />
                      )}
                    </View>

                    {hasEntry ? (
                      <View style={{ marginTop: 2, paddingHorizontal: 1 }}>
                        <Text
                          numberOfLines={1}
                          style={{
                            fontSize: 9.5,
                            fontWeight: '700',
                            color: colors.success500,
                          }}
                        >
                          +{cell.entry?.generated_units}u
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={{
                            fontSize: 9.5,
                            fontWeight: '600',
                            color: colors.danger500,
                          }}
                        >
                          -{cell.entry?.consumed_units}u
                        </Text>
                      </View>
                    ) : (
                      <View style={{ flex: 1 }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Card>
      </ScrollView>

      {/* DETAIL MODAL FOR TAPPED DATE */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: isDark ? colors.bgSurfaceElevated : '#ffffff',
                borderColor: colors.borderColor,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <CalendarIcon size={18} color={colors.accent} strokeWidth={2.2} />
                <Text style={[typography.headline, { color: colors.textPrimary, fontSize: 17 }]}>
                  {selectedDateStr}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color={colors.textMuted} strokeWidth={2.2} />
              </TouchableOpacity>
            </View>

            {selectedEntry ? (
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>Status</Text>
                  <Badge status={selectedEntry.status} size="sm" />
                </View>

                <View style={{ height: 1, backgroundColor: colors.borderColor }} />

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>Solar Generated</Text>
                  <Text style={{ fontWeight: '700', color: colors.success500, fontSize: 15 }}>
                    {selectedEntry.generated_units} kWh
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>Grid Consumed</Text>
                  <Text style={{ fontWeight: '700', color: colors.danger500, fontSize: 15 }}>
                    {selectedEntry.consumed_units} kWh
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>Net Units</Text>
                  <Text
                    style={{
                      fontWeight: '800',
                      color: selectedEntry.net_units >= 0 ? colors.success500 : colors.danger500,
                      fontSize: 15,
                    }}
                  >
                    {selectedEntry.net_units > 0 ? `+${selectedEntry.net_units}` : selectedEntry.net_units} kWh
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>Revenue / Payable</Text>
                  <Text
                    style={{
                      fontWeight: '800',
                      color: selectedEntry.status === 'profit' ? colors.success500 : colors.danger500,
                      fontSize: 16,
                    }}
                  >
                    {selectedEntry.status === 'profit'
                      ? `+${curr}${selectedEntry.revenue}`
                      : selectedEntry.status === 'loss'
                      ? `-${curr}${selectedEntry.payable}`
                      : `${curr}0.00`}
                  </Text>
                </View>

                {selectedEntry.opening_export_meter !== null && selectedEntry.opening_export_meter !== undefined && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[typography.caption, { color: colors.textMuted }]}>Export Meters</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                      {selectedEntry.opening_export_meter} → {selectedEntry.closing_export_meter}
                    </Text>
                  </View>
                )}

                {selectedEntry.opening_import_meter !== null && selectedEntry.opening_import_meter !== undefined && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[typography.caption, { color: colors.textMuted }]}>Import Meters</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                      {selectedEntry.opening_import_meter} → {selectedEntry.closing_import_meter}
                    </Text>
                  </View>
                )}

                {selectedEntry.notes ? (
                  <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', padding: 10, borderRadius: 12 }}>
                    <Text style={{ fontSize: 12, fontStyle: 'italic', color: colors.textSecondary }}>
                      "{selectedEntry.notes}"
                    </Text>
                  </View>
                ) : null}

                <Button
                  title="Edit Daily Entry"
                  icon={<Edit3 size={16} color={colors.accentText} strokeWidth={2.2} />}
                  onPress={() => {
                    setModalVisible(false);
                    navigation.navigate('DailyEntry', { id: selectedEntry.id });
                  }}
                  variant="primary"
                  size="md"
                  style={{ marginTop: 8, borderRadius: 20 }}
                />
              </View>
            ) : (
              <View style={{ paddingVertical: 12, alignItems: 'center', gap: 14 }}>
                <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center' }]}>
                  No meter reading recorded for this date.
                </Text>

                <Button
                  title={`Add Reading for ${selectedDateStr}`}
                  icon={<Plus size={16} color={colors.accentText} strokeWidth={2.4} />}
                  onPress={() => {
                    setModalVisible(false);
                    navigation.navigate('DailyEntry', { date: selectedDateStr });
                  }}
                  variant="primary"
                  size="md"
                  style={{ borderRadius: 20, width: '100%' }}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    ...shadows.md,
  },
});
