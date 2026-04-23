-- Suscripción Stripe (modo test / producción). Ejecutar tras 001_create_users.sql
CREATE SCHEMA IF NOT EXISTS ego;

CREATE TABLE IF NOT EXISTS ego.subscription (
  usuari_id INTEGER NOT NULL UNIQUE REFERENCES ego.usuari(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'inactive',
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_stripe_sub ON ego.subscription(stripe_subscription_id);
