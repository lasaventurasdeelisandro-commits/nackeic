-- NAKEIC Database Schema - Version 0001 (PostgreSQL)
-- Architectural Specification: E2EE Privacy, Multi-User Isolation, High-Performance Messaging

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    phone_number VARCHAR(32) NOT NULL UNIQUE,
    display_name VARCHAR(128) NOT NULL,
    username VARCHAR(64) UNIQUE,
    bio TEXT DEFAULT 'Conectado a NAKEIC',
    avatar_url TEXT,
    public_identity_key TEXT,
    is_online BOOLEAN DEFAULT false,
    last_seen BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    updated_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 2. Sessions and Devices Table
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    device_name VARCHAR(128) NOT NULL,
    device_id VARCHAR(128),
    platform VARCHAR(32) NOT NULL,
    ip_address VARCHAR(45),
    created_at BIGINT NOT NULL,
    last_active BIGINT NOT NULL,
    expires_at BIGINT NOT NULL,
    is_revoked BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- 3. User Contacts & Blocklist Table
CREATE TABLE IF NOT EXISTS user_contacts (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_phone VARCHAR(32) NOT NULL,
    contact_name VARCHAR(128),
    is_blocked BOOLEAN DEFAULT false,
    created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    CONSTRAINT uq_user_contact UNIQUE (user_id, contact_phone)
);

CREATE INDEX IF NOT EXISTS idx_contacts_user ON user_contacts(user_id);

-- 4. Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
    id VARCHAR(64) PRIMARY KEY,
    type VARCHAR(16) NOT NULL CHECK (type IN ('direct', 'group', 'channel')),
    title VARCHAR(256),
    avatar_url TEXT,
    description TEXT,
    is_channel BOOLEAN DEFAULT false,
    is_business BOOLEAN DEFAULT false,
    is_saved_messages BOOLEAN DEFAULT false,
    is_pinned BOOLEAN DEFAULT false,
    disappearing_duration_seconds INTEGER DEFAULT 0,
    last_message_text TEXT,
    last_message_time BIGINT,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations(last_message_time DESC);

-- 5. Conversation Participants Table (Many-to-Many with RBAC)
CREATE TABLE IF NOT EXISTS conversation_participants (
    conversation_id VARCHAR(64) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(32) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    unread_count INTEGER DEFAULT 0,
    is_muted BOOLEAN DEFAULT false,
    joined_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_participants_user ON conversation_participants(user_id);

-- 6. Messages Table (E2EE: server stores ciphertext, never plaintext or private keys)
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(64) PRIMARY KEY,
    conversation_id VARCHAR(64) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_name VARCHAR(128),
    sender_avatar TEXT,
    text TEXT NOT NULL, -- Ciphertext or public channel text
    message_type VARCHAR(32) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file', 'voice', 'location', 'contact', 'poll', 'product')),
    media_url TEXT,
    file_name VARCHAR(256),
    file_size BIGINT,
    duration_seconds INTEGER,
    waveform_json TEXT,
    reply_to_id VARCHAR(64),
    status VARCHAR(16) DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed')),
    is_edited BOOLEAN DEFAULT false,
    edited_at BIGINT,
    disappearing_after_timestamp BIGINT,
    metadata_json TEXT,
    timestamp BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_conv_time ON messages(conversation_id, timestamp ASC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_disappearing ON messages(disappearing_after_timestamp) WHERE disappearing_after_timestamp IS NOT NULL;

-- 7. Message Reactions Table
CREATE TABLE IF NOT EXISTS message_reactions (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(64) NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction VARCHAR(16) NOT NULL,
    created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    CONSTRAINT uq_message_user_reaction UNIQUE (message_id, user_id)
);

-- 8. Device FCM Tokens Table
CREATE TABLE IF NOT EXISTS device_fcm_tokens (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    device_id VARCHAR(128),
    platform VARCHAR(32) DEFAULT 'android',
    updated_at BIGINT NOT NULL,
    CONSTRAINT uq_user_fcm_token UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_fcm_user ON device_fcm_tokens(user_id);

-- 9. Audio/Video Call History Table
CREATE TABLE IF NOT EXISTS calls (
    id VARCHAR(64) PRIMARY KEY,
    caller_id VARCHAR(64) NOT NULL REFERENCES users(id),
    receiver_id VARCHAR(64) NOT NULL REFERENCES users(id),
    conversation_id VARCHAR(64) REFERENCES conversations(id) ON DELETE SET NULL,
    call_type VARCHAR(16) NOT NULL CHECK (call_type IN ('audio', 'video')),
    status VARCHAR(16) NOT NULL CHECK (status IN ('initiated', 'ringing', 'accepted', 'rejected', 'missed', 'ended')),
    started_at BIGINT NOT NULL,
    answered_at BIGINT,
    ended_at BIGINT,
    duration_seconds INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_calls_caller ON calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_calls_receiver ON calls(receiver_id);

-- 10. User Privacy Settings Table
CREATE TABLE IF NOT EXISTS user_privacy_settings (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    last_seen_visibility VARCHAR(16) DEFAULT 'everyone' CHECK (last_seen_visibility IN ('everyone', 'contacts', 'nobody')),
    profile_photo_visibility VARCHAR(16) DEFAULT 'everyone' CHECK (profile_photo_visibility IN ('everyone', 'contacts', 'nobody')),
    read_receipts_enabled BOOLEAN DEFAULT true,
    disappearing_messages_default_seconds INTEGER DEFAULT 0,
    updated_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- 11. Commercial Plans & Monetization Tables
CREATE TABLE IF NOT EXISTS commercial_plans (
    id VARCHAR(32) PRIMARY KEY,
    plan_code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(64) NOT NULL,
    price_cents INTEGER NOT NULL DEFAULT 0,
    currency VARCHAR(8) DEFAULT 'USD',
    billing_interval VARCHAR(16) DEFAULT 'month',
    features_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id VARCHAR(32) NOT NULL REFERENCES commercial_plans(id),
    status VARCHAR(16) NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
    provider VARCHAR(32) DEFAULT 'manual',
    external_subscription_id VARCHAR(128),
    current_period_start BIGINT NOT NULL,
    current_period_end BIGINT NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS commercial_audit_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(64) NOT NULL,
    amount_cents INTEGER DEFAULT 0,
    currency VARCHAR(8) DEFAULT 'USD',
    status VARCHAR(32) NOT NULL,
    metadata_json TEXT,
    created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON user_subscriptions(user_id);
