import React, { useCallback, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Check, ChevronDown, ChevronUp, Receipt, Trash2 } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/tokens';
import { api } from '../../api/client';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { localDateStr } from '../../utils/date';
import { BillCycleMoney, BillLedger, ClosedBill } from '../../types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const curr = '₹';
const num = (v: number) => Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const units = (v: number) => `${v > 0 ? '+' : v < 0 ? '-' : ''}${num(Math.abs(v))}`;
const moneyLabel = (m: BillCycleMoney) => (m.type === 'credit' ? 'CREDIT' : m.type === 'payable' ? 'PAYABLE' : 'BALANCED');
const badgeStatus = (m: BillCycleMoney) => (m.type === 'credit' ? 'profit' : m.type === 'payable' ? 'loss' : 'balanced');

export const BillCyclePanel: React.FC = () => {
  const { colors } = useTheme();
  const [ledger, setLedger] = useState<BillLedger | null>(null);
  const [saved, setSaved] = useState<ClosedBill | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [billDate, setBillDate] = useState(localDateStr());
  const [billUnits, setBillUnits] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      setLedger(await api.getBills());
    } catch (err: any) {
      setLoadError(err.message || 'Could not load your bills');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const toneFor = (m: BillCycleMoney) =>
    m.type === 'credit' ? colors.success600 : m.type === 'payable' ? colors.danger600 : colors.textPrimary;

  const handleSave = async () => {
    const parsedUnits = parseFloat(billUnits);
    if (!DATE_RE.test(billDate)) return setFormError('Enter the bill date as YYYY-MM-DD.');
    if (billDate > localDateStr()) return setFormError('Bill date cannot be in the future.');
    if (isNaN(parsedUnits) || parsedUnits < 0) return setFormError('Bill units must be a number of 0 or more.');
    const parsedAmount = parseFloat(billAmount);
    if (isNaN(parsedAmount)) return setFormError('Please enter the bill amount.');

    setFormError(null);
    setSaving(true);
    try {
      const res = await api.createBill({ bill_date: billDate, adjusted_units: parsedUnits, bill_amount: parsedAmount });
      setLedger(res);
      setSaved(res.saved);
      setBillUnits('');
      setBillAmount('');
      setShowForm(false);
    } catch (err: any) {
      setFormError(err.message || 'Could not save the bill');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (bill: ClosedBill) => {
    Alert.alert('Delete Bill', `Delete the bill of ${bill.bill_date}? Balances after it will be recalculated.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setLedger(await api.deleteBill(bill.id));
            setSaved(null);
            setOpenId(null);
          } catch (err: any) {
            Alert.alert('Delete Failed', err.message || 'Could not delete the bill');
          }
        },
      },
    ]);
  };

  const Row = ({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.borderColor }}>
      <Text style={{ flexShrink: 1, fontSize: 13, color: bold ? colors.textPrimary : colors.textSecondary, fontWeight: bold ? '700' : '500' }}>{label}</Text>
      <Text style={{ fontSize: 13, color: color || colors.textPrimary, fontWeight: bold ? '700' : '600', fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );

  if (loadError) {
    const needsSetup = /one-time database setup/i.test(loadError);
    return (
      <Card>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 }}>
          {needsSetup ? 'One-time database setup needed' : 'Could not load your bills'}
        </Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: spacing.sm }}>
          {needsSetup ? 'Run supabase/add_electricity_bills.sql in the Supabase SQL Editor. It adds one new table and does not change your existing data.' : loadError}
        </Text>
        <Button title="Try Again" onPress={load} variant="outline" />
      </Card>
    );
  }

  const current = ledger?.current;

  return (
    <>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>Balance now</Text>
          {current ? <Badge status={badgeStatus(current.money)} label={moneyLabel(current.money)} /> : null}
        </View>
        <Text style={{ fontSize: 34, fontWeight: '700', marginTop: 4, color: current ? toneFor(current.money) : colors.textMuted }}>
          {current ? `${curr}${num(current.money.amount)}` : '…'}
        </Text>
        {current ? (
          <>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: spacing.xs }}>{units(current.balance_units)} units</Text>
            <Row label={current.last_bill_date ? `Carried from bill (${current.last_bill_date})` : 'Carried forward'} value={units(current.opening_units)} />
            <Row label={current.last_bill_date ? 'Export since bill' : 'Total export'} value={num(current.export_units)} color={colors.success600} />
            <Row label={current.last_bill_date ? 'Import since bill' : 'Total import'} value={num(current.import_units)} color={colors.danger600} />
            {current.missing_days > 0 ? (
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 6 }}>
                {current.missing_days} day(s) in this period have no reading, so the balance may be incomplete.
              </Text>
            ) : null}
          </>
        ) : null}
      </Card>

      {saved ? (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>Bill of {saved.bill_date}</Text>
            <Badge status={badgeStatus(saved.remaining_money)} label={moneyLabel(saved.remaining_money)} />
          </View>
          <Row label="Balance before bill" value={`${units(saved.balance_before_units)} units`} />
          <Row label="Bill units" value={`-${num(saved.adjusted_units)} units`} />
          <Row label="Remaining" value={`${units(saved.remaining_units)} units`} bold />
          <Text style={{ fontSize: 24, fontWeight: '700', marginTop: 8, color: toneFor(saved.remaining_money) }}>
            {curr}{num(saved.remaining_money.amount)}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
            Remaining units carry into the new cycle from the next day.
          </Text>
        </Card>
      ) : null}

      {!showForm ? (
        <Button
          title="Add Electricity Bill"
          onPress={() => setShowForm(true)}
          variant="primary"
          icon={<Receipt size={16} color="#ffffff" strokeWidth={2.2} />}
        />
      ) : (
      <Card>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm }}>Add electricity bill</Text>
        <Input label="Bill Date (YYYY-MM-DD)" value={billDate} onChangeText={setBillDate} placeholder="2026-11-21" />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Input label="Bill Units" value={billUnits} onChangeText={setBillUnits} keyboardType="decimal-pad" placeholder="60" containerStyle={{ flex: 1 }} />
          <Input label={`Bill Amount (${curr})`} value={billAmount} onChangeText={setBillAmount} keyboardType="numbers-and-punctuation" placeholder="185.50" containerStyle={{ flex: 1 }} />
        </View>
        <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: spacing.sm }}>
          Units are subtracted from your balance up to and including the bill date. The amount is saved with the bill for your record.
        </Text>
        {formError ? (
          <Text accessibilityRole="alert" style={{ color: colors.danger600, fontSize: 13, marginBottom: spacing.sm }}>{formError}</Text>
        ) : null}
        <Button
          title="Save Bill & Calculate"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          variant="primary"
          icon={<Check size={16} color="#ffffff" strokeWidth={2.2} />}
        />
        <Button title="Cancel" onPress={() => setShowForm(false)} variant="outline" style={{ marginTop: spacing.sm }} />
      </Card>
      )}

      <Card>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }}>Electricity bills</Text>
        {ledger && ledger.bills.length === 0 ? (
          <Text style={{ fontSize: 13, color: colors.textSecondary, paddingVertical: spacing.sm }}>No bills yet. Add your first bill above.</Text>
        ) : null}
        {(ledger?.bills || []).map((b) => {
          const open = openId === b.id;
          return (
            <View key={b.id} style={{ borderBottomWidth: 1, borderBottomColor: colors.borderColor }}>
              <TouchableOpacity
                onPress={() => setOpenId(open ? null : b.id)}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 8 }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>{b.bill_date}</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>{num(b.adjusted_units)} units · {units(b.remaining_units)} left</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: toneFor(b.remaining_money) }}>{curr}{num(b.remaining_money.amount)}</Text>
                {open ? <ChevronUp size={16} color={colors.textMuted} /> : <ChevronDown size={16} color={colors.textMuted} />}
              </TouchableOpacity>
              {open ? (
                <View style={{ paddingBottom: spacing.sm }}>
                  <Row label="Period" value={`${b.period_start} to ${b.period_end}`} />
                  <Row label="Carried in" value={units(b.opening_units)} />
                  <Row label="Export" value={num(b.export_units)} color={colors.success600} />
                  <Row label="Import" value={num(b.import_units)} color={colors.danger600} />
                  <Row label="Balance before bill" value={units(b.balance_before_units)} />
                  <Row label="Bill units" value={`-${num(b.adjusted_units)}`} />
                  <Row label="Remaining" value={`${units(b.remaining_units)} units`} bold />
                  {b.bill_amount !== null ? <Row label="Bill amount" value={`${b.bill_amount < 0 ? '-' : ''}${curr}${num(Math.abs(b.bill_amount))}`} /> : null}
                  <Button
                    title="Delete this bill"
                    onPress={() => handleDelete(b)}
                    variant="danger"
                    size="sm"
                    style={{ marginTop: spacing.sm }}
                    icon={<Trash2 size={14} color="#ffffff" strokeWidth={2.2} />}
                  />
                </View>
              ) : null}
            </View>
          );
        })}
      </Card>
    </>
  );
};
