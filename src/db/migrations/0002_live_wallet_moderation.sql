-- NAKEIC Database Schema - Version 0002 (PostgreSQL)
-- Auth Recovery, Privacy, Statuses, NAKEIC LIVE Streaming, Battles, Wallet Ledger & Moderation

-- 1. Auth Password/PIN Credentials on Users
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(256);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_salt VARCHAR(128);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(256);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_salt VARCHAR(128);

-- 2. Extended Privacy & Statuses
ALTER TABLE user_privacy_settings
  ADD COLUMN IF NOT EXISTS status_visibility VARCHAR(16) DEFAULT 'everyone' CHECK (status_visibility IN ('everyone', 'contacts', 'nobody'));

CREATE TABLE IF NOT EXISTS statuses (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    media_url TEXT,
    text_caption TEXT,
    bg_hex VARCHAR(16) DEFAULT '#0077B6',
    privacy VARCHAR(16) DEFAULT 'everyone',
    created_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_statuses_user ON statuses(user_id);
CREATE INDEX IF NOT EXISTS idx_statuses_expires ON statuses(expires_at);

CREATE TABLE IF NOT EXISTS status_views (
    status_id VARCHAR(64) NOT NULL REFERENCES statuses(id) ON DELETE CASCADE,
    viewer_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    viewed_at BIGINT NOT NULL,
    PRIMARY KEY (status_id, viewer_id)
);

CREATE TABLE IF NOT EXISTS status_reactions (
    id SERIAL PRIMARY KEY,
    status_id VARCHAR(64) NOT NULL REFERENCES statuses(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(16) NOT NULL,
    created_at BIGINT NOT NULL,
    CONSTRAINT uq_status_user_reaction UNIQUE (status_id, user_id)
);

-- 3. Safety & Abuse Reports
CREATE TABLE IF NOT EXISTS user_reports (
    id VARCHAR(64) PRIMARY KEY,
    reporter_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(24) NOT NULL CHECK (target_type IN ('user', 'message', 'live_stream', 'group')),
    target_id VARCHAR(128) NOT NULL,
    reason VARCHAR(64) NOT NULL,
    details TEXT,
    status VARCHAR(24) DEFAULT 'pending_review',
    created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reports_target ON user_reports(target_type, target_id);

-- 4. Server-Authoritative Wallet & Double-Entry Financial Ledger
CREATE TABLE IF NOT EXISTS wallets (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    coins_balance BIGINT NOT NULL DEFAULT 0 CHECK (coins_balance >= 0),
    creator_diamonds BIGINT NOT NULL DEFAULT 0 CHECK (creator_diamonds >= 0),
    pending_payout_cents BIGINT NOT NULL DEFAULT 0 CHECK (pending_payout_cents >= 0),
    kyc_status VARCHAR(24) NOT NULL DEFAULT 'unverified' CHECK (kyc_status IN ('unverified', 'pending', 'verified', 'rejected')),
    kyc_full_name VARCHAR(128),
    kyc_country VARCHAR(64),
    kyc_document_hash VARCHAR(128),
    kyc_submitted_at BIGINT,
    updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tx_type VARCHAR(32) NOT NULL CHECK (tx_type IN ('coin_purchase', 'gift_sent', 'gift_received', 'payout_requested', 'payout_completed', 'bonus', 'refund')),
    amount_coins BIGINT NOT NULL DEFAULT 0,
    amount_diamonds BIGINT NOT NULL DEFAULT 0,
    amount_cents BIGINT NOT NULL DEFAULT 0,
    fee_cents BIGINT NOT NULL DEFAULT 0,
    currency VARCHAR(8) DEFAULT 'USD',
    balance_after_coins BIGINT NOT NULL DEFAULT 0,
    reference_id VARCHAR(128),
    status VARCHAR(24) NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'rejected')),
    description TEXT,
    signature_verified BOOLEAN DEFAULT false,
    metadata_json TEXT,
    created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON wallet_transactions(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS payout_requests (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_diamonds BIGINT NOT NULL CHECK (amount_diamonds > 0),
    gross_cents BIGINT NOT NULL,
    platform_fee_cents BIGINT NOT NULL DEFAULT 0,
    net_cents BIGINT NOT NULL,
    payout_method VARCHAR(32) NOT NULL,
    destination_masked VARCHAR(128) NOT NULL,
    status VARCHAR(24) NOT NULL CHECK (status IN ('pending_kyc', 'queued_compliance', 'approved', 'paid', 'rejected')),
    kyc_verified BOOLEAN NOT NULL DEFAULT false,
    created_at BIGINT NOT NULL,
    processed_at BIGINT
);

-- 5. NAKEIC LIVE Streaming, Guests, Battles & Moderation
CREATE TABLE IF NOT EXISTS live_streams (
    id VARCHAR(64) PRIMARY KEY,
    host_id VARCHAR(64) NOT NULL,
    title VARCHAR(160) NOT NULL,
    description TEXT,
    category VARCHAR(48) NOT NULL,
    cover_url TEXT,
    source_mode VARCHAR(16) DEFAULT 'camera',
    join_policy VARCHAR(24) DEFAULT 'everyone' CHECK (join_policy IN ('everyone', 'followers', 'invite_only')),
    comments_enabled BOOLEAN DEFAULT true,
    quality_preset VARCHAR(16) DEFAULT 'auto',
    status VARCHAR(24) NOT NULL CHECK (status IN ('live', 'ended', 'terminated_by_mod')),
    started_at BIGINT NOT NULL,
    ended_at BIGINT,
    duration_seconds INTEGER DEFAULT 0,
    peak_viewers INTEGER DEFAULT 0,
    likes_count BIGINT DEFAULT 0,
    gifts_count BIGINT DEFAULT 0,
    earned_coins BIGINT DEFAULT 0,
    battle_id VARCHAR(64),
    replay_metadata_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_live_streams_host ON live_streams(host_id, started_at DESC);

CREATE TABLE IF NOT EXISTS live_battles (
    id VARCHAR(64) PRIMARY KEY,
    challenger_room_id VARCHAR(64) NOT NULL,
    opponent_room_id VARCHAR(64) NOT NULL,
    challenger_host_id VARCHAR(64) NOT NULL,
    opponent_host_id VARCHAR(64) NOT NULL,
    challenger_score BIGINT NOT NULL DEFAULT 0,
    opponent_score BIGINT NOT NULL DEFAULT 0,
    winner_host_id VARCHAR(64),
    status VARCHAR(24) NOT NULL CHECK (status IN ('pending', 'active', 'completed', 'declined', 'canceled')),
    duration_seconds INTEGER NOT NULL DEFAULT 180,
    started_at BIGINT,
    ended_at BIGINT
);

CREATE TABLE IF NOT EXISTS live_gifts_ledger (
    id VARCHAR(64) PRIMARY KEY,
    room_id VARCHAR(64) NOT NULL,
    battle_id VARCHAR(64),
    sender_id VARCHAR(64) NOT NULL,
    recipient_host_id VARCHAR(64) NOT NULL,
    gift_id VARCHAR(48) NOT NULL,
    gift_name VARCHAR(64) NOT NULL,
    coins_spent BIGINT NOT NULL,
    creator_share_coins BIGINT NOT NULL,
    platform_fee_coins BIGINT NOT NULL,
    created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS live_moderators (
    host_id VARCHAR(64) NOT NULL,
    moderator_user_id VARCHAR(64) NOT NULL,
    assigned_at BIGINT NOT NULL,
    PRIMARY KEY (host_id, moderator_user_id)
);

CREATE TABLE IF NOT EXISTS live_moderation_logs (
    id VARCHAR(64) PRIMARY KEY,
    room_id VARCHAR(64) NOT NULL,
    actor_user_id VARCHAR(64) NOT NULL,
    target_user_id VARCHAR(64),
    action VARCHAR(32) NOT NULL,
    reason TEXT,
    duration_seconds INTEGER DEFAULT 0,
    created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_live_mod_logs_room ON live_moderation_logs(room_id, created_at DESC);
