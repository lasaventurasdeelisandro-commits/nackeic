-- DICLIK.COM ENTERPRISE POSTGRESQL MIGRATION v1.1.0
-- Security Hardening, Token Revocation, Password Recovery, Disputes, Cancellations & Authenticated Payment Webhooks

-- 1. Token Revocation List (JWT Blacklist for Secure Logout)
CREATE TABLE IF NOT EXISTS revoked_tokens (
  jti VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
  revoked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires ON revoked_tokens(expires_at);

-- 2. Password Recovery Temporary Tokens (Hashed, Time-Limited)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pwd_reset_user ON password_reset_tokens(user_id);

-- 3. Contract Cancellations & Penalty Ledger (Auditable Financial Breakdown)
CREATE TABLE IF NOT EXISTS contract_cancellations (
  id VARCHAR(64) PRIMARY KEY,
  contract_id VARCHAR(64) UNIQUE NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
  cancelled_by_user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  cancelled_by_role VARCHAR(32) NOT NULL CHECK (cancelled_by_role IN ('cliente', 'tecnico', 'profesional', 'admin')),
  scenario VARCHAR(48) NOT NULL CHECK (scenario IN ('client_before_arrival', 'client_after_arrival', 'tech_circumvention')),
  penalty_rate_percent DOUBLE PRECISION NOT NULL,
  penalty_amount DOUBLE PRECISION NOT NULL,
  platform_earnings DOUBLE PRECISION NOT NULL,
  specialist_compensation DOUBLE PRECISION NOT NULL,
  client_refund_amount DOUBLE PRECISION NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cancellations_contract ON contract_cancellations(contract_id);

-- 4. Disputes & Claims Management
CREATE TABLE IF NOT EXISTS disputes (
  id VARCHAR(64) PRIMARY KEY,
  contract_id VARCHAR(64) NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
  opened_by VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  evidence_urls TEXT[] DEFAULT '{}',
  status VARCHAR(32) DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved_refund_client', 'resolved_release_pro', 'closed')),
  resolution_notes TEXT,
  resolved_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_disputes_contract ON disputes(contract_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);

-- 5. Authenticated Payment Provider Webhooks & Reconciliation
CREATE TABLE IF NOT EXISTS payment_webhooks (
  id VARCHAR(64) PRIMARY KEY,
  provider VARCHAR(32) NOT NULL,
  provider_event_id VARCHAR(128) UNIQUE NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  amount DOUBLE PRECISION DEFAULT 0.0,
  currency VARCHAR(12) DEFAULT 'DOP',
  status VARCHAR(32) DEFAULT 'received' CHECK (status IN ('received', 'reconciled', 'rejected', 'ignored')),
  payload JSONB NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_webhooks_provider_event ON payment_webhooks(provider_event_id);
