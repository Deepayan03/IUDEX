-- IUDEX Document Persistence Table
-- Run this in your Supabase SQL Editor to create the documents table.

CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT UNIQUE NOT NULL,
  state_update BYTEA NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_room_id ON documents(room_id);

-- Enable Row Level Security (optional, depends on your access pattern)
-- ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
