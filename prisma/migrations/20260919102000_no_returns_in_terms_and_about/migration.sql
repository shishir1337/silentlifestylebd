-- The last two places the returns promise was written down.
--
-- The terms page made it a contractual clause and the about page listed it as
-- one of four things the shop stands for. Both are rows, so the seed change
-- that fixed them for a fresh install did nothing for one already running.
--
-- Replaced inside the JSON rather than overwriting the whole body, so anything
-- else on those pages the client has since edited survives.
UPDATE "Page"
SET body = replace(
      body::text,
      'Our returns policy forms part of these terms. In short: 7 days, unused, with tags attached, subject to the exclusions listed there.',
      'Everything here is sold cash on delivery. Open the parcel and check it at your door before you pay — that is when a problem costs you nothing to refuse. There is no fixed returns window after payment; if something is wrong, call us and we will look at it.'
    )::jsonb
WHERE slug = 'terms';

UPDATE "Page"
SET body = replace(
      body::text,
      '7-day returns. Wrong size or changed your mind — send it back.',
      'Nothing to lose at the door. You open the parcel and look at it before any money changes hands.'
    )::jsonb
WHERE slug = 'about';
