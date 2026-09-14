-- One customer, one string.
--
-- Until now a phone was stored exactly as the customer typed it, minus spaces
-- and dashes. `01755667788`, `8801755667788` and `+8801755667788` are one
-- person and three strings, and the shop compared them as strings — so a
-- once-per-customer discount code could be spent three times, and a guest who
-- typed `+880` at checkout could not find their own order on the tracker.
--
-- The application now canonicalises to the local `01XXXXXXXXX` form at every
-- boundary that identifies a customer. This brings the rows already stored
-- into the same shape, so the history matches what will be written from here.
--
-- Deliberately narrow: only values that are unambiguously a Bangladeshi mobile
-- written with its country code are touched. Anything else is left exactly as
-- it is rather than reshaped on a guess — a number nobody can explain is
-- better than a number quietly turned into somebody else's.

CREATE OR REPLACE FUNCTION slbd_canonical_phone(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN raw IS NULL THEN NULL
    -- +8801XXXXXXXXX / 8801XXXXXXXXX -> 01XXXXXXXXX
    WHEN regexp_replace(raw, '\D', '', 'g') ~ '^8801[3-9][0-9]{8}$'
      THEN '0' || substr(regexp_replace(raw, '\D', '', 'g'), 4)
    -- 1XXXXXXXXX (leading zero dropped) -> 01XXXXXXXXX
    WHEN regexp_replace(raw, '\D', '', 'g') ~ '^1[3-9][0-9]{8}$'
      THEN '0' || regexp_replace(raw, '\D', '', 'g')
    -- Already local, but with separators left in.
    WHEN regexp_replace(raw, '\D', '', 'g') ~ '^01[3-9][0-9]{8}$'
      THEN regexp_replace(raw, '\D', '', 'g')
    ELSE raw
  END;
$$;

UPDATE "Order"
   SET "customerPhone" = slbd_canonical_phone("customerPhone")
 WHERE "customerPhone" IS DISTINCT FROM slbd_canonical_phone("customerPhone");

UPDATE "Order"
   SET "altPhone" = slbd_canonical_phone("altPhone")
 WHERE "altPhone" IS DISTINCT FROM slbd_canonical_phone("altPhone");

UPDATE "User"
   SET "phone" = slbd_canonical_phone("phone")
 WHERE "phone" IS DISTINCT FROM slbd_canonical_phone("phone");

UPDATE "User"
   SET "altPhone" = slbd_canonical_phone("altPhone")
 WHERE "altPhone" IS DISTINCT FROM slbd_canonical_phone("altPhone");

UPDATE "CustomerAddress"
   SET "phone" = slbd_canonical_phone("phone")
 WHERE "phone" IS DISTINCT FROM slbd_canonical_phone("phone");

DROP FUNCTION slbd_canonical_phone(text);
