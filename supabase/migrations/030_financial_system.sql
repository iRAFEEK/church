-- ============================================================
-- 030 — Financial Management System
-- ============================================================
-- Tables: fiscal_years, accounts, funds, bank_accounts,
--         financial_transactions, transaction_line_items,
--         deposit_batches, donations, pledges, campaigns,
--         budgets, budget_line_items, expense_requests,
--         recurring_transaction_rules, bank_reconciliations,
--         reconciliation_items, exchange_rates, church_assets,
--         giving_statements, financial_audit_log
-- ============================================================

-- ─── Enums ──────────────────────────────────────────────────

CREATE TYPE account_type AS ENUM ('asset', 'liability', 'equity', 'income', 'expense');

CREATE TYPE account_sub_type AS ENUM (
  'cash', 'bank', 'receivable', 'prepaid', 'fixed_asset', 'other_asset',
  'payable', 'accrued', 'loan', 'other_liability',
  'retained_earnings', 'net_assets', 'other_equity',
  'tithe', 'offering', 'donation', 'grant', 'event_income', 'interest', 'other_income',
  'salary', 'rent', 'utilities', 'supplies', 'missions', 'benevolence',
  'maintenance', 'insurance', 'depreciation', 'other_expense'
);

CREATE TYPE financial_transaction_status AS ENUM ('draft', 'pending', 'approved', 'posted', 'void');

CREATE TYPE payment_method AS ENUM (
  'cash', 'check', 'bank_transfer', 'credit_card', 'online', 'mobile_payment', 'in_kind', 'other'
);

CREATE TYPE giving_frequency AS ENUM (
  'one_time', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annually'
);

CREATE TYPE expense_request_status AS ENUM (
  'draft', 'submitted', 'approved', 'rejected', 'paid', 'cancelled'
);

CREATE TYPE pledge_status AS ENUM ('active', 'completed', 'cancelled', 'defaulted');
CREATE TYPE campaign_status AS ENUM ('planning', 'active', 'paused', 'completed', 'cancelled');
CREATE TYPE reconciliation_status AS ENUM ('in_progress', 'completed', 'discrepancy');
CREATE TYPE budget_period_type AS ENUM ('annual', 'quarterly', 'monthly', 'custom');
CREATE TYPE fiscal_year_status AS ENUM ('planning', 'active', 'closed');
CREATE TYPE asset_status AS ENUM ('active', 'disposed', 'donated', 'damaged', 'lost');
CREATE TYPE batch_status AS ENUM ('open', 'closed', 'posted');

-- ─── Church financial settings ──────────────────────────────

ALTER TABLE churches
  ADD COLUMN IF NOT EXISTS default_currency        TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS supported_currencies    TEXT[] NOT NULL DEFAULT ARRAY['USD'],
  ADD COLUMN IF NOT EXISTS fiscal_year_start_month INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS fiscal_year_start_day   INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS financial_approval_required BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS donation_receipt_enabled    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS donation_min_receipt_amount NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS online_giving_enabled       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_account_id           TEXT,
  ADD COLUMN IF NOT EXISTS financial_settings          JSONB NOT NULL DEFAULT '{}';

-- ─── Fiscal Years ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fiscal_years (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id    UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  name_ar      TEXT,
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  status       fiscal_year_status NOT NULL DEFAULT 'planning',
  is_current   BOOLEAN NOT NULL DEFAULT false,
  closed_at    TIMESTAMPTZ,
  closed_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  opening_balances JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(church_id, name),
  CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

-- ─── Chart of Accounts ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS accounts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id        UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  parent_id        UUID REFERENCES accounts(id) ON DELETE SET NULL,
  code             TEXT NOT NULL,
  name             TEXT NOT NULL,
  name_ar          TEXT,
  description      TEXT,
  description_ar   TEXT,
  account_type     account_type NOT NULL,
  account_sub_type account_sub_type,
  is_header        BOOLEAN NOT NULL DEFAULT false,
  is_system        BOOLEAN NOT NULL DEFAULT false,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  currency         TEXT NOT NULL DEFAULT 'USD',
  normal_balance   TEXT NOT NULL DEFAULT 'debit' CHECK (normal_balance IN ('debit', 'credit')),
  current_balance  NUMERIC(15,2) NOT NULL DEFAULT 0,
  tags             TEXT[] DEFAULT '{}',
  display_order    INTEGER NOT NULL DEFAULT 0,
  depth            INTEGER NOT NULL DEFAULT 0,
  path             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(church_id, code)
);

CREATE INDEX IF NOT EXISTS idx_accounts_church_type ON accounts(church_id, account_type);
CREATE INDEX IF NOT EXISTS idx_accounts_parent      ON accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_accounts_path        ON accounts(church_id, path);

-- ─── Funds ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS funds (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id           UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  name_ar             TEXT,
  description         TEXT,
  description_ar      TEXT,
  code                TEXT,
  is_restricted       BOOLEAN NOT NULL DEFAULT false,
  restriction_notes   TEXT,
  restriction_notes_ar TEXT,
  target_amount       NUMERIC(15,2),
  current_balance     NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_default          BOOLEAN NOT NULL DEFAULT false,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  color               TEXT,
  icon                TEXT,
  display_order       INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(church_id, name)
);

