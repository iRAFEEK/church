-- Finance performance indexes
-- Covers query patterns found in finance pages and API routes

-- Budgets: list page orders by start_date DESC, existing index only covers fiscal_year_id
CREATE INDEX IF NOT EXISTS idx_budgets_church_date ON budgets(church_id, start_date DESC);

-- Budgets: active filter used in dashboard and reports
CREATE INDEX IF NOT EXISTS idx_budgets_church_active ON budgets(church_id, is_active) WHERE is_active = true;

-- Funds: list page orders by display_order, name — needs composite
CREATE INDEX IF NOT EXISTS idx_funds_church_order ON funds(church_id, display_order, name);

-- Funds: active filter used in dashboard and dropdowns
CREATE INDEX IF NOT EXISTS idx_funds_church_active ON funds(church_id, is_active) WHERE is_active = true;

-- Accounts: list page orders by display_order, code
CREATE INDEX IF NOT EXISTS idx_accounts_church_order ON accounts(church_id, display_order, code);

-- Donations: payment_method filter used on donations list page
CREATE INDEX IF NOT EXISTS idx_donations_method ON donations(church_id, payment_method);

-- Expense requests: created_at ordering (used in list pages)
CREATE INDEX IF NOT EXISTS idx_expense_req_created ON expense_requests(church_id, created_at DESC);

-- Campaigns: created_at ordering (used in API list endpoint)
CREATE INDEX IF NOT EXISTS idx_campaigns_church_created ON campaigns(church_id, created_at DESC);

-- Fiscal years: ordered by start_date (used in dropdown)
CREATE INDEX IF NOT EXISTS idx_fiscal_years_church ON fiscal_years(church_id, start_date DESC);
