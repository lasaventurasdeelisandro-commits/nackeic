ALTER TABLE financial_transactions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_owner;
ALTER TABLE financial_transactions ADD CONSTRAINT financial_transactions_owner
  CHECK (user_id IS NOT NULL OR type = 'fee_deduction');
