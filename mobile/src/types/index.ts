export type EntryStatus = 'profit' | 'loss' | 'balanced';

export interface DailyEntry {
  id: string;
  user_id?: string;
  entry_date: string;
  generated_units: number;
  consumed_units: number;
  opening_import_meter?: number | null;
  closing_import_meter?: number | null;
  opening_export_meter?: number | null;
  closing_export_meter?: number | null;
  net_units: number;
  buying_rate: number;
  selling_rate: number;
  revenue: number;
  payable: number;
  status: EntryStatus;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserSettings {
  user_id: string;
  default_buying_rate: number;
  default_selling_rate: number;
  currency: string;
  theme: 'light' | 'dark';
}

export interface DashboardData {
  latest: {
    import_meter: number | null;
    export_meter: number | null;
    reading_date: string | null;
  };
  today: {
    generated: number;
    consumed: number;
    revenue: number;
    payable: number;
  };
  month: {
    generated: number;
    consumed: number;
    revenue: number;
    expense: number;
    net_profit: number;
  };
  year: {
    generated: number;
    consumed: number;
    revenue: number;
    expense: number;
    net_profit: number;
  };
  lifetime: {
    generated: number;
    consumed: number;
    revenue: number;
    expense: number;
    net_profit: number;
  };
  recentEntries: DailyEntry[];
}

export interface SettlementDayRow {
  date: string;
  daily_import_units: number;
  daily_export_units: number;
  gross_difference: number;
  opening_settlement_balance: number;
  previous_balance_adjusted: number;
  govt_credit_generated: number;
  govt_credit_used: number;
  govt_payable: number;
  closing_settlement_balance: number;
  settlement_status: string;
  settlement_amount_rs: number;
  result_summary: string;
  settlement_rate?: number;
  opening_import_meter?: number | null;
  closing_import_meter?: number | null;
  opening_export_meter?: number | null;
  closing_export_meter?: number | null;
}

export interface SettlementSummary {
  total_days?: number;
  month_opening_import_meter?: number | null;
  month_closing_import_meter?: number | null;
  month_opening_export_meter?: number | null;
  month_closing_export_meter?: number | null;
  total_import_units: number;
  total_export_units: number;
  net_gross_difference: number;
  month_opening_balance: number;
  month_closing_balance: number;
  total_credit_generated: number;
  total_credit_used: number;
  total_payable_generated: number;
  settlement_rate?: number;
  final_settlement_amount_rs: number;
  final_status: string;
}

export interface SettlementReport {
  month?: number;
  year?: number;
  summary?: SettlementSummary;
  history?: SettlementDayRow[];
  buying_rate?: number;
  selling_rate?: number;
  opening_balance?: number;
  closing_balance?: number;
  total_credit_generated?: number;
  total_credit_used?: number;
  total_payable_generated?: number;
  final_settlement_status?: string;
  final_settlement_amount?: number;
  rows?: SettlementDayRow[];
}

export interface ReportSummary {
  period: string;
  summary: {
    total_generated: number;
    total_consumed: number;
    total_export_units: number;
    total_import_units: number;
    total_revenue: number;
    total_expense: number;
    net_profit: number;
    // Field names match server/services/analyticsService.js getReports()
    average_daily_generated: number;
    highest_day: { date: string; generated: number } | null;
    lowest_day: { date: string; generated: number } | null;
  };
  grouped: Array<{
    group_key: string;
    solar_generated: number;
    grid_consumption: number;
    export_units: number;
    import_units: number;
    revenue: number;
    expense: number;
    net_profit: number;
    average_units: number;
  }>;
}

export interface AuthUser {
  id: string;
  email: string;
}

// Electricity bill cycles (GET/POST/DELETE /api/bills)
export interface BillCycleMoney {
  type: 'credit' | 'payable' | 'balanced';
  amount: number;
}

export interface ClosedBill {
  id: string;
  bill_date: string;
  period_start: string;
  period_end: string;
  opening_units: number;
  export_units: number;
  import_units: number;
  net_units: number;
  days: number;
  days_with_entries: number;
  missing_days: number;
  balance_before_units: number;
  adjusted_units: number;
  remaining_units: number;
  remaining_money: BillCycleMoney;
  bill_amount: number | null;
  buying_rate: number;
  selling_rate: number;
}

export interface BillLedger {
  current: {
    period_start: string | null;
    period_end: string | null;
    opening_units: number;
    export_units: number;
    import_units: number;
    net_units: number;
    days: number;
    days_with_entries: number;
    missing_days: number;
    balance_units: number;
    money: BillCycleMoney;
    buying_rate: number;
    selling_rate: number;
    last_bill_date: string | null;
  };
  bills: ClosedBill[];
}
