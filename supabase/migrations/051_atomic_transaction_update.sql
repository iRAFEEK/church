-- ============================================================
-- Migration 051: Atomic transaction update function
-- Fixes: ARCH-6 (non-atomic delete + insert of line items)
-- Also addresses ARCH-7 (posted transaction immutability check)
-- ============================================================

CREATE OR REPLACE FUNCTION update_transaction_with_items(
  p_transaction_id UUID,
  p_church_id UUID,
  p_description TEXT DEFAULT NULL,
  p_transaction_date TEXT DEFAULT NULL,
  p_reference_number TEXT DEFAULT NULL,
  p_memo TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_items JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx RECORD;
  v_total_debits NUMERIC := 0;
  v_total_credits NUMERIC := 0;
  v_item JSONB;
BEGIN
  -- Lock the transaction row to prevent concurrent modifications
  SELECT id, status, church_id
  INTO v_tx
  FROM financial_transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF v_tx IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found', 'status', 404);
  END IF;

  IF v_tx.church_id != p_church_id THEN
    RETURN jsonb_build_object('error', 'not_found', 'status', 404);
  END IF;

  -- Cannot modify posted or approved transactions (ARCH-7)
  IF v_tx.status IN ('posted', 'approved') THEN
    RETURN jsonb_build_object('error', 'posted_transaction_immutable', 'status', 422);
  END IF;

  -- Update transaction header fields (only non-null params)
  UPDATE financial_transactions SET
    description = COALESCE(p_description, description),
    transaction_date = COALESCE(p_transaction_date::DATE, transaction_date),
    reference = COALESCE(p_reference_number, reference),
    notes = COALESCE(p_memo, notes),
    status = COALESCE(p_status::financial_transaction_status, status),
    updated_at = NOW()
  WHERE id = p_transaction_id;

  -- Replace line items atomically (only if provided)
  IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
    -- Validate balance BEFORE deleting old items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      v_total_debits := v_total_debits + COALESCE((v_item->>'debit_amount')::NUMERIC, 0);
      v_total_credits := v_total_credits + COALESCE((v_item->>'credit_amount')::NUMERIC, 0);
    END LOOP;

    IF ABS(v_total_debits - v_total_credits) > 0.01 THEN
      RAISE EXCEPTION 'Transaction does not balance: debits=%, credits=%', v_total_debits, v_total_credits;
    END IF;

    -- Delete old + insert new within same DB transaction (atomic)
    DELETE FROM transaction_line_items WHERE transaction_id = p_transaction_id;

    INSERT INTO transaction_line_items (
      transaction_id, church_id, account_id, fund_id,
      debit_amount, credit_amount, description
    )
    SELECT
      p_transaction_id,
      p_church_id,
      (item->>'account_id')::UUID,
      CASE WHEN item->>'fund_id' IS NOT NULL THEN (item->>'fund_id')::UUID ELSE NULL END,
      COALESCE((item->>'debit_amount')::NUMERIC, 0),
      COALESCE((item->>'credit_amount')::NUMERIC, 0),
      item->>'description'
    FROM jsonb_array_elements(p_items) AS item;
  END IF;

  -- Return the updated transaction
  RETURN jsonb_build_object(
    'status', 200,
    'data', jsonb_build_object(
      'id', p_transaction_id,
      'description', (SELECT description FROM financial_transactions WHERE id = p_transaction_id),
      'transaction_date', (SELECT transaction_date FROM financial_transactions WHERE id = p_transaction_id),
      'reference', (SELECT reference FROM financial_transactions WHERE id = p_transaction_id),
      'status', (SELECT status FROM financial_transactions WHERE id = p_transaction_id),
      'total_amount', (SELECT total_amount FROM financial_transactions WHERE id = p_transaction_id),
      'currency', (SELECT currency FROM financial_transactions WHERE id = p_transaction_id)
    )
  );
END;
$$;

-- Grant execute to authenticated users (church_id enforced inside function)
GRANT EXECUTE ON FUNCTION update_transaction_with_items TO authenticated;
