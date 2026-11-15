-- 1. Tabela de Utilizadores
CREATE TABLE IF NOT EXISTS tkr_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role INTEGER NOT NULL DEFAULT 3,
  mid TEXT,
  active BOOLEAN DEFAULT TRUE,
  password_hash TEXT,
  access_link TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Leads
CREATE TABLE IF NOT EXISTS tkr_leads (
  id TEXT PRIMARY KEY,
  cs TEXT,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Visitas
CREATE TABLE IF NOT EXISTS tkr_visits (
  id TEXT PRIMARY KEY,
  cs TEXT,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Controle de Sincronização
CREATE TABLE IF NOT EXISTS tkr_meta (
  key TEXT PRIMARY KEY,
  ver BIGINT DEFAULT 1
);
INSERT INTO tkr_meta (key, ver) VALUES ('sync', 1) ON CONFLICT DO NOTHING;

-- 5. Usuário Master Inicial (Altere a senha após o primeiro login!)
INSERT INTO tkr_users (id, name, email, role, active, password_hash)
VALUES ('master-1', 'Master', 'admin@tkr.com.br', 1, true, 'TKR@2026master')
ON CONFLICT (email) DO NOTHING;