-- ─── Bank Accounts ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bank_accounts (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id              UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  account_id             UUID REFERENCES accounts(id) ON DELETE SET NULL,
  name                   TEXT NOT NULL,
  name_ar                TEXT,
  bank_name              TEXT,
  bank_name_ar           TEXT,
  account_number_last4   TEXT,
  routing_number         TEXT,
  currency               TEXT NOT NULL DEFAULT 'USD',
  current_balance        NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_primary             BOOLEAN NOT NULL DEFAULT false,
  is_active              BOOLEAN NOT NULL DEFAULT true,
  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(church_id, name)
);

-- ─── Deposit Batches ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS deposit_batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id       UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  batch_number    TEXT,
  batch_date      DATE NOT NULL,
  description     TEXT,
  description_ar  TEXT,
  bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  fund_id         UUID, -- will FK to funds after funds table created
  expected_count  INTEGER NOT NULL DEFAULT 0,
  actual_count    INTEGER NOT NULL DEFAULT 0,
  expected_total  NUMERIC(15,2) NOT NULL DEFAULT 0,
  actual_total    NUMERIC(15,2) NOT NULL DEFAULT 0,
  status          batch_status NOT NULL DEFAULT 'open',
  currency        TEXT NOT NULL DEFAULT 'USD',
  opened_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  closed_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  closed_at       TIMESTAMPTZ,
  posted_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  posted_at       TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_batches_church_date ON deposit_batches(church_id, batch_date DESC);

-- ─── Recurring Transaction Rules ────────────────────────────

