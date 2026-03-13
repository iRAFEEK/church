-- Migration 047: Change fund FK constraints from SET NULL to RESTRICT
-- Fixes P1-8: Deleting a fund was nullifying fund_id on all historical
-- transaction line items, pledges, and campaigns — destroying financial reports.

-- 1. transaction_line_items.fund_id: SET NULL → RESTRICT
ALTER TABLE transaction_line_items
  DROP CONSTRAINT IF EXISTS transaction_line_items_fund_id_fkey;
ALTER TABLE transaction_line_items
  ADD CONSTRAINT transaction_line_items_fund_id_fkey
    FOREIGN KEY (fund_id) REFERENCES funds(id) ON DELETE RESTRICT;

-- 2. pledges.fund_id: SET NULL → RESTRICT
ALTER TABLE pledges
  DROP CONSTRAINT IF EXISTS pledges_fund_id_fkey;
ALTER TABLE pledges
  ADD CONSTRAINT pledges_fund_id_fkey
    FOREIGN KEY (fund_id) REFERENCES funds(id) ON DELETE RESTRICT;

-- 3. campaigns.fund_id: SET NULL → RESTRICT
ALTER TABLE campaigns
  DROP CONSTRAINT IF EXISTS campaigns_fund_id_fkey;
ALTER TABLE campaigns
  ADD CONSTRAINT campaigns_fund_id_fkey
    FOREIGN KEY (fund_id) REFERENCES funds(id) ON DELETE RESTRICT;

-- 4. donations.fund_id: SET NULL → RESTRICT (same issue)
ALTER TABLE donations
  DROP CONSTRAINT IF EXISTS donations_fund_id_fkey;
ALTER TABLE donations
  ADD CONSTRAINT donations_fund_id_fkey
    FOREIGN KEY (fund_id) REFERENCES funds(id) ON DELETE RESTRICT;
