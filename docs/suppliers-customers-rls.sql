-- Run this migration in the Supabase SQL Editor.
-- It replaces existing policies on these two tables with owner-only access.

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users (id);

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users (id);

ALTER TABLE public.suppliers
  ALTER COLUMN created_by SET DEFAULT auth.uid();

ALTER TABLE public.customers
  ALTER COLUMN created_by SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS suppliers_created_by_idx
  ON public.suppliers (created_by);

CREATE INDEX IF NOT EXISTS customers_created_by_idx
  ON public.customers (created_by);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  existing_policy record;
BEGIN
  FOR existing_policy IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('suppliers', 'customers')
  LOOP
    EXECUTE format(
      'DROP POLICY %I ON %I.%I',
      existing_policy.policyname,
      existing_policy.schemaname,
      existing_policy.tablename
    );
  END LOOP;
END
$$;

CREATE POLICY suppliers_select_own
  ON public.suppliers FOR SELECT TO authenticated
  USING (created_by = (SELECT auth.uid()));

CREATE POLICY suppliers_insert_own
  ON public.suppliers FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY suppliers_update_own
  ON public.suppliers FOR UPDATE TO authenticated
  USING (created_by = (SELECT auth.uid()))
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY suppliers_delete_own
  ON public.suppliers FOR DELETE TO authenticated
  USING (created_by = (SELECT auth.uid()));

CREATE POLICY customers_select_own
  ON public.customers FOR SELECT TO authenticated
  USING (created_by = (SELECT auth.uid()));

CREATE POLICY customers_insert_own
  ON public.customers FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY customers_update_own
  ON public.customers FOR UPDATE TO authenticated
  USING (created_by = (SELECT auth.uid()))
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY customers_delete_own
  ON public.customers FOR DELETE TO authenticated
  USING (created_by = (SELECT auth.uid()));
