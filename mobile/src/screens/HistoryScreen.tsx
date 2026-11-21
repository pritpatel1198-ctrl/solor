import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { rounded, spacing, typography } from '../theme/tokens';
import { api } from '../api/client';
import { DailyEntry } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Header } from '../components/common/Header';
import { EmptyState } from '../components/common/EmptyState';
import { downloadOrShareTextFile } from '../utils/exportUtils';
import { localDateStr } from '../utils/date';
import {
  SunMedium,
  Zap,
  Scale,
  Search,
  X,
  Trash2,
  Edit3,
  FileText,
  Download,
  Filter,
  ArrowUpDown,
  CheckSquare,
  Square,
  Calendar as CalendarIcon,
} from 'lucide-react-native';

interface HistoryScreenProps {
  navigation: any;
  embedded?: boolean; // shown inside Records, which has its own title
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ navigation, embedded }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Date Range Filters (Matching Web)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilterCard, setShowFilterCard] = useState(false);

  // Sorting Controls (Matching Web)
  const [sortBy, setSortBy] = useState('entry_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Multi-Select & Bulk Delete (Matching Web)
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Prevents overlapping "load more" requests from appending the same page twice
  const isFetchingRef = useRef(false);

  const fetchEntries = useCallback(
    async (resetPage: boolean = false) => {
      if (!resetPage && isFetchingRef.current) return;
      isFetchingRef.current = true;
      try {
        const currentPage = resetPage ? 1 : page;
        const res = await api.getEntries({
          page: currentPage,
          limit: 15,
          search: search || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          sortBy,
          sortOrder,
        });

        const newEntries = res.entries || [];
        if (resetPage) {
          setEntries(newEntries);
          setPage(2);
        } else {
          setEntries((prev) => [...prev, ...newEntries]);
          setPage((prev) => prev + 1);
        }
        setHasMore(newEntries.length === 15);
      } catch (err: any) {
        console.warn('Failed to load history:', err.message);
      } finally {
        isFetchingRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, search, statusFilter, startDate, endDate, sortBy, sortOrder]
  );

  // Reload page 1 when returning to this tab (entries may have changed elsewhere).
  // fetchEntries changes after every page load, so it is read through a ref.
  const fetchEntriesRef = useRef(fetchEntries);
  fetchEntriesRef.current = fetchEntries;
  const hasFocusedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (hasFocusedRef.current) fetchEntriesRef.current(true);
      hasFocusedRef.current = true;
    }, [])
  );

  useEffect(() => {
    setLoading(true);
    fetchEntries(true);
  }, [search, statusFilter, startDate, endDate, sortBy, sortOrder]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEntries(true);
  };

  const handleDelete = (id: string, date: string) => {
    Alert.alert('Delete Reading', `Are you sure you want to delete the reading for ${date}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteEntry(id);
            setEntries((prev) => prev.filter((e) => e.id !== id));
            Alert.alert('Deleted', 'Entry deleted successfully');
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to delete');
          }
        },
      },
    ]);
  };

  // Bulk Deletion
  const handleBulkDelete = () => {
    const idsArr = Array.from(selectedIds);
    if (idsArr.length === 0) return;

    Alert.alert(
      'Bulk Delete',
      `Are you sure you want to delete ${idsArr.length} selected solar entries?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await api.bulkDeleteEntries(idsArr);
              setSelectedIds(new Set());
              setSelectMode(false);
              fetchEntries(true);
              Alert.alert('Success', `Deleted ${idsArr.length} entries successfully.`);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Bulk delete failed');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Toggle selection for an item
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all or deselect all
  const handleSelectAll = () => {
    if (selectedIds.size === entries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(entries.map((e) => e.id)));
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (entries.length === 0) {
      Alert.alert('Notice', 'No entries to export.');
      return;
    }

    const headers = [
      'Date', 'Generated Units (kWh)', 'Consumed Units (kWh)', 'Net Units (kWh)',
      'Buying Rate', 'Selling Rate', 'Revenue', 'Payable', 'Status', 'Notes'
    ];

    const rows = entries.map((e) => [
      e.entry_date,
      e.generated_units,
      e.consumed_units,
      e.net_units,
      e.buying_rate,
      e.selling_rate,
      e.revenue,
      e.payable,
      e.status,
      `"${(e.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadOrShareTextFile(
      `solar_history_${localDateStr()}.csv`,
      csvContent,
      'text/csv'
    );
  };

  const curr = '₹';

  const filterTabs = [
    { key: 'all', label: 'All Logs' },
    { key: 'profit', label: 'Surplus' },
    { key: 'loss', label: 'Deficit' },
    { key: 'balanced', label: 'Balanced' },
  ];

  const sortOptions = [
    { key: 'entry_date', label: 'Date' },
    { key: 'generated_units', label: 'Generated' },
    { key: 'consumed_units', label: 'Consumed' },
    { key: 'net_units', label: 'Net Units' },
    { key: 'revenue', label: 'Revenue' },
  ];

  const renderItem = ({ item }: { item: DailyEntry }) => {
    const isProfit = item.status === 'profit';
    const isLoss = item.status === 'loss';
    const isSelected = selectedIds.has(item.id);

    return (
      <Card
        style={{
          marginBottom: spacing.sm,
          padding: spacing.md,
          borderRadius: 20,
          borderWidth: isSelected ? 2 : 1,
          borderColor: isSelected ? colors.accent : colors.borderColor,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            if (selectMode) {
              toggleSelect(item.id);
            } else {
              navigation.navigate('DailyEntry', { id: item.id });
            }
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              {/* SELECT CHECKBOX OR STATUS AVATAR */}
              {selectMode ? (
                <TouchableOpacity onPress={() => toggleSelect(item.id)} style={{ padding: 4 }}>
                  {isSelected ? (
                    <CheckSquare size={24} color={colors.accent} strokeWidth={2.4} />
                  ) : (
                    <Square size={24} color={colors.textMuted} strokeWidth={1.8} />
                  )}
                </TouchableOpacity>
              ) : (
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: isProfit
                      ? colors.success50
                      : isLoss
                      ? colors.danger50
                      : colors.bgSubtle,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isProfit ? (
                    <SunMedium size={20} color={colors.success500} strokeWidth={2} />
                  ) : isLoss ? (
                    <Zap size={20} color={colors.danger500} strokeWidth={2} />
                  ) : (
                    <Scale size={20} color={colors.textSecondary} strokeWidth={2} />
                  )}
                </View>
              )}

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[typography.headline, { color: colors.textPrimary, fontSize: 15 }]}>
                    {item.entry_date}
                  </Text>
                  <Badge status={item.status} size="sm" />
                </View>
                <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                  Solar {item.generated_units} kWh · Grid {item.consumed_units} kWh
                </Text>
              </View>
            </View>

            {/* AMOUNT COLUMN */}
            <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
              <Text
                style={[
                  typography.headline,
                  {
                    color: isProfit
                      ? colors.success500
                      : isLoss
                      ? colors.danger500
                      : colors.textPrimary,
                    fontSize: 16,
                    fontWeight: '700',
                  },
                ]}
              >
                {isProfit ? `+${curr}${item.revenue}` : isLoss ? `-${curr}${item.payable}` : `${curr}0.00`}
              </Text>
              <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11, marginTop: 2 }]}>
                {isProfit ? 'Net Credit' : isLoss ? 'Net Charge' : 'Balanced'}
              </Text>
            </View>
          </View>

          {item.notes ? (
            <View
              style={{
                marginTop: 10,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 10,
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
              }}
            >
              <Text style={[typography.caption, { color: colors.textSecondary, fontStyle: 'italic', fontSize: 12 }]}>
                "{item.notes}"
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>

        {/* BOTTOM COMPACT ACTION ROW */}
        {!selectMode && (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              gap: spacing.md,
              marginTop: 10,
              paddingTop: 8,
              borderTopWidth: 1,
              borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
            }}
          >
            <TouchableOpacity
              onPress={() => navigation.navigate('DailyEntry', { id: item.id })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 14,
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Edit3 size={13} color={colors.textPrimary} strokeWidth={2} />
              <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '600' }]}>
                Edit
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleDelete(item.id, item.entry_date)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 14,
                backgroundColor: colors.danger50,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Trash2 size={13} color={colors.danger500} strokeWidth={2} />
              <Text style={[typography.caption, { color: colors.danger500, fontWeight: '600' }]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgApp }}>
      {!embedded && (
        <Header
          title="History & Logs"
          subtitle="Search, filter, export & manage historical logs"
          style={{ paddingTop: Math.max(insets.top, 16) }}
        />
      )}

      {/* TOP TOOLBAR: SEARCH, ACTIONS & FILTER EXPANDER */}
      <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xs, gap: spacing.xs }}>
        {/* ACTION ROW: Export CSV, Date Range toggle, Select Mode */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity
              onPress={() => setShowFilterCard(!showFilterCard)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 16,
                backgroundColor: (startDate || endDate) ? (isDark ? colors.accent : colors.primary600) : (isDark ? colors.bgSurfaceElevated : '#ffffff'),
                borderWidth: 1,
                borderColor: colors.borderColor,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Filter size={13} color={(startDate || endDate) ? '#ffffff' : colors.textPrimary} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: (startDate || endDate) ? '#ffffff' : colors.textPrimary }}>
                Date Range
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleExportCSV}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 16,
                backgroundColor: isDark ? colors.bgSurfaceElevated : '#ffffff',
                borderWidth: 1,
                borderColor: colors.borderColor,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Download size={13} color={colors.textPrimary} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textPrimary }}>
                CSV
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity
              onPress={() => {
                setSelectMode(!selectMode);
                setSelectedIds(new Set());
              }}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 16,
                backgroundColor: selectMode ? (isDark ? colors.accent : colors.primary600) : (isDark ? colors.bgSurfaceElevated : '#ffffff'),
                borderWidth: 1,
                borderColor: colors.borderColor,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: selectMode ? '#ffffff' : colors.textPrimary }}>
                {selectMode ? 'Cancel' : 'Select'}
              </Text>
            </TouchableOpacity>

            {selectMode && (
              <TouchableOpacity
                onPress={handleSelectAll}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 16,
                  backgroundColor: isDark ? colors.bgSurfaceElevated : '#ffffff',
                  borderWidth: 1,
                  borderColor: colors.borderColor,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textPrimary }}>
                  {selectedIds.size === entries.length ? 'Deselect' : 'All'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* BULK DELETE ACTION BAR */}
        {selectMode && selectedIds.size > 0 && (
          <TouchableOpacity
            onPress={handleBulkDelete}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 14,
              backgroundColor: colors.danger500,
              borderRadius: 18,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 4,
            }}
          >
            <Trash2 size={16} color="#ffffff" />
            <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 13 }}>
              Delete Selected ({selectedIds.size})
            </Text>
          </TouchableOpacity>
        )}

        {/* DATE RANGE EXPANDED CARD */}
        {showFilterCard && (
          <Card style={{ padding: spacing.sm, borderRadius: 16, gap: 8, marginTop: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }}>
              Filter by Date Range (YYYY-MM-DD)
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                placeholder="Start (e.g. 2026-08-01)"
                placeholderTextColor={colors.textMuted}
                value={startDate}
                onChangeText={setStartDate}
                style={{
                  flex: 1,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.borderColor,
                  color: colors.textPrimary,
                  fontSize: 12,
                  backgroundColor: isDark ? colors.bgSubtle : '#ffffff',
                }}
              />
              <TextInput
                placeholder="End (e.g. 2026-08-31)"
                placeholderTextColor={colors.textMuted}
                value={endDate}
                onChangeText={setEndDate}
                style={{
                  flex: 1,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.borderColor,
                  color: colors.textPrimary,
                  fontSize: 12,
                  backgroundColor: isDark ? colors.bgSubtle : '#ffffff',
                }}
              />
              {(startDate || endDate) && (
                <TouchableOpacity
                  onPress={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  style={{ padding: 8, justifyContent: 'center' }}
                >
                  <X size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </Card>
        )}

        {/* SEARCH BAR */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isDark ? colors.bgSubtle : '#ffffff',
            borderColor: isDark ? colors.borderColor : 'rgba(0, 0, 0, 0.08)',
            borderWidth: 1,
            borderRadius: isDark ? 12 : 24,
            minHeight: 42,
            paddingHorizontal: spacing.md,
            gap: 8,
          }}
        >
          <Search size={16} color={colors.textMuted} strokeWidth={2} />
          <TextInput
            placeholder="Search dates, comments, notes..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            style={{
              flex: 1,
              color: colors.textPrimary,
              fontSize: 13,
              paddingVertical: 6,
              ...(Platform.OS === 'web'
                ? ({
                    outlineStyle: 'none',
                    outlineWidth: 0,
                    outline: 'none',
                    boxShadow: 'none',
                  } as any)
                : {}),
            }}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={14} color={colors.textMuted} strokeWidth={2.2} />
            </TouchableOpacity>
          )}
        </View>

        {/* STATUS PILLS & SORT TOGGLE */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {filterTabs.map((tab) => {
              const active = statusFilter === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setStatusFilter(tab.key)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: 18,
                    backgroundColor: active
                      ? (isDark ? colors.accent : colors.primary600)
                      : (isDark ? colors.bgSurfaceElevated : colors.bgSurface),
                    borderWidth: 1,
                    borderColor: active ? 'transparent' : colors.borderColor,
                  }}
                >
                  <Text
                    style={{
                      color: active ? (isDark ? colors.accentText : '#ffffff') : colors.textSecondary,
                      fontWeight: active ? '700' : '500',
                      fontSize: 12,
                    }}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* SORT ORDER TOGGLE */}
          <TouchableOpacity
            onPress={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            style={{
              paddingHorizontal: 8,
              paddingVertical: 5,
              borderRadius: 14,
              backgroundColor: isDark ? colors.bgSurfaceElevated : '#ffffff',
              borderWidth: 1,
              borderColor: colors.borderColor,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <ArrowUpDown size={12} color={colors.textPrimary} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textPrimary }}>
              {sortOrder.toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* SORT METRIC SELECTOR */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 2 }}>
          {sortOptions.map((opt) => {
            const isSelected = sortBy === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setSortBy(opt.key)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                  backgroundColor: isSelected ? (isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(37, 99, 235, 0.10)') : 'transparent',
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: isSelected ? '700' : '500', color: isSelected ? colors.accent : colors.textMuted }}>
                  • {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading && !refreshing ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary500} />
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 130 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary500}
            />
          }
          onEndReached={() => {
            if (hasMore && !loading) fetchEntries(false);
          }}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon={<FileText size={36} color={colors.textMuted} strokeWidth={1.5} />}
              title="No logs found"
              description="No solar meter entries match your criteria."
              actionTitle="Log New Reading"
              onAction={() => navigation.navigate('DailyEntry')}
            />
          }
        />
      )}
    </View>
  );
};
