-- ===================================================
-- Electricity bill cycles (safe to run more than once)
-- Adds one new table. Does not change or delete any existing data.
-- Run once in: Supabase Dashboard > SQL Editor
-- ===================================================

CREATE TABLE IF NOT EXISTS public.electricity_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bill_date DATE NOT NULL,
    adjusted_units NUMERIC(12, 2) NOT NULL CHECK (adjusted_units >= 0),
    bill_amount NUMERIC(12, 2),
    buying_rate NUMERIC(10, 2) NOT NULL,
    selling_rate NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_bill_date UNIQUE (user_id, bill_date)
);

ALTER TABLE public.electricity_bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own bills" ON public.electricity_bills;
CREATE POLICY "Users can view their own bills"
    ON public.electricity_bills FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own bills" ON public.electricity_bills;
CREATE POLICY "Users can insert their own bills"
    ON public.electricity_bills FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own bills" ON public.electricity_bills;
CREATE POLICY "Users can update their own bills"
    ON public.electricity_bills FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own bills" ON public.electricity_bills;
CREATE POLICY "Users can delete their own bills"
    ON public.electricity_bills FOR DELETE
    USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_electricity_bills_updated_at ON public.electricity_bills;
CREATE TRIGGER update_electricity_bills_updated_at
    BEFORE UPDATE ON public.electricity_bills
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Make the new table visible to the API immediately
NOTIFY pgrst, 'reload schema';
