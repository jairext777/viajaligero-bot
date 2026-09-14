DO $$ BEGIN
  CREATE TYPE channel_type AS ENUM ('whatsapp', 'messenger', 'instagram');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE conversation_status AS ENUM ('active', 'escalated', 'resolved');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE message_role AS ENUM ('user', 'assistant');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS conversations (
  id                    BIGSERIAL PRIMARY KEY,
  channel               channel_type NOT NULL DEFAULT 'whatsapp',
  customer_external_id  TEXT NOT NULL,
  customer_name         TEXT,
  status                conversation_status NOT NULL DEFAULT 'active',
  escalation_reason     TEXT,
  escalation_summary    TEXT,
  escalated_at          TIMESTAMPTZ,
  resolved_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migración desde el esquema anterior de un solo canal (WhatsApp) a multi-canal.
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS channel channel_type NOT NULL DEFAULT 'whatsapp';

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'customer_wa_id') THEN
    ALTER TABLE conversations RENAME COLUMN customer_wa_id TO customer_external_id;
    ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_customer_wa_id_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_channel_external_id ON conversations (channel, customer_external_id);

CREATE TABLE IF NOT EXISTS messages (
  id                   BIGSERIAL PRIMARY KEY,
  conversation_id      BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  external_message_id  TEXT UNIQUE,
  role                 message_role NOT NULL,
  content              TEXT NOT NULL,
  raw_payload          JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages (conversation_id, created_at);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'wa_message_id') THEN
    ALTER TABLE messages RENAME COLUMN wa_message_id TO external_message_id;
  END IF;
END $$;

-- Las notificaciones de escalación siempre salen por WhatsApp al equipo de soporte,
-- sin importar por qué canal escribió el cliente — por eso estas columnas siguen siendo
-- específicas de WhatsApp (recipient_number, notification_wamid) y no cambian con multi-canal.
-- Una fila por destinatario notificado (o que resolvió).
CREATE TABLE IF NOT EXISTS escalation_events (
  id                  BIGSERIAL PRIMARY KEY,
  conversation_id     BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  event_type          TEXT NOT NULL, -- 'escalated' | 'resolved_by_team' | 'auto_resolved'
  reason              TEXT,
  summary             TEXT,
  recipient_number    TEXT,
  notification_wamid  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_escalation_events_wamid ON escalation_events (notification_wamid) WHERE notification_wamid IS NOT NULL;
