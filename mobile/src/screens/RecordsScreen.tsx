import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { History, Scale } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, typography } from '../theme/tokens';
import { HistoryScreen } from './HistoryScreen';
import { SettlementScreen } from './SettlementScreen';

type RecordsTab = 'history' | 'settlement';

interface RecordsScreenProps {
  navigation: any;
  route?: { params?: { tab?: RecordsTab } };
}

/** History and Settlement in one module. */
export const RecordsScreen: React.FC<RecordsScreenProps> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<RecordsTab>(route?.params?.tab || 'history');

  // Links such as "Settlement" on the Dashboard open the matching tab
  useEffect(() => {
    if (route?.params?.tab) setTab(route.params.tab);
  }, [route?.params?.tab]);

  const tabs = [
    { id: 'history' as const, label: 'Daily log', Icon: History },
    { id: 'settlement' as const, label: 'Settlement', Icon: Scale },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgApp }}>
      <View style={{ paddingTop: Math.max(insets.top + 8, 20), paddingHorizontal: spacing.md, paddingBottom: spacing.xs }}>
        <Text style={[typography.title, { color: colors.textPrimary, fontSize: 20, marginBottom: spacing.sm }]}>Records</Text>
        <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 4, padding: 4, borderRadius: 12, backgroundColor: colors.bgSubtle }}>
          {tabs.map(({ id, label, Icon }) => {
            const selected = tab === id;
            const color = selected ? colors.textPrimary : colors.textSecondary;
            return (
              <TouchableOpacity
                key={id}
                onPress={() => setTab(id)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                style={{
                  flex: 1,
                  minHeight: 44,
                  flexDirection: 'row',
                  gap: 6,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 9,
                  backgroundColor: selected ? colors.bgSurfaceElevated : 'transparent',
                }}
              >
                <Icon size={15} color={color} strokeWidth={2} />
                <Text style={{ fontSize: 13, fontWeight: selected ? '700' : '500', color }}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {tab === 'history' ? <HistoryScreen navigation={navigation} embedded /> : <SettlementScreen navigation={navigation} embedded />}
      </View>
    </View>
  );
};
