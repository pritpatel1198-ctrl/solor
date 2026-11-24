import React, { useCallback, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Check, ChevronDown, ChevronUp, Minus, Plus, Receipt, Trash2 } from 'lucide-react-native';
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
const amountText = (v: number) => `${v < 0 ? '−' : ''}${curr}${num(Math.abs(v))}`;
const signedText = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${curr}${num(Math.abs(v))}`;
const moneyLabel = (m: BillCycleMoney) => (m.type === 'credit' ? 'CREDIT' : m.type === 'payable' ? 'PAYABLE' : 'BALANCED');
const badgeStatus = (m: BillCycleMoney) => (m.type === 'credit' ? 'profit' : m.type === 'payable' ? 'loss' : 'balanced');

export const BillCyclePanel: React.FC = () => {
  const { colors } = useTheme();
  const [ledger, setLedger] = useState<BillLedger | null>(null);
  const [saved, setSaved] = useState<ClosedBill | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [billDate, setBillDate] = useState(localDateStr());
  const [sign, setSign] = useState<1 | -1>(1);
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

  // Reload on focus: balances follow readings and the rates in Settings
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const toneFor = (v: number) => (v > 0 ? colors.success600 : v < 0 ? colors.danger600 : colors.textPrimary);

  // "+500", "-500" or "500" (sign from the +/− buttons)
  const parseAmount = (text: string): number => {
    const match = text.trim().replace(/,/g, '').match(/^([+\-−])?\s*(\d+(?:\.\d+)?)$/);
    if (!match) return NaN;
    const s = match[1] ? (match[1] === '+' ? 1 : -1) : sign;
    return s * Number(match[2]);
  };

  const onAmountChange = (text: string) => {
    const typed = text.trim().charAt(0);
    if (typed === '+') setSign(1);
    if (typed === '-' || typed === '−') setSign(-1);
    setBillAmount(text);
  };

  const pickSign = (s: 1 | -1) => {
    setSign(s);
    setBillAmount((v) => v.replace(/^\s*[+\-−]\s*/, ''));
  };

  const handleSave = async () => {
    if (!DATE_RE.test(billDate)) return setFormError('Enter the bill date as YYYY-MM-DD.');
    if (billDate > localDateStr()) return setFormError('Bill date cannot be in the future.');
    const amount = parseAmount(billAmount);
    if (isNaN(amount)) return setFormError('Please enter the bill amount, e.g. 500 or -500.');
    if (amount === 0) return setFormError('Bill amount cannot be 0.');

    setFormError(null);
    setSaving(true);
    try {
      const res = await api.createBill({ bill_date: billDate, bill_amount: amount });
      setLedger(res);
      setSaved(res.saved);
      setBillAmount('');
      setSign(1);
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
  const preview = parseAmount(billAmount);
  const showPreview = current && !isNaN(preview) && preview !== 0 && (!current.period_end || billDate >= current.period_end);

  const SignButton = ({ value, label, Icon }: { value: 1 | -1; label: string; Icon: typeof Plus }) => {
    const selected = sign === value;
    return (
      <TouchableOpacity
        onPress={() => pickSign(value)}
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        style={{ flex: 1, minHeight: 44, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: selected ? colors.bgSurfaceElevated : 'transparent' }}
      >
        <Icon size={15} color={selected ? colors.textPrimary : colors.textSecondary} strokeWidth={2.2} />
        <Text style={{ fontSize: 13, fontWeight: selected ? '700' : '500', color: selected ? colors.textPrimary : colors.textSecondary }}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>Balance now</Text>
          {current ? <Badge status={badgeStatus(current.money)} label={moneyLabel(current.money)} /> : null}
        </View>
        <Text style={{ fontSize: 34, fontWeight: '700', marginTop: 4, color: current ? toneFor(current.balance_amount) : colors.textMuted }}>
          {current ? amountText(current.balance_amount) : '…'}
        </Text>
        {current ? (
          <>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing.xs }}>
              {current.last_bill_date
                ? `${signedText(current.opening_amount)} carried from bill of ${current.last_bill_date} · ${signedText(current.period_amount)} since`
                : `At ${curr}${num(current.buying_rate)} / ${curr}${num(current.selling_rate)} per unit`}
            </Text>
            <Row label={current.last_bill_date ? 'Export since bill' : 'Total export'} value={`${num(current.export_units)} kWh`} color={colors.success600} />
            <Row label={current.last_bill_date ? 'Import since bill' : 'Total import'} value={`${num(current.import_units)} kWh`} color={colors.danger600} />
            {current.missing_days > 0 ? (
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 6 }}>
                {current.missing_days} day(s) have no reading, so the balance may be incomplete.
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
          <Row label="Balance before bill" value={amountText(saved.balance_before_amount)} />
          <Row label="Bill amount" value={signedText(saved.bill_amount)} color={toneFor(saved.bill_amount)} />
          <Row label="Balance after bill" value={amountText(saved.remaining_amount)} color={toneFor(saved.remaining_amount)} bold />
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 6 }}>
            The new balance carries into the next cycle from the next day.
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
          <Input label="Bill Date (YYYY-MM-DD)" value={billDate} onChangeText={setBillDate} placeholder="2026-11-24" />
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>Bill Amount ({curr})</Text>
          <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 4, padding: 4, borderRadius: 12, backgroundColor: colors.bgSubtle, marginBottom: spacing.sm }}>
            <SignButton value={1} label="Add to balance" Icon={Plus} />
            <SignButton value={-1} label="Subtract" Icon={Minus} />
          </View>
          <Input
            label="Amount"
            value={billAmount}
            onChangeText={onAmountChange}
            keyboardType="numbers-and-punctuation"
            placeholder="500 or -500"
            hint="Type + or − before the amount, or choose above."
          />
          {showPreview && current ? (
            <Row label="Balance after this bill" value={amountText(Math.round((current.balance_amount + preview) * 100) / 100)} color={toneFor(current.balance_amount + preview)} bold />
          ) : null}
          {formError ? (
            <Text accessibilityRole="alert" style={{ color: colors.danger600, fontSize: 13, marginVertical: spacing.sm }}>{formError}</Text>
          ) : null}
          <Button
            title="Save Bill"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            variant="primary"
            style={{ marginTop: spacing.sm }}
            icon={<Check size={16} color="#ffffff" strokeWidth={2.2} />}
          />
          <Button title="Cancel" onPress={() => setShowForm(false)} variant="outline" style={{ marginTop: spacing.sm }} />
        </Card>
      )}

      <Card>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }}>Electricity bills</Text>
        {ledger && ledger.bills.length === 0 ? (
          <Text style={{ fontSize: 13, color: colors.textSecondary, paddingVertical: spacing.sm }}>No bills yet. Add your 2-month bill when it arrives.</Text>
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
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>Bill {signedText(b.bill_amount)} · before {amountText(b.balance_before_amount)}</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: toneFor(b.remaining_amount) }}>{amountText(b.remaining_amount)}</Text>
                {open ? <ChevronUp size={16} color={colors.textMuted} /> : <ChevronDown size={16} color={colors.textMuted} />}
              </TouchableOpacity>
              {open ? (
                <View style={{ paddingBottom: spacing.sm }}>
                  <Row label="Period" value={`${b.period_start} to ${b.period_end}`} />
                  <Row label="Carried in" value={signedText(b.opening_amount)} />
                  <Row label="Export / Import" value={`${num(b.export_units)} / ${num(b.import_units)} kWh`} />
                  <Row label="Value of units" value={signedText(b.period_amount)} color={toneFor(b.period_amount)} />
                  <Row label="Balance before bill" value={amountText(b.balance_before_amount)} />
                  <Row label="Bill amount" value={signedText(b.bill_amount)} color={toneFor(b.bill_amount)} />
                  <Row label="Balance after bill" value={amountText(b.remaining_amount)} color={toneFor(b.remaining_amount)} bold />
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
