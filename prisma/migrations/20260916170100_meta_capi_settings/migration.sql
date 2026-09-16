-- The Conversions API, as two more settings.
--
-- The pixel in the browser is the half of Meta's measurement that a content
-- blocker, an iOS setting or a flaky connection can delete. The Conversions
-- API is the other half: the same Purchase, sent from this server, where none
-- of those can reach it. Both are sent, carrying the same event ID, and Meta
-- keeps whichever arrives first.
--
-- Empty token is off, like every other tag on this panel. Nothing is sent to
-- Meta from the server until somebody pastes a token in.
INSERT INTO "Setting" (key, value, type, "group", label, "helpText", position, "updatedAt")
VALUES
  ('tracking.metaCapiToken', '', 'SECRET', 'tracking', 'Meta Conversions API token',
   'Events Manager -> your dataset -> Settings -> Conversions API -> Generate access token. It is a long string starting with EAA. Keep it secret: anyone who has it can post conversions into your ad account. Leave blank to send nothing from the server.',
   33, NOW()),

  ('tracking.metaTestEventCode', '', 'STRING', 'tracking', 'Meta test event code',
   'Only while you are testing. Events Manager -> Test events shows a code like TEST12345; paste it here and your orders appear there within a minute. CLEAR IT AGAIN when you are done, or Meta keeps treating real sales as test traffic.',
   34, NOW())
ON CONFLICT (key) DO NOTHING;
