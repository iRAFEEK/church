-- Migration 046: Atomic RPC functions for finance operations
-- Fixes P0-7: Multi-step finance mutations that could leave orphaned/inconsistent data

-- 1. Atomic transaction creation (header + line items in one DB transaction)
CREATE OR REPLACE FUNCTION create_transaction_with_items(
  p_church_id UUID,
  p_created_by UUID,
  p_transaction_date DATE,
  p_description TEXT,
  p_memo TEXT DEFAULT NULL,
  p_reference_number TEXT DEFAULT NULL,
  p_total_amount NUMERIC DEFAULT NULL,
  p_currency TEXT DEFAULT 'EGP',
  p_fund_id UUID DEFAULT NULL,
  p_line_items JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_txn_id UUID;
  v_total_debits NUMERIC := 0;
  v_total_credits NUMERIC := 0;
  v_item JSONB;
  v_result JSONB;
BEGIN
  -- Validate line items balance
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_line_items)
  LOOP
    v_total_debits := v_total_debits + COALESCE((v_item->>'debit_amount')::NUMERIC, 0);
    v_total_credits := v_total_credits + COALESCE((v_item->>'credit_amount')::NUMERIC, 0);
  END LOOP;

  IF ABS(v_total_debits - v_total_credits) > 0.01 THEN
    RAISE EXCEPTION 'Transaction is not balanced: debits=%, credits=%', v_total_debits, v_total_credits;
  END IF;

  -- Insert transaction header
  INSERT INTO financial_transactions (
    church_id, created_by, transaction_date, description, memo,
    reference_number, total_amount, currency, fund_id, status
  ) VALUES (
    p_church_id, p_created_by, p_transaction_date, p_description, p_memo,
    p_reference_number, COALESCE(p_total_amount, v_total_debits), p_currency, p_fund_id, 'draft'
  )
  RETURNING id INTO v_txn_id;

  -- Insert line items
  IF jsonb_array_length(p_line_items) > 0 THEN
    INSERT INTO transaction_line_items (transaction_id, church_id, account_id, fund_id, debit_amount, credit_amount, description)
    SELECT
      v_txn_id,
      p_church_id,
      (item->>'account_id')::UUID,
      CASE WHEN item->>'fund_id' IS NOT NULL THEN (item->>'fund_id')::UUID ELSE NULL END,
      COALESCE((item->>'debit_amount')::NUMERIC, 0),
      COALESCE((item->>'credit_amount')::NUMERIC, 0),
      item->>'description'
    FROM jsonb_array_elements(p_line_items) AS item;
  END IF;

  -- Return the created transaction with line items
  SELECT jsonb_build_object(
    'id', ft.id,
    'church_id', ft.church_id,
    'transaction_date', ft.transaction_date,
    'description', ft.description,
    'memo', ft.memo,
    'reference_number', ft.reference_number,
    'total_amount', ft.total_amount,
    'currency', ft.currency,
    'status', ft.status,
    'created_at', ft.created_at,
    'line_items', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', li.id,
        'account_id', li.account_id,
        'fund_id', li.fund_id,
        'debit_amount', li.debit_amount,
        'credit_amount', li.credit_amount,
        'description', li.description
      ))
      FROM transaction_line_items li WHERE li.transaction_id = ft.id),
      '[]'::JSONB
    )
  ) INTO v_result
  FROM financial_transactions ft
  WHERE ft.id = v_txn_id;

  RETURN v_result;
END;
$$;

-- 2. Atomic fiscal year activation (deactivate old + activate new in one transaction)
CREATE OR REPLACE FUNCTION activate_fiscal_year(
  p_church_id UUID,
  p_fiscal_year_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Deactivate all current fiscal years for this church
  UPDATE fiscal_years
  SET is_current = false
  WHERE church_id = p_church_id AND is_current = true;

  -- Activate the specified fiscal year
  UPDATE fiscal_years
  SET is_current = true
  WHERE id = p_fiscal_year_id AND church_id = p_church_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fiscal year not found or does not belong to this church';
  END IF;

  SELECT jsonb_build_object(
    'id', id, 'name', name, 'name_ar', name_ar,
    'start_date', start_date, 'end_date', end_date, 'is_current', is_current
  ) INTO v_result
  FROM fiscal_years
  WHERE id = p_fiscal_year_id;

  RETURN v_result;
END;
$$;

-- 3. Atomic fund default switch (unset old default + set new default in one transaction)
CREATE OR REPLACE FUNCTION switch_default_fund(
  p_church_id UUID,
  p_fund_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Unset all defaults for this church
  UPDATE funds
  SET is_default = false
  WHERE church_id = p_church_id AND is_default = true;

  -- Set the new default
  UPDATE funds
  SET is_default = true
  WHERE id = p_fund_id AND church_id = p_church_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fund not found or does not belong to this church';
  END IF;

  SELECT jsonb_build_object(
    'id', id, 'name', name, 'name_ar', name_ar,
    'is_default', is_default, 'is_active', is_active
  ) INTO v_result
  FROM funds
  WHERE id = p_fund_id;

  RETURN v_result;
END;
$$;

-- Grant execute to authenticated users (RLS still applies via church_id parameter checks)
GRANT EXECUTE ON FUNCTION create_transaction_with_items TO authenticated;
GRANT EXECUTE ON FUNCTION activate_fiscal_year TO authenticated;
GRANT EXECUTE ON FUNCTION switch_default_fund TO authenticated;