CREATE TABLE IF NOT EXISTS recurring_transaction_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id       UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  name_ar         TEXT,
  description     TEXT,
  frequency       giving_frequency NOT NULL,
  amount          NUMERIC(15,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'USD',
  account_id      UUID REFERENCES accounts(id) ON DELETE SET NULL,
  fund_id         UUID, -- FK to funds
  bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  ministry_id     UUID REFERENCES ministries(id) ON DELETE SET NULL,
  donor_id        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  payment_method  payment_method,
  is_income       BOOLEAN NOT NULL DEFAULT false,
  start_date      DATE NOT NULL,
  end_date        DATE,
  next_run_date   DATE NOT NULL,
  last_run_date   DATE,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  auto_post       BOOLEAN NOT NULL DEFAULT false,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recurring_rules_church ON recurring_transaction_rules(church_id, is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_rules_next   ON recurring_transaction_rules(next_run_date) WHERE is_active = true;

-- ─── Financial Transactions ──────────────────────────────────

CREATE TABLE IF NOT EXISTS financial_transactions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id          UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  fiscal_year_id     UUID REFERENCES fiscal_years(id) ON DELETE RESTRICT,
  transaction_number TEXT,
  transaction_date   DATE NOT NULL,
  description        TEXT NOT NULL,
  description_ar     TEXT,
  reference          TEXT,
  status             financial_transaction_status NOT NULL DEFAULT 'draft',
  total_amount       NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency           TEXT NOT NULL DEFAULT 'USD',
  fund_id            UUID, -- FK to funds
  bank_account_id    UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  ministry_id        UUID REFERENCES ministries(id) ON DELETE SET NULL,
  event_id           UUID REFERENCES events(id) ON DELETE SET NULL,
  batch_id           UUID REFERENCES deposit_batches(id) ON DELETE SET NULL,
  donor_id           UUID REFERENCES profiles(id) ON DELETE SET NULL,
  payment_method     payment_method,
  check_number       TEXT,
  submitted_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at        TIMESTAMPTZ,
  posted_by          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  posted_at          TIMESTAMPTZ,
  voided_by          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  voided_at          TIMESTAMPTZ,
  void_reason        TEXT,
  is_recurring       BOOLEAN NOT NULL DEFAULT false,
  recurring_rule_id  UUID REFERENCES recurring_transaction_rules(id) ON DELETE SET NULL,
  attachments        TEXT[],
  tags               TEXT[] DEFAULT '{}',
  notes              TEXT,
  notes_ar           TEXT,
  metadata           JSONB DEFAULT '{}',
  created_by         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fin_txn_church_date ON financial_transactions(church_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_fin_txn_status      ON financial_transactions(church_id, status);
CREATE INDEX IF NOT EXISTS idx_fin_txn_fund        ON financial_transactions(fund_id);
CREATE INDEX IF NOT EXISTS idx_fin_txn_donor       ON financial_transactions(donor_id);
CREATE INDEX IF NOT EXISTS idx_fin_txn_batch       ON financial_transactions(batch_id);
CREATE INDEX IF NOT EXISTS idx_fin_txn_ministry    ON financial_transactions(ministry_id);
CREATE INDEX IF NOT EXISTS idx_fin_txn_number      ON financial_transactions(church_id, transaction_number);

-- ─── Transaction Line Items ──────────────────────────────────

CREATE TABLE IF NOT EXISTS transaction_line_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES financial_transactions(id) ON DELETE CASCADE,
  church_id      UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  account_id     UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  fund_id        UUID, -- FK to funds
  description    TEXT,
  description_ar TEXT,
  debit_amount   NUMERIC(15,2) NOT NULL DEFAULT 0,
  credit_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency       TEXT NOT NULL DEFAULT 'USD',
  exchange_rate  NUMERIC(12,6) DEFAULT 1.0,
  base_debit     NUMERIC(15,2) NOT NULL DEFAULT 0,
  base_credit    NUMERIC(15,2) NOT NULL DEFAULT 0,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_line_item CHECK (
    (debit_amount >= 0 AND credit_amount >= 0) AND
    NOT (debit_amount > 0 AND credit_amount > 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_line_items_txn     ON transaction_line_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_line_items_account ON transaction_line_items(account_id);
CREATE INDEX IF NOT EXISTS idx_line_items_fund    ON transaction_line_items(fund_id);

-- ─── Campaigns ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS campaigns (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id      UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  fund_id        UUID, -- FK to funds
  name           TEXT NOT NULL,
  name_ar        TEXT,
  description    TEXT,
  description_ar TEXT,
  goal_amount    NUMERIC(15,2) NOT NULL,
  raised_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
  pledged_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency       TEXT NOT NULL DEFAULT 'USD',
  start_date     DATE NOT NULL,
  end_date       DATE,
  status         campaign_status NOT NULL DEFAULT 'planning',
  image_url      TEXT,
  is_public      BOOLEAN NOT NULL DEFAULT true,
  allow_pledges  BOOLEAN NOT NULL DEFAULT true,
  allow_online   BOOLEAN NOT NULL DEFAULT false,
  created_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(church_id, name)
);

CREATE INDEX IF NOT EXISTS idx_campaigns_church ON campaigns(church_id, status);

-- ─── Pledges ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pledges (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id          UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  donor_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fund_id            UUID, -- FK to funds
  campaign_id        UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  total_amount       NUMERIC(15,2) NOT NULL,
  fulfilled_amount   NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency           TEXT NOT NULL DEFAULT 'USD',
  frequency          giving_frequency NOT NULL DEFAULT 'monthly',
  installment_amount NUMERIC(15,2),
  start_date         DATE NOT NULL,
  end_date           DATE,
  next_due_date      DATE,
  status             pledge_status NOT NULL DEFAULT 'active',
  notes              TEXT,
  notes_ar           TEXT,
  is_anonymous       BOOLEAN NOT NULL DEFAULT false,
  created_by         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pledges_church   ON pledges(church_id, status);
CREATE INDEX IF NOT EXISTS idx_pledges_donor    ON pledges(donor_id);
CREATE INDEX IF NOT EXISTS idx_pledges_campaign ON pledges(campaign_id);

-- ─── Donations ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS donations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id           UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  transaction_id      UUID REFERENCES financial_transactions(id) ON DELETE SET NULL,
  donor_id            UUID REFERENCES profiles(id) ON DELETE SET NULL,
  fund_id             UUID NOT NULL, -- FK to funds
  campaign_id         UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  pledge_id           UUID REFERENCES pledges(id) ON DELETE SET NULL,
  amount              NUMERIC(15,2) NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'USD',
  exchange_rate       NUMERIC(12,6) DEFAULT 1.0,
  base_amount         NUMERIC(15,2) NOT NULL,
  donation_date       DATE NOT NULL,
  payment_method      payment_method NOT NULL DEFAULT 'cash',
  check_number        TEXT,
  receipt_number      TEXT,
  is_tithe            BOOLEAN NOT NULL DEFAULT false,
  is_anonymous        BOOLEAN NOT NULL DEFAULT false,
  is_tax_deductible   BOOLEAN NOT NULL DEFAULT true,
  is_in_kind          BOOLEAN NOT NULL DEFAULT false,
  in_kind_description TEXT,
  in_kind_description_ar TEXT,
  in_kind_fair_value  NUMERIC(15,2),
  is_recurring        BOOLEAN NOT NULL DEFAULT false,
  frequency           giving_frequency NOT NULL DEFAULT 'one_time',
  recurring_rule_id   UUID REFERENCES recurring_transaction_rules(id) ON DELETE SET NULL,
  stripe_payment_id   TEXT,
  stripe_customer_id  TEXT,
  batch_id            UUID REFERENCES deposit_batches(id) ON DELETE SET NULL,
  notes               TEXT,
  notes_ar            TEXT,
  tags                TEXT[] DEFAULT '{}',
  created_by          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_donations_church_date ON donations(church_id, donation_date DESC);
CREATE INDEX IF NOT EXISTS idx_donations_donor       ON donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_fund        ON donations(fund_id);
CREATE INDEX IF NOT EXISTS idx_donations_campaign    ON donations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_donations_pledge      ON donations(pledge_id);
CREATE INDEX IF NOT EXISTS idx_donations_batch       ON donations(batch_id);
CREATE INDEX IF NOT EXISTS idx_donations_receipt     ON donations(church_id, receipt_number);

-- Now add FK constraints for fund_id columns that reference funds
ALTER TABLE deposit_batches          ADD CONSTRAINT fk_batch_fund            FOREIGN KEY (fund_id)  REFERENCES funds(id) ON DELETE SET NULL;
ALTER TABLE recurring_transaction_rules ADD CONSTRAINT fk_recurring_fund     FOREIGN KEY (fund_id)  REFERENCES funds(id) ON DELETE SET NULL;
ALTER TABLE financial_transactions   ADD CONSTRAINT fk_txn_fund              FOREIGN KEY (fund_id)  REFERENCES funds(id) ON DELETE SET NULL;
ALTER TABLE transaction_line_items   ADD CONSTRAINT fk_line_item_fund        FOREIGN KEY (fund_id)  REFERENCES funds(id) ON DELETE SET NULL;
ALTER TABLE campaigns                ADD CONSTRAINT fk_campaign_fund         FOREIGN KEY (fund_id)  REFERENCES funds(id) ON DELETE SET NULL;
ALTER TABLE pledges                  ADD CONSTRAINT fk_pledge_fund           FOREIGN KEY (fund_id)  REFERENCES funds(id) ON DELETE SET NULL;
ALTER TABLE donations                ADD CONSTRAINT fk_donation_fund         FOREIGN KEY (fund_id)  REFERENCES funds(id) ON DELETE RESTRICT;

-- ─── Budgets ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS budgets (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id      UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  fiscal_year_id UUID NOT NULL REFERENCES fiscal_years(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  name_ar        TEXT,
  description    TEXT,
  description_ar TEXT,
  period_type    budget_period_type NOT NULL DEFAULT 'annual',
  start_date     DATE NOT NULL,
  end_date       DATE NOT NULL,
  fund_id        UUID REFERENCES funds(id) ON DELETE SET NULL,
  ministry_id    UUID REFERENCES ministries(id) ON DELETE SET NULL,
  total_income   NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_expense  NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_approved    BOOLEAN NOT NULL DEFAULT false,
  approved_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at    TIMESTAMPTZ,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budgets_church_year ON budgets(church_id, fiscal_year_id);

-- ─── Budget Line Items ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS budget_line_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id      UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  church_id      UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  account_id     UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  fund_id        UUID REFERENCES funds(id) ON DELETE SET NULL,
  description    TEXT,
  description_ar TEXT,
  jan_amount     NUMERIC(15,2) DEFAULT 0,
  feb_amount     NUMERIC(15,2) DEFAULT 0,
  mar_amount     NUMERIC(15,2) DEFAULT 0,
  apr_amount     NUMERIC(15,2) DEFAULT 0,
  may_amount     NUMERIC(15,2) DEFAULT 0,
  jun_amount     NUMERIC(15,2) DEFAULT 0,
  jul_amount     NUMERIC(15,2) DEFAULT 0,
  aug_amount     NUMERIC(15,2) DEFAULT 0,
  sep_amount     NUMERIC(15,2) DEFAULT 0,
  oct_amount     NUMERIC(15,2) DEFAULT 0,
  nov_amount     NUMERIC(15,2) DEFAULT 0,
  dec_amount     NUMERIC(15,2) DEFAULT 0,
  annual_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes          TEXT,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_items_budget  ON budget_line_items(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_account ON budget_line_items(account_id);

-- ─── Expense Requests ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS expense_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id        UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  request_number   TEXT,
  requested_by     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ministry_id      UUID REFERENCES ministries(id) ON DELETE SET NULL,
  event_id         UUID REFERENCES events(id) ON DELETE SET NULL,
  fund_id          UUID REFERENCES funds(id) ON DELETE SET NULL,
  account_id       UUID REFERENCES accounts(id) ON DELETE SET NULL,
  description      TEXT NOT NULL,
  description_ar   TEXT,
  amount           NUMERIC(15,2) NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'USD',
  vendor_name      TEXT,
  vendor_name_ar   TEXT,
  status           expense_request_status NOT NULL DEFAULT 'draft',
  approved_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at      TIMESTAMPTZ,
  rejection_reason TEXT,
  paid_at          TIMESTAMPTZ,
  paid_by          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  payment_method   payment_method,
  transaction_id   UUID REFERENCES financial_transactions(id) ON DELETE SET NULL,
  check_number     TEXT,
  is_reimbursement BOOLEAN NOT NULL DEFAULT false,
  reimburse_to     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  attachments      TEXT[],
  notes            TEXT,
  notes_ar         TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_req_church    ON expense_requests(church_id, status);
CREATE INDEX IF NOT EXISTS idx_expense_req_requester ON expense_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_expense_req_ministry  ON expense_requests(ministry_id);

-- ─── Bank Reconciliations ────────────────────────────────────

CREATE TABLE IF NOT EXISTS bank_reconciliations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id           UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  bank_account_id     UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  statement_date      DATE NOT NULL,
  statement_balance   NUMERIC(15,2) NOT NULL,
  calculated_balance  NUMERIC(15,2),
  difference          NUMERIC(15,2),
  status              reconciliation_status NOT NULL DEFAULT 'in_progress',
  started_by          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  completed_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  completed_at        TIMESTAMPTZ,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reconciliation_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id UUID NOT NULL REFERENCES bank_reconciliations(id) ON DELETE CASCADE,
  transaction_id    UUID NOT NULL REFERENCES financial_transactions(id) ON DELETE CASCADE,
  is_cleared        BOOLEAN NOT NULL DEFAULT false,
  cleared_at        TIMESTAMPTZ,
  UNIQUE(reconciliation_id, transaction_id)
);

-- ─── Exchange Rates ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS exchange_rates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id      UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  from_currency  TEXT NOT NULL,
  to_currency    TEXT NOT NULL,
  rate           NUMERIC(12,6) NOT NULL,
  effective_date DATE NOT NULL,
  source         TEXT DEFAULT 'manual',
  created_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(church_id, from_currency, to_currency, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_lookup
  ON exchange_rates(church_id, from_currency, to_currency, effective_date DESC);

-- ─── Church Assets ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS church_assets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id         UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  account_id        UUID REFERENCES accounts(id) ON DELETE SET NULL,
  name              TEXT NOT NULL,
  name_ar           TEXT,
  description       TEXT,
  description_ar    TEXT,
  category          TEXT,
  category_ar       TEXT,
  purchase_date     DATE,
  purchase_price    NUMERIC(15,2),
  current_value     NUMERIC(15,2),
  currency          TEXT NOT NULL DEFAULT 'USD',
  serial_number     TEXT,
  location          TEXT,
  location_ar       TEXT,
  assigned_to       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ministry_id       UUID REFERENCES ministries(id) ON DELETE SET NULL,
  depreciation_rate NUMERIC(5,2),
  salvage_value     NUMERIC(15,2),
  useful_life_years INTEGER,
  status            asset_status NOT NULL DEFAULT 'active',
  disposed_date     DATE,
  disposal_notes    TEXT,
  photo_url         TEXT,
  attachments       TEXT[],
  created_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_church_assets_church ON church_assets(church_id, status);

-- ─── Giving Statements ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS giving_statements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id        UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  donor_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fiscal_year_id   UUID NOT NULL REFERENCES fiscal_years(id) ON DELETE CASCADE,
  statement_number TEXT,
  period_start     DATE NOT NULL,
  period_end       DATE NOT NULL,
  total_amount     NUMERIC(15,2) NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'USD',
  generated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  generated_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  sent_at          TIMESTAMPTZ,
  sent_via         TEXT,
  pdf_url          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_giving_statements_donor ON giving_statements(donor_id, fiscal_year_id);

-- ─── Financial Audit Log ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS financial_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id   UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id   UUID NOT NULL,
  action      TEXT NOT NULL,
  changed_by  UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fin_audit_church  ON financial_audit_log(church_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fin_audit_entity  ON financial_audit_log(entity_type, entity_id);

-- ─── Trigger: updated_at ─────────────────────────────────────

CREATE TRIGGER update_fiscal_years_updated_at
  BEFORE UPDATE ON fiscal_years
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_funds_updated_at
  BEFORE UPDATE ON funds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON bank_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deposit_batches_updated_at
  BEFORE UPDATE ON deposit_batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_transactions_updated_at
  BEFORE UPDATE ON financial_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_donations_updated_at
  BEFORE UPDATE ON donations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pledges_updated_at
  BEFORE UPDATE ON pledges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_line_items_updated_at
  BEFORE UPDATE ON budget_line_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expense_requests_updated_at
  BEFORE UPDATE ON expense_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_reconciliations_updated_at
  BEFORE UPDATE ON bank_reconciliations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_church_assets_updated_at
  BEFORE UPDATE ON church_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recurring_transaction_rules_updated_at
  BEFORE UPDATE ON recurring_transaction_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Trigger: auto-generate sequential numbers ───────────────

CREATE OR REPLACE FUNCTION generate_transaction_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  next_num INTEGER;
  year_str TEXT;
BEGIN
  IF NEW.transaction_number IS NOT NULL THEN RETURN NEW; END IF;
  year_str := EXTRACT(YEAR FROM NEW.transaction_date)::TEXT;
  SELECT COALESCE(MAX(CAST(SPLIT_PART(transaction_number, '-', 3) AS INTEGER)), 0) + 1
    INTO next_num
    FROM financial_transactions
   WHERE church_id = NEW.church_id
     AND transaction_number LIKE 'TXN-' || year_str || '-%';
  NEW.transaction_number := 'TXN-' || year_str || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_transaction_number
  BEFORE INSERT ON financial_transactions
  FOR EACH ROW EXECUTE FUNCTION generate_transaction_number();

CREATE OR REPLACE FUNCTION generate_batch_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  next_num INTEGER;
  year_str TEXT;
BEGIN
  IF NEW.batch_number IS NOT NULL THEN RETURN NEW; END IF;
  year_str := EXTRACT(YEAR FROM NEW.batch_date)::TEXT;
  SELECT COALESCE(MAX(CAST(SPLIT_PART(batch_number, '-', 3) AS INTEGER)), 0) + 1
    INTO next_num
    FROM deposit_batches
   WHERE church_id = NEW.church_id
     AND batch_number LIKE 'BATCH-' || year_str || '-%';
  NEW.batch_number := 'BATCH-' || year_str || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_batch_number
  BEFORE INSERT ON deposit_batches
  FOR EACH ROW EXECUTE FUNCTION generate_batch_number();

CREATE OR REPLACE FUNCTION generate_expense_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  next_num INTEGER;
  year_str TEXT;
BEGIN
  IF NEW.request_number IS NOT NULL THEN RETURN NEW; END IF;
  year_str := EXTRACT(YEAR FROM NEW.created_at)::TEXT;
  SELECT COALESCE(MAX(CAST(SPLIT_PART(request_number, '-', 3) AS INTEGER)), 0) + 1
    INTO next_num
    FROM expense_requests
   WHERE church_id = NEW.church_id
     AND request_number LIKE 'EXP-' || year_str || '-%';
  NEW.request_number := 'EXP-' || year_str || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_expense_number
  BEFORE INSERT ON expense_requests
  FOR EACH ROW EXECUTE FUNCTION generate_expense_number();

CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  next_num INTEGER;
  year_str TEXT;
BEGIN
  IF NEW.receipt_number IS NOT NULL THEN RETURN NEW; END IF;
  year_str := EXTRACT(YEAR FROM NEW.donation_date)::TEXT;
  SELECT COALESCE(MAX(CAST(SPLIT_PART(receipt_number, '-', 3) AS INTEGER)), 0) + 1
    INTO next_num
    FROM donations
   WHERE church_id = NEW.church_id
     AND receipt_number LIKE 'RCT-' || year_str || '-%';
  NEW.receipt_number := 'RCT-' || year_str || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_receipt_number
  BEFORE INSERT ON donations
  FOR EACH ROW EXECUTE FUNCTION generate_receipt_number();

-- ─── Trigger: fund balance updates ───────────────────────────

CREATE OR REPLACE FUNCTION update_fund_balance_on_donation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE funds SET current_balance = current_balance + NEW.base_amount, updated_at = now()
     WHERE id = NEW.fund_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE funds SET current_balance = current_balance - OLD.base_amount, updated_at = now()
     WHERE id = OLD.fund_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.fund_id = NEW.fund_id THEN
    UPDATE funds SET current_balance = current_balance + (NEW.base_amount - OLD.base_amount), updated_at = now()
     WHERE id = NEW.fund_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.fund_id != NEW.fund_id THEN
    UPDATE funds SET current_balance = current_balance - OLD.base_amount, updated_at = now() WHERE id = OLD.fund_id;
    UPDATE funds SET current_balance = current_balance + NEW.base_amount, updated_at = now() WHERE id = NEW.fund_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_fund_balance_donation
  AFTER INSERT OR UPDATE OR DELETE ON donations
  FOR EACH ROW EXECUTE FUNCTION update_fund_balance_on_donation();

-- ─── Trigger: pledge fulfillment ────────────────────────────

CREATE OR REPLACE FUNCTION update_pledge_fulfillment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  pledge_id_to_update UUID;
BEGIN
  pledge_id_to_update := COALESCE(NEW.pledge_id, OLD.pledge_id);
  IF pledge_id_to_update IS NOT NULL THEN
    UPDATE pledges SET
      fulfilled_amount = (
        SELECT COALESCE(SUM(base_amount), 0) FROM donations WHERE pledge_id = pledge_id_to_update
      ),
      status = CASE
        WHEN (SELECT COALESCE(SUM(base_amount), 0) FROM donations WHERE pledge_id = pledge_id_to_update) >= total_amount
        THEN 'completed'::pledge_status
        ELSE status
      END,
      updated_at = now()
    WHERE id = pledge_id_to_update;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pledge_fulfillment
  AFTER INSERT OR UPDATE OR DELETE ON donations
  FOR EACH ROW EXECUTE FUNCTION update_pledge_fulfillment();

-- ─── Trigger: campaign totals ────────────────────────────────

CREATE OR REPLACE FUNCTION update_campaign_totals()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  campaign_id_to_update UUID;
BEGIN
  campaign_id_to_update := COALESCE(NEW.campaign_id, OLD.campaign_id);
  IF campaign_id_to_update IS NOT NULL THEN
    UPDATE campaigns SET
      raised_amount = (
        SELECT COALESCE(SUM(base_amount), 0) FROM donations WHERE campaign_id = campaign_id_to_update
      ),
      updated_at = now()
    WHERE id = campaign_id_to_update;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_campaign_totals
  AFTER INSERT OR UPDATE OR DELETE ON donations
  FOR EACH ROW EXECUTE FUNCTION update_campaign_totals();

-- ─── Trigger: batch totals ───────────────────────────────────

CREATE OR REPLACE FUNCTION update_batch_totals()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  batch_id_to_update UUID;
BEGIN
  batch_id_to_update := COALESCE(NEW.batch_id, OLD.batch_id);
  IF batch_id_to_update IS NOT NULL THEN
    UPDATE deposit_batches SET
      actual_count = (SELECT COUNT(*) FROM donations WHERE batch_id = batch_id_to_update),
      actual_total = (SELECT COALESCE(SUM(amount), 0) FROM donations WHERE batch_id = batch_id_to_update),
      updated_at = now()
    WHERE id = batch_id_to_update;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_batch_totals
  AFTER INSERT OR UPDATE OR DELETE ON donations
  FOR EACH ROW EXECUTE FUNCTION update_batch_totals();

-- ─── Function: seed default chart of accounts ────────────────

CREATE OR REPLACE FUNCTION seed_default_chart_of_accounts(p_church_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO accounts (church_id, code, name, name_ar, account_type, account_sub_type, is_header, is_system, normal_balance, depth, path, display_order) VALUES
  -- Assets
  (p_church_id, '1000', 'Assets',             'الأصول',                    'asset',   NULL,          true,  true, 'debit',  0, '1000',           10),
  (p_church_id, '1100', 'Cash & Bank',         'النقد والبنوك',             'asset',   'cash',        true,  true, 'debit',  1, '1000/1100',      11),
  (p_church_id, '1110', 'Petty Cash',          'صندوق النثريات',            'asset',   'cash',        false, true, 'debit',  2, '1000/1100/1110', 12),
  (p_church_id, '1120', 'Main Checking',       'الحساب الجاري الرئيسي',    'asset',   'bank',        false, true, 'debit',  2, '1000/1100/1120', 13),
  (p_church_id, '1130', 'Savings Account',     'حساب التوفير',              'asset',   'bank',        false, true, 'debit',  2, '1000/1100/1130', 14),
  (p_church_id, '1200', 'Accounts Receivable', 'الذمم المدينة',             'asset',   'receivable',  true,  true, 'debit',  1, '1000/1200',      15),
  (p_church_id, '1300', 'Fixed Assets',        'الأصول الثابتة',            'asset',   'fixed_asset', true,  true, 'debit',  1, '1000/1300',      16),
  -- Liabilities
  (p_church_id, '2000', 'Liabilities',         'الخصوم',                    'liability',NULL,         true,  true, 'credit', 0, '2000',           20),
  (p_church_id, '2100', 'Accounts Payable',    'الذمم الدائنة',             'liability','payable',    false, true, 'credit', 1, '2000/2100',      21),
  (p_church_id, '2200', 'Accrued Expenses',    'المصاريف المستحقة',         'liability','accrued',    false, true, 'credit', 1, '2000/2200',      22),
  (p_church_id, '2300', 'Loans Payable',       'القروض المستحقة الدفع',     'liability','loan',       false, true, 'credit', 1, '2000/2300',      23),
  -- Equity
  (p_church_id, '3000', 'Net Assets',          'صافي الأصول',               'equity',  NULL,          true,  true, 'credit', 0, '3000',           30),
  (p_church_id, '3100', 'Unrestricted Net Assets','صافي الأصول غير المقيدة','equity', 'net_assets',   false, true, 'credit', 1, '3000/3100',      31),
  (p_church_id, '3200', 'Restricted Net Assets','صافي الأصول المقيدة',     'equity',  'net_assets',   false, true, 'credit', 1, '3000/3200',      32),
  (p_church_id, '3300', 'Retained Earnings',   'الأرباح المحتجزة',          'equity',  'retained_earnings',false,true,'credit',1,'3000/3300',     33),
  -- Income
  (p_church_id, '4000', 'Income',              'الإيرادات',                 'income',  NULL,          true,  true, 'credit', 0, '4000',           40),
  (p_church_id, '4100', 'Tithes',              'العشور',                    'income',  'tithe',       false, true, 'credit', 1, '4000/4100',      41),
  (p_church_id, '4200', 'General Offerings',   'التقدمات العامة',           'income',  'offering',    false, true, 'credit', 1, '4000/4200',      42),
  (p_church_id, '4300', 'Designated Donations','التبرعات المخصصة',          'income',  'donation',    false, true, 'credit', 1, '4000/4300',      43),
  (p_church_id, '4400', 'Event Income',        'إيرادات الفعاليات',         'income',  'event_income',false, true, 'credit', 1, '4000/4400',      44),
  (p_church_id, '4500', 'Grant Income',        'إيرادات المنح',             'income',  'grant',       false, true, 'credit', 1, '4000/4500',      45),
  (p_church_id, '4600', 'Interest Income',     'إيرادات الفوائد',           'income',  'interest',    false, true, 'credit', 1, '4000/4600',      46),
  (p_church_id, '4900', 'Other Income',        'إيرادات أخرى',              'income',  'other_income',false, true, 'credit', 1, '4000/4900',      49),
  -- Expenses
  (p_church_id, '5000', 'Expenses',            'المصروفات',                 'expense', NULL,          true,  true, 'debit',  0, '5000',           50),
  (p_church_id, '5100', 'Staff Salaries',      'رواتب الموظفين',            'expense', 'salary',      false, true, 'debit',  1, '5000/5100',      51),
  (p_church_id, '5200', 'Rent & Facilities',   'الإيجار والمرافق',          'expense', 'rent',        false, true, 'debit',  1, '5000/5200',      52),
  (p_church_id, '5300', 'Utilities',           'المرافق العامة',            'expense', 'utilities',   false, true, 'debit',  1, '5000/5300',      53),
  (p_church_id, '5400', 'Supplies & Materials','اللوازم والمواد',            'expense', 'supplies',    false, true, 'debit',  1, '5000/5400',      54),
  (p_church_id, '5500', 'Missions & Outreach', 'البعثات والتواصل',          'expense', 'missions',    false, true, 'debit',  1, '5000/5500',      55),
  (p_church_id, '5600', 'Benevolence',         'مساعدات الاحتياج',          'expense', 'benevolence', false, true, 'debit',  1, '5000/5600',      56),
  (p_church_id, '5700', 'Maintenance & Repairs','الصيانة والإصلاحات',       'expense', 'maintenance', false, true, 'debit',  1, '5000/5700',      57),
  (p_church_id, '5800', 'Insurance',           'التأمين',                   'expense', 'insurance',   false, true, 'debit',  1, '5000/5800',      58),
  (p_church_id, '5900', 'Other Expenses',      'مصروفات أخرى',              'expense', 'other_expense',false,true, 'debit', 1, '5000/5900',      59)
  ON CONFLICT (church_id, code) DO NOTHING;
END;
$$;

-- ─── RLS Policies ────────────────────────────────────────────

ALTER TABLE fiscal_years              ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE funds                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_line_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_batches           ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE pledges                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_line_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_requests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_transaction_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_reconciliations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates            ENABLE ROW LEVEL SECURITY;
ALTER TABLE church_assets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE giving_statements         ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_audit_log       ENABLE ROW LEVEL SECURITY;

-- Fiscal years — admin only
CREATE POLICY "fiscal_years_church_members" ON fiscal_years FOR SELECT TO authenticated
  USING (church_id = public.get_church_id());
CREATE POLICY "fiscal_years_admin_write" ON fiscal_years FOR ALL TO authenticated
  USING (church_id = public.get_church_id() AND public.get_user_role() IN ('super_admin'));

-- Accounts — all members can read; admin manages
CREATE POLICY "accounts_church_read" ON accounts FOR SELECT TO authenticated
  USING (church_id = public.get_church_id());
CREATE POLICY "accounts_admin_write" ON accounts FOR ALL TO authenticated
  USING (church_id = public.get_church_id() AND public.get_user_role() IN ('super_admin'));

-- Funds — all members can read (campaigns are public); admin manages
CREATE POLICY "funds_church_read" ON funds FOR SELECT TO authenticated
  USING (church_id = public.get_church_id());
CREATE POLICY "funds_admin_write" ON funds FOR ALL TO authenticated
  USING (church_id = public.get_church_id() AND public.get_user_role() IN ('super_admin'));

-- Bank accounts — admin only
CREATE POLICY "bank_accounts_admin" ON bank_accounts FOR ALL TO authenticated
  USING (church_id = public.get_church_id() AND public.get_user_role() IN ('super_admin'));

-- Transactions — admin reads/writes; ministry leaders can read
CREATE POLICY "transactions_admin" ON financial_transactions FOR ALL TO authenticated
  USING (church_id = public.get_church_id() AND public.get_user_role() IN ('super_admin', 'ministry_leader'));

-- Transaction line items — same as transactions
CREATE POLICY "line_items_admin" ON transaction_line_items FOR ALL TO authenticated
  USING (church_id = public.get_church_id() AND public.get_user_role() IN ('super_admin', 'ministry_leader'));

-- Batches — admin only
CREATE POLICY "batches_admin" ON deposit_batches FOR ALL TO authenticated
  USING (church_id = public.get_church_id() AND public.get_user_role() IN ('super_admin'));

-- Donations — admin can see all; donors can see own
CREATE POLICY "donations_admin_read" ON donations FOR SELECT TO authenticated
  USING (church_id = public.get_church_id() AND public.get_user_role() IN ('super_admin', 'ministry_leader'));
CREATE POLICY "donations_admin_write" ON donations FOR INSERT TO authenticated
  WITH CHECK (church_id = public.get_church_id() AND public.get_user_role() IN ('super_admin', 'ministry_leader'));
CREATE POLICY "donations_admin_update" ON donations FOR UPDATE TO authenticated
  USING (church_id = public.get_church_id() AND public.get_user_role() IN ('super_admin', 'ministry_leader'));
CREATE POLICY "donations_own_read" ON donations FOR SELECT TO authenticated
  USING (donor_id = auth.uid());

-- Pledges — admin sees all; donor sees own
CREATE POLICY "pledges_admin" ON pledges FOR ALL TO authenticated
  USING (church_id = public.get_church_id() AND public.get_user_role() IN ('super_admin', 'ministry_leader'));
CREATE POLICY "pledges_own_read" ON pledges FOR SELECT TO authenticated
  USING (donor_id = auth.uid());

-- Campaigns — all church members can read active public campaigns
CREATE POLICY "campaigns_public_read" ON campaigns FOR SELECT TO authenticated
  USING (church_id = public.get_church_id() AND (is_public = true OR public.get_user_role() IN ('super_admin', 'ministry_leader')));
CREATE POLICY "campaigns_admin_write" ON campaigns FOR INSERT TO authenticated
  WITH CHECK (church_id = public.get_church_id() AND public.get_user_role() IN ('super_admin', 'ministry_leader'));
CREATE POLICY "campaigns_admin_update" ON campaigns FOR UPDATE TO authenticated
  USING (church_id = public.get_church_id() AND public.get_user_role() IN ('super_admin', 'ministry_leader'));

-- Budgets — admin and ministry leaders
CREATE POLICY "budgets_admin" ON budgets FOR ALL TO authenticated
  USING (church_id = public.get_church_id() AND public.get_user_role() IN ('super_admin', 'ministry_leader'));
CREATE POLICY "budget_line_items_admin" ON budget_line_items FOR ALL TO authenticated
  USING (church_id = public.get_church_id() AND public.get_user_role() IN ('super_admin', 'ministry_leader'));

-- Expense requests — requesters see own; approvers see all in church
CREATE POLICY "expenses_own_read" ON expense_requests FOR SELECT TO authenticated
  USING (requested_by = auth.uid());
CREATE POLICY "expenses_own_insert" ON expense_requests FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid() AND church_id = public.get_church_id());
CREATE POLICY "expenses_admin_all" ON expense_requests FOR ALL TO authenticated
  USING (church_id = public.get_church_id() AND public.get_user_role() IN ('super_admin', 'ministry_leader'));

-- Recurring rules — admin only
CREATE POLICY "recurring_admin" ON recurring_transaction_rules FOR ALL TO authenticated
  USING (church_id = public.get_church_id() AND public.get_user_role() IN ('super_admin'));

-- Reconciliations — admin only
CREATE POLICY "reconciliations_admin" ON bank_reconciliations FOR ALL TO authenticated
  USING (church_id = public.get_church_id() AND public.get_user_role() IN ('super_admin'));
CREATE POLICY "reconciliation_items_admin" ON reconciliation_items FOR ALL TO authenticated
  USING (reconciliation_id IN (
    SELECT id FROM bank_reconciliations WHERE church_id = public.get_church_id() AND public.get_user_role() IN ('super_admin')
  ));

-- Exchange rates — admin manages
CREATE POLICY "exchange_rates_admin" ON exchange_rates FOR ALL TO authenticated
  USING (church_id = public.get_church_id() AND public.get_user_role() IN ('super_admin'));

-- Church assets — admin manages
CREATE POLICY "church_assets_admin" ON church_assets FOR ALL TO authenticated
  USING (church_id = public.get_church_id() AND public.get_user_role() IN ('super_admin'));

-- Giving statements — donors see own; admin sees all
CREATE POLICY "giving_statements_own" ON giving_statements FOR SELECT TO authenticated
  USING (donor_id = auth.uid());
CREATE POLICY "giving_statements_admin" ON giving_statements FOR ALL TO authenticated
  USING (church_id = public.get_church_id() AND public.get_user_role() IN ('super_admin'));

-- Financial audit log — admin only
CREATE POLICY "fin_audit_admin" ON financial_audit_log FOR SELECT TO authenticated
  USING (church_id = public.get_church_id() AND public.get_user_role() IN ('super_admin'));
CREATE POLICY "fin_audit_insert" ON financial_audit_log FOR INSERT TO authenticated
  WITH CHECK (church_id = public.get_church_id());
