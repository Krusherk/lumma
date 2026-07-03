-- ═══════════════════════════════════════
-- Agent Invite Codes — one code per wallet
-- Fresh set of 30 codes
-- ═══════════════════════════════════════

DROP TABLE IF EXISTS agent_invite_codes CASCADE;

CREATE TABLE agent_invite_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  wallet_address TEXT,          -- NULL = unused, filled = claimed
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed 30 fresh invite codes
INSERT INTO agent_invite_codes (code) VALUES
  ('LMA-VK82-QXNW'),
  ('LMA-TP63-JYHB'),
  ('LMA-NR47-FWDZ'),
  ('LMA-GC95-MXVK'),
  ('LMA-DW38-HTPN'),
  ('LMA-BX71-KCRF'),
  ('LMA-MJ54-ZQWG'),
  ('LMA-FK29-XNYD'),
  ('LMA-QH86-BVTM'),
  ('LMA-WN43-RPJC'),
  ('LMA-YD67-KVFX'),
  ('LMA-XB92-GNHW'),
  ('LMA-HT15-DQMZ'),
  ('LMA-RC78-WKBJ'),
  ('LMA-ZP34-NFYV'),
  ('LMA-JV69-TXHM'),
  ('LMA-CK27-QGDW'),
  ('LMA-FN83-YBXR'),
  ('LMA-PG46-HCNK'),
  ('LMA-VW51-ZTJF'),
  ('LMA-KX98-DMQB'),
  ('LMA-TH25-FVRN'),
  ('LMA-QB74-WCJX'),
  ('LMA-DR16-NKHG'),
  ('LMA-NF59-XPMV'),
  ('LMA-WC32-JBTY'),
  ('LMA-GR87-KZNQ'),
  ('LMA-XJ41-HVWD'),
  ('LMA-BN76-QFCM'),
  ('LMA-HK28-YTRX');

-- Enable RLS
ALTER TABLE agent_invite_codes ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
DROP POLICY IF EXISTS invite_service ON agent_invite_codes;
CREATE POLICY invite_service ON agent_invite_codes
  FOR ALL USING (true) WITH CHECK (true);
