-- ═══════════════════════════════════════════════════════
-- OutboundAI — Complete Database Schema
-- Run once in Supabase Dashboard → SQL Editor
-- Every statement uses IF NOT EXISTS — safe to re-run.
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    service TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'booked',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS call_logs (
    id TEXT PRIMARY KEY,
    phone_number TEXT NOT NULL,
    lead_name TEXT,
    outcome TEXT,
    reason TEXT,
    duration_seconds INTEGER,
    timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS error_logs (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'error',
    message TEXT NOT NULL,
    detail TEXT,
    timestamp TEXT NOT NULL
);

ALTER TABLE appointments  DISABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs     DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings      DISABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs    DISABLE ROW LEVEL SECURITY;

ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    contacts_json TEXT NOT NULL DEFAULT '[]',
    schedule_type TEXT NOT NULL DEFAULT 'once',
    schedule_time TEXT DEFAULT '09:00',
    call_delay_seconds INTEGER DEFAULT 3,
    system_prompt TEXT,
    created_at TEXT NOT NULL,
    last_run_at TEXT,
    total_dispatched INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0
);
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS calcom_booking_uid TEXT;

CREATE TABLE IF NOT EXISTS contact_memory (
    id TEXT PRIMARY KEY,
    phone_number TEXT NOT NULL,
    insight TEXT NOT NULL,
    created_at TEXT NOT NULL
);
ALTER TABLE contact_memory DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_contact_memory_phone ON contact_memory (phone_number);

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS agent_profile_id TEXT;

CREATE TABLE IF NOT EXISTS agent_profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    voice TEXT NOT NULL DEFAULT 'shreya',
    model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    system_prompt TEXT,
    enabled_tools TEXT DEFAULT '[]',
    is_default INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);
ALTER TABLE agent_profiles DISABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════
-- BoldFlow Multi-Tenancy Schema
-- Run AFTER the base schema above.
-- Adds: clients table, client_id FKs, blacklist, RLS.
-- ═══════════════════════════════════════════════════════

-- 1. Clients table (one row per BoldFlow customer)
CREATE TABLE IF NOT EXISTS clients (
    id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_user_id    uuid,               -- matches auth.users(id) in Supabase Auth
    name            text NOT NULL,
    plan            text NOT NULL DEFAULT 'basic',
    minutes_included int  NOT NULL DEFAULT 1000,
    created_at      timestamptz DEFAULT NOW()
);

-- 2. Add client_id to calls and campaigns for data isolation
ALTER TABLE call_logs  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id);
ALTER TABLE campaigns  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id);

-- 3. Blacklist — numbers the client never wants called
CREATE TABLE IF NOT EXISTS blacklist (
    id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id    uuid REFERENCES clients(id),
    phone_number text NOT NULL,
    reason       text,
    added_at     timestamptz DEFAULT NOW(),
    UNIQUE(client_id, phone_number)
);

-- 4. Indexes for fast per-client queries
CREATE INDEX IF NOT EXISTS idx_call_logs_client  ON call_logs  (client_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_client  ON campaigns  (client_id);
CREATE INDEX IF NOT EXISTS idx_blacklist_client  ON blacklist  (client_id);

-- 5. Row Level Security — clients only see their own data
--    Enable RLS on the tables we want to lock down.
ALTER TABLE call_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns  ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklist  ENABLE ROW LEVEL SECURITY;

-- Policy: a logged-in Supabase user sees only rows matching their client record
CREATE POLICY IF NOT EXISTS "client_isolation_call_logs" ON call_logs
    USING (
        client_id = (
            SELECT id FROM clients
            WHERE auth_user_id = auth.uid()
            LIMIT 1
        )
    );

CREATE POLICY IF NOT EXISTS "client_isolation_campaigns" ON campaigns
    USING (
        client_id = (
            SELECT id FROM clients
            WHERE auth_user_id = auth.uid()
            LIMIT 1
        )
    );

CREATE POLICY IF NOT EXISTS "client_isolation_blacklist" ON blacklist
    USING (
        client_id = (
            SELECT id FROM clients
            WHERE auth_user_id = auth.uid()
            LIMIT 1
        )
    );

-- 6. Service-role bypass — server.py uses SUPABASE_SERVICE_KEY which skips RLS.
--    The React frontend uses the anon key and is therefore correctly filtered.

