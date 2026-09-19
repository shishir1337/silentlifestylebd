-- The shop does not offer returns, and said so in nine places.
--
-- `delivery.returnWindowDays` drove a "7-day return" promise on the homepage,
-- the product page, the checkout, the size guide, the stores page, the social
-- share card and the announcement strip's `{return-days}` placeholder — and,
-- worst of the lot, a machine-readable `hasMerchantReturnPolicy` telling Google
-- the shop took goods back by post, free, within seven days.
--
-- None of it was true. A setting whose only job is to fill in a number for a
-- promise nobody honours is not a setting to leave in the panel for somebody to
-- wonder about later.
DELETE FROM "Setting" WHERE key = 'delivery.returnWindowDays';

-- The page stays at the same address, because the footer links to it and it is
-- in the sitemap — but it now describes what a cash-on-delivery customer
-- actually has, which is the right to open the parcel and refuse it before any
-- money changes hands. That is a stronger thing to be able to say than a
-- returns window, and it has the advantage of being true.
UPDATE "Page"
SET title = 'Checking your order',
    lead  = 'Open the parcel at your door and look at it before you pay. That is your protection, and it costs you nothing.'
WHERE slug = 'returns' AND title LIKE '%return%';

UPDATE "NavItem"
SET label = 'Checking your order'
WHERE href = '/returns';
