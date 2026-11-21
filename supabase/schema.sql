-- ===================================================
-- Solar Revenue Tracker - Database Schema (Supabase PostgreSQL)
-- ===================================================

-- 1. Enable UUID Extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create daily_entries table
CREATE TABLE IF NOT EXISTS public.daily_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    generated_units NUMERIC(10, 2) NOT NULL DEFAULT 0,
    consumed_units NUMERIC(10, 2) NOT NULL DEFAULT 0,
    opening_import_meter NUMERIC(10, 2),
    closing_import_meter NUMERIC(10, 2),
    opening_export_meter NUMERIC(10, 2),
    closing_export_meter NUMERIC(10, 2),
    net_units NUMERIC(10, 2) NOT NULL DEFAULT 0,
    buying_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
    selling_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
    revenue NUMERIC(10, 2) NOT NULL DEFAULT 0,
    payable NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL CHECK (status IN ('profit', 'loss', 'balanced')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_entry_date UNIQUE (user_id, entry_date)
);

ALTER TABLE public.daily_entries ADD COLUMN IF NOT EXISTS opening_import_meter NUMERIC(10, 2);
ALTER TABLE public.daily_entries ADD COLUMN IF NOT EXISTS closing_import_meter NUMERIC(10, 2);
ALTER TABLE public.daily_entries ADD COLUMN IF NOT EXISTS opening_export_meter NUMERIC(10, 2);
ALTER TABLE public.daily_entries ADD COLUMN IF NOT EXISTS closing_export_meter NUMERIC(10, 2);

-- 3. Create user_settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    default_buying_rate NUMERIC(10, 2) NOT NULL DEFAULT 2.00,
    default_selling_rate NUMERIC(10, 2) NOT NULL DEFAULT 2.25,
    currency VARCHAR(10) NOT NULL DEFAULT '₹',
    theme VARCHAR(10) NOT NULL DEFAULT 'light',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_daily_entries_user_id ON public.daily_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_entries_entry_date ON public.daily_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_daily_entries_user_date ON public.daily_entries(user_id, entry_date DESC);

-- 5. Row Level Security (RLS) Policies
ALTER TABLE public.daily_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Daily Entries Policies (Idempotent)
DROP POLICY IF EXISTS "Users can view their own entries" ON public.daily_entries;
CREATE POLICY "Users can view their own entries"
    ON public.daily_entries FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own entries" ON public.daily_entries;
CREATE POLICY "Users can insert their own entries"
    ON public.daily_entries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own entries" ON public.daily_entries;
CREATE POLICY "Users can update their own entries"
    ON public.daily_entries FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own entries" ON public.daily_entries;
CREATE POLICY "Users can delete their own entries"
    ON public.daily_entries FOR DELETE
    USING (auth.uid() = user_id);

-- User Settings Policies (Idempotent)
DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
CREATE POLICY "Users can view their own settings"
    ON public.user_settings FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
CREATE POLICY "Users can insert their own settings"
    ON public.user_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
CREATE POLICY "Users can update their own settings"
    ON public.user_settings FOR UPDATE
    USING (auth.uid() = user_id);

-- 6. Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_daily_entries_updated_at ON public.daily_entries;
CREATE TRIGGER update_daily_entries_updated_at
    BEFORE UPDATE ON public.daily_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Electricity bill cycles: see supabase/add_electricity_bills.sql
