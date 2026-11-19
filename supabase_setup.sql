-- TKR PRO 2.3.1 | MIGRACAO INICIAL SEGURA
-- Execute no SQL Editor do projeto correto. Nao cria senha nem usuario Master.
BEGIN;

CREATE TABLE IF NOT EXISTS public.tkr_users (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
  role INTEGER NOT NULL DEFAULT 3 CHECK (role IN (1,2,3)),
  mid TEXT REFERENCES public.tkr_users(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE, password_hash TEXT, access_link TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tkr_leads (
  id TEXT PRIMARY KEY, cs TEXT NOT NULL DEFAULT '', payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.tkr_visits (
  id TEXT PRIMARY KEY, cs TEXT NOT NULL DEFAULT '', payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.tkr_meta (
  key TEXT PRIMARY KEY, ver BIGINT NOT NULL DEFAULT 1
);

-- Compatibilidade com tabelas criadas por versões anteriores
ALTER TABLE public.tkr_users ADD COLUMN IF NOT EXISTS access_link TEXT;
ALTER TABLE public.tkr_users ADD COLUMN IF NOT EXISTS access_link_expires_at TIMESTAMPTZ;
ALTER TABLE public.tkr_users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE public.tkr_users ADD COLUMN IF NOT EXISTS mid TEXT;
ALTER TABLE public.tkr_users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.tkr_leads ADD COLUMN IF NOT EXISTS cs TEXT NOT NULL DEFAULT '';
ALTER TABLE public.tkr_leads ADD COLUMN IF NOT EXISTS payload JSONB;
ALTER TABLE public.tkr_leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.tkr_visits ADD COLUMN IF NOT EXISTS cs TEXT NOT NULL DEFAULT '';
ALTER TABLE public.tkr_visits ADD COLUMN IF NOT EXISTS payload JSONB;
ALTER TABLE public.tkr_visits ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_tkr_users_email ON public.tkr_users(email);
CREATE INDEX IF NOT EXISTS idx_tkr_users_mid ON public.tkr_users(mid);
CREATE INDEX IF NOT EXISTS idx_tkr_users_role ON public.tkr_users(role);
CREATE INDEX IF NOT EXISTS idx_tkr_leads_cs ON public.tkr_leads(cs);
CREATE INDEX IF NOT EXISTS idx_tkr_leads_updated ON public.tkr_leads(updated_at);
CREATE INDEX IF NOT EXISTS idx_tkr_visits_cs ON public.tkr_visits(cs);
CREATE INDEX IF NOT EXISTS idx_tkr_visits_updated ON public.tkr_visits(updated_at);

INSERT INTO public.tkr_meta(key,ver) VALUES ('sync',1) ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.tkr_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tkr_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tkr_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tkr_meta ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tkr_users FROM anon, authenticated;
REVOKE ALL ON public.tkr_leads FROM anon, authenticated;
REVOKE ALL ON public.tkr_visits FROM anon, authenticated;
REVOKE ALL ON public.tkr_meta FROM anon, authenticated;
GRANT ALL ON public.tkr_users TO service_role;
GRANT ALL ON public.tkr_leads TO service_role;
GRANT ALL ON public.tkr_visits TO service_role;
GRANT ALL ON public.tkr_meta TO service_role;

COMMIT;
