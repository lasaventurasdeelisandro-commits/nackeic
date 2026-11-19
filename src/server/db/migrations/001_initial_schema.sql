-- DIRECTO ENTERPRISE POSTGRESQL SCHEMA v1.0.0
-- Migración inicial con integridad referencial, índices, restricciones y auditoría

-- 0. Tabla de Control de Migraciones
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(64) PRIMARY KEY,
  description TEXT NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 1. Usuarios
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL CHECK (role IN ('cliente', 'tecnico', 'profesional', 'admin')),
  status VARCHAR(32) DEFAULT 'active' CHECK (status IN ('active', 'pending_verification', 'suspended', 'banned')),
  phone VARCHAR(32),
  full_name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. Perfiles de Clientes
CREATE TABLE IF NOT EXISTS client_profiles (
  user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  default_address TEXT,
  lat DOUBLE PRECISION DEFAULT 18.4861,
  lng DOUBLE PRECISION DEFAULT -69.9312,
  total_requests INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Perfiles de Profesionales / Técnicos
CREATE TABLE IF NOT EXISTS professional_profiles (
  user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  trade VARCHAR(64) NOT NULL,
  credential_code VARCHAR(128),
  bio TEXT,
  experience_years INTEGER DEFAULT 1,
  rating DOUBLE PRECISION DEFAULT 5.0,
  review_count INTEGER DEFAULT 0,
  hourly_rate DOUBLE PRECISION DEFAULT 1500.0,
  verified BOOLEAN DEFAULT FALSE,
  lat DOUBLE PRECISION DEFAULT 18.4861,
  lng DOUBLE PRECISION DEFAULT -69.9312,
  radius_km DOUBLE PRECISION DEFAULT 10.0,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_prof_trade ON professional_profiles(trade);
CREATE INDEX IF NOT EXISTS idx_prof_coords ON professional_profiles(lat, lng);
CREATE INDEX IF NOT EXISTS idx_prof_avail ON professional_profiles(is_available);

-- 4. Categorías de Servicios
CREATE TABLE IF NOT EXISTS service_categories (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  slug VARCHAR(128) UNIQUE NOT NULL,
  icon VARCHAR(64) NOT NULL,
  description TEXT,
  base_min_price DOUBLE PRECISION DEFAULT 1000.0,
  is_active BOOLEAN DEFAULT TRUE
);

-- 5. Solicitudes de Servicios (Demanda)
CREATE TABLE IF NOT EXISTS service_requests (
  id VARCHAR(64) PRIMARY KEY,
  client_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id VARCHAR(64) REFERENCES service_categories(id),
  target_role VARCHAR(32) DEFAULT 'tecnico' CHECK (target_role IN ('tecnico', 'profesional')),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  address TEXT NOT NULL,
  lat DOUBLE PRECISION DEFAULT 18.4861,
  lng DOUBLE PRECISION DEFAULT -69.9312,
  urgency VARCHAR(32) DEFAULT 'urgente' CHECK (urgency IN ('urgente', 'express', 'programado')),
  budget_strategy VARCHAR(32) DEFAULT 'intemperie' CHECK (budget_strategy IN ('intemperie', 'minimo')),
  min_budget DOUBLE PRECISION DEFAULT 0.0,
  status VARCHAR(32) DEFAULT 'open' CHECK (status IN ('open', 'negotiating', 'in_progress', 'completed', 'cancelled')),
  accepted_offer_id VARCHAR(64),
  photos TEXT[] DEFAULT '{}',
  release_code VARCHAR(16),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_client ON service_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_requests_coords ON service_requests(lat, lng);

-- 6. Ofertas (Propuestas de Profesionales)
CREATE TABLE IF NOT EXISTS offers (
  id VARCHAR(64) PRIMARY KEY,
  request_id VARCHAR(64) NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  professional_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  price DOUBLE PRECISION NOT NULL CHECK (price >= 0),
  eta_minutes INTEGER DEFAULT 15,
  message TEXT,
  status VARCHAR(32) DEFAULT 'pending' CHECK (status IN ('pending', 'countered', 'accepted', 'rejected')),
  counter_price DOUBLE PRECISION,
  counter_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_offers_request ON offers(request_id);
CREATE INDEX IF NOT EXISTS idx_offers_pro ON offers(professional_id);

-- 7. Contrataciones Formales
CREATE TABLE IF NOT EXISTS contracts (
  id VARCHAR(64) PRIMARY KEY,
  request_id VARCHAR(64) NOT NULL REFERENCES service_requests(id) ON DELETE RESTRICT,
  client_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  professional_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  offer_id VARCHAR(64) NOT NULL REFERENCES offers(id) ON DELETE RESTRICT,
  agreed_price DOUBLE PRECISION NOT NULL CHECK (agreed_price >= 0),
  commission_rate DOUBLE PRECISION DEFAULT 0.30 CHECK (commission_rate >= 0 AND commission_rate <= 1.0),
  platform_fee DOUBLE PRECISION NOT NULL,
  professional_payout DOUBLE PRECISION NOT NULL,
  status VARCHAR(32) DEFAULT 'held_in_escrow' CHECK (status IN ('held_in_escrow', 'active_in_transit', 'in_progress', 'completed', 'disputed', 'cancelled')),
  otp_code VARCHAR(16) NOT NULL,
  otp_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_contracts_client ON contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_pro ON contracts(professional_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);

-- 8. Conversaciones
CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(64) PRIMARY KEY,
  request_id VARCHAR(64) REFERENCES service_requests(id) ON DELETE SET NULL,
  client_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations(client_id, professional_id);

-- 9. Mensajes Persistentes
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(64) PRIMARY KEY,
  conversation_id VARCHAR(64) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_type VARCHAR(32) DEFAULT 'text' CHECK (message_type IN ('text', 'counter_offer', 'deal_accepted', 'system')),
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);

-- 10. Calificaciones y Reseñas
CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(64) PRIMARY KEY,
  contract_id VARCHAR(64) NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  reviewer_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reviews_target ON reviews(target_id);

-- 11. Notificaciones
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);

-- 12. Transacciones Financieras (Doble Entrada / Ledger)
CREATE TABLE IF NOT EXISTS financial_transactions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  contract_id VARCHAR(64) REFERENCES contracts(id) ON DELETE SET NULL,
  type VARCHAR(32) NOT NULL CHECK (type IN ('deposit', 'escrow_hold', 'escrow_release', 'fee_deduction', 'payout', 'refund', 'penalty')),
  amount DOUBLE PRECISION NOT NULL,
  status VARCHAR(32) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'reversed')),
  idempotency_key VARCHAR(128) UNIQUE,
  description TEXT NOT NULL,
  reference VARCHAR(128),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_fin_user ON financial_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_fin_contract ON financial_transactions(contract_id);
CREATE INDEX IF NOT EXISTS idx_fin_idempotency ON financial_transactions(idempotency_key);

-- 13. Libro Mayor de Billetera (Saldos Auditables)
CREATE TABLE IF NOT EXISTS wallet_ledgers (
  user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance_available DOUBLE PRECISION DEFAULT 0.0 CHECK (balance_available >= 0),
  balance_locked_escrow DOUBLE PRECISION DEFAULT 0.0 CHECK (balance_locked_escrow >= 0),
  total_earned DOUBLE PRECISION DEFAULT 0.0,
  total_spent DOUBLE PRECISION DEFAULT 0.0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Operaciones de Escrow
CREATE TABLE IF NOT EXISTS escrow_holds (
  id VARCHAR(64) PRIMARY KEY,
  contract_id VARCHAR(64) NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
  amount DOUBLE PRECISION NOT NULL CHECK (amount >= 0),
  status VARCHAR(32) DEFAULT 'locked' CHECK (status IN ('locked', 'released_to_pro', 'refunded_to_client', 'disputed')),
  locked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  released_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,
  reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_escrow_contract ON escrow_holds(contract_id);

-- 15. Bitácora de Auditoría de Seguridad y Operaciones
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  actor_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(64) NOT NULL,
  target_table VARCHAR(64),
  target_id VARCHAR(64),
  ip_address VARCHAR(64),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_event ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
