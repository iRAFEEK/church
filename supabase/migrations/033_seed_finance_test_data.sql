-- ============================================================
-- EKKLESIA — Finance Test Data Seed
-- Run AFTER 030_financial_system.sql
-- ⚠️ Only run in development — do NOT run in production
-- ============================================================

DO $$
DECLARE
  v_church_id UUID;
  v_admin_id  UUID;
  v_fund_general  UUID;
  v_fund_building UUID;
  v_fund_missions UUID;
  v_fund_youth    UUID;
  v_campaign_id   UUID;
  v_fiscal_year_id UUID;
  v_budget_id     UUID;
BEGIN
  -- Get first church and first super_admin (use ORDER BY + LIMIT to avoid multi-row error)
  SELECT id INTO v_church_id FROM churches ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO v_admin_id FROM profiles WHERE church_id = v_church_id AND role = 'super_admin' ORDER BY created_at ASC LIMIT 1;

  IF v_church_id IS NULL THEN
    RAISE NOTICE 'No church found — skipping finance seed data';
    RETURN;
  END IF;

  -- Update church with finance settings
  UPDATE churches SET
    default_currency = 'USD',
    supported_currencies = ARRAY['USD', 'LBP'],
    fiscal_year_start_month = 1,
    financial_approval_required = true,
    donation_receipt_enabled = true,
    online_giving_enabled = false
  WHERE id = v_church_id;

  -- ─── FUNDS ──────────────────────────────────────────────────
  INSERT INTO funds (id, church_id, name, name_ar, description, description_ar, is_restricted, is_default, is_active, current_balance, target_amount, display_order)
  VALUES
    (gen_random_uuid(), v_church_id, 'General Fund', 'الصندوق العام', 'Unrestricted general operating fund', 'صندوق التشغيل العام غير المقيد', false, true, true, 15420.50, NULL, 1),
    (gen_random_uuid(), v_church_id, 'Building Fund', 'صندوق البناء', 'For church building renovations and maintenance', 'لتجديد وصيانة مبنى الكنيسة', true, false, true, 8750.00, 50000.00, 2),
    (gen_random_uuid(), v_church_id, 'Missions Fund', 'صندوق المهام', 'Support for missionaries and outreach', 'دعم المبشرين والخدمة', true, false, true, 3200.00, 10000.00, 3),
    (gen_random_uuid(), v_church_id, 'Youth Ministry', 'خدمة الشباب', 'Youth programs and activities', 'برامج وأنشطة الشباب', false, false, true, 1850.75, 5000.00, 4);

  -- Retrieve fund IDs by name
  SELECT id INTO v_fund_general FROM funds WHERE church_id = v_church_id AND name = 'General Fund' LIMIT 1;
  SELECT id INTO v_fund_building FROM funds WHERE church_id = v_church_id AND name = 'Building Fund' LIMIT 1;
  SELECT id INTO v_fund_missions FROM funds WHERE church_id = v_church_id AND name = 'Missions Fund' LIMIT 1;
  SELECT id INTO v_fund_youth FROM funds WHERE church_id = v_church_id AND name = 'Youth Ministry' LIMIT 1;

  -- ─── FISCAL YEAR ────────────────────────────────────────────
  INSERT INTO fiscal_years (id, church_id, name, name_ar, start_date, end_date, status, is_current)
  VALUES (gen_random_uuid(), v_church_id, 'Fiscal Year 2026', 'السنة المالية 2026', '2026-01-01', '2026-12-31', 'active', true)
  RETURNING id INTO v_fiscal_year_id;

  -- ─── CAMPAIGNS ──────────────────────────────────────────────
  INSERT INTO campaigns (id, church_id, name, name_ar, description, description_ar, goal_amount, raised_amount, pledged_amount, currency, fund_id, start_date, end_date, status, is_public, allow_pledges)
  VALUES
    (gen_random_uuid(), v_church_id, 'Roof Repair Campaign', 'حملة إصلاح السقف', 'Raising funds for critical roof repairs', 'جمع تبرعات لإصلاح السقف', 25000.00, 12500.00, 18000.00, 'USD', v_fund_building, '2026-01-15', '2026-06-30', 'active', true, true),
    (gen_random_uuid(), v_church_id, 'Summer Missions Trip', 'رحلة بعثة الصيف', 'Funding for summer mission trip to Lebanon', 'تمويل رحلة البعثة الصيفية إلى لبنان', 8000.00, 3200.00, 5500.00, 'USD', v_fund_missions, '2026-02-01', '2026-05-31', 'active', true, true);

  SELECT id INTO v_campaign_id FROM campaigns WHERE church_id = v_church_id AND name = 'Roof Repair Campaign' LIMIT 1;

  -- ─── DONATIONS (sample last 3 months) ──────────────────────
  IF v_admin_id IS NOT NULL THEN
    INSERT INTO donations (church_id, donor_id, amount, base_amount, currency, exchange_rate, donation_date, fund_id, payment_method, is_tithe, is_anonymous, is_tax_deductible, notes)
    VALUES
      (v_church_id, v_admin_id, 500.00, 500.00, 'USD', 1.0, '2026-03-09', v_fund_general, 'cash', true, false, true, 'Sunday tithe'),
      (v_church_id, v_admin_id, 200.00, 200.00, 'USD', 1.0, '2026-03-02', v_fund_general, 'check', true, false, true, NULL),
      (v_church_id, v_admin_id, 100.00, 100.00, 'USD', 1.0, '2026-02-23', v_fund_building, 'online', false, false, true, 'Building campaign donation'),
      (v_church_id, v_admin_id, 150.00, 150.00, 'USD', 1.0, '2026-02-16', v_fund_general, 'cash', true, false, true, NULL),
      (v_church_id, v_admin_id, 50.00, 50.00, 'USD', 1.0, '2026-02-09', v_fund_missions, 'bank_transfer', false, false, true, 'Missions support'),
      (v_church_id, v_admin_id, 300.00, 300.00, 'USD', 1.0, '2026-01-26', v_fund_general, 'cash', true, false, true, NULL),
      (v_church_id, v_admin_id, 75.00, 75.00, 'USD', 1.0, '2026-01-19', v_fund_youth, 'credit_card', false, false, true, 'Youth camp donation'),
      (v_church_id, v_admin_id, 250.00, 250.00, 'USD', 1.0, '2026-01-12', v_fund_general, 'cash', true, false, true, NULL),
      -- Anonymous donation
      (v_church_id, NULL, 1000.00, 1000.00, 'USD', 1.0, '2026-03-05', v_fund_building, 'cash', false, true, false, 'Anonymous building donation'),
      -- LBP donation
      (v_church_id, v_admin_id, 4500000.00, 50.00, 'LBP', 90000.0, '2026-02-28', v_fund_general, 'cash', false, false, false, 'LBP offering');

    -- ─── PLEDGES ────────────────────────────────────────────────
    INSERT INTO pledges (church_id, donor_id, campaign_id, total_amount, fulfilled_amount, currency, frequency, start_date, end_date, status, notes)
    VALUES
      (v_church_id, v_admin_id, v_campaign_id, 2000.00, 500.00, 'USD', 'monthly', '2026-01-15', '2026-06-30', 'active', 'Monthly pledge for roof repair');

    -- ─── EXPENSE REQUESTS ───────────────────────────────────────
    INSERT INTO expense_requests (church_id, requested_by, description, description_ar, amount, currency, vendor_name, payment_method, fund_id, status, notes)
    VALUES
      (v_church_id, v_admin_id, 'Sound system cables', 'كابلات نظام الصوت', 185.00, 'USD', 'Audio Solutions LLC', 'credit_card', v_fund_general, 'submitted', 'Replacement XLR cables for sanctuary'),
      (v_church_id, v_admin_id, 'Youth camp supplies', 'مستلزمات معسكر الشباب', 320.00, 'USD', 'Walmart', 'cash', v_fund_youth, 'approved', 'Food and activity supplies for youth camp'),
      (v_church_id, v_admin_id, 'Office printer ink', 'حبر طابعة المكتب', 89.99, 'USD', 'Amazon', 'online', v_fund_general, 'paid', 'HP LaserJet ink cartridges'),
      (v_church_id, v_admin_id, 'Mission team airfare', 'تذاكر طيران فريق البعثة', 2400.00, 'USD', 'Delta Airlines', 'credit_card', v_fund_missions, 'submitted', '4 round-trip tickets to Beirut');
  END IF;

  -- ─── BUDGETS ──────────────────────────────────────────────
  INSERT INTO budgets (id, church_id, name, name_ar, fiscal_year_id, period_type, start_date, end_date, total_income, total_expense, fund_id, is_active)
  VALUES
    (gen_random_uuid(), v_church_id, 'Operating Budget 2026', 'ميزانية التشغيل 2026', v_fiscal_year_id, 'annual', '2026-01-01', '2026-12-31', 120000.00, 28500.00, v_fund_general, true),
    (gen_random_uuid(), v_church_id, 'Youth Ministry Q1', 'خدمة الشباب الربع الأول', v_fiscal_year_id, 'quarterly', '2026-01-01', '2026-03-31', 5000.00, 1850.75, v_fund_youth, true);

  -- ─── SEED CHART OF ACCOUNTS ───────────────────────────────
  -- Call the seed function from 030_financial_system if it exists
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'seed_default_chart_of_accounts') THEN
    PERFORM seed_default_chart_of_accounts(v_church_id);
  END IF;

  RAISE NOTICE 'Finance test data seeded successfully for church %', v_church_id;
END $$;
