-- The body of the returns page, replaced with what is actually true.
--
-- The previous migration changed the title and the lead and left five
-- sections underneath still explaining how to arrange a courier pickup for
-- a return this shop does not accept. A page whose heading and body
-- disagree is worse than either alone.
--
-- Taken verbatim from `prisma/seed/pages.json`, so a fresh install and an
-- existing one end up with the same page.
UPDATE "Page" SET body = '[{"id": "at-your-door", "title": "At your door", "blocks": [{"kind": "text", "text": "Everything is cash on delivery, so nothing leaves your pocket until the parcel is in your hand. Open it in front of the delivery man and check it before you pay."}, {"kind": "bullets", "items": ["Check it is the right item, the right size and the right colour.", "Look over the stitching, the fabric and any hardware.", "If something is wrong, do not pay — hand it straight back."]}]}, {"id": "getting-the-size-right", "title": "Getting the size right", "blocks": [{"kind": "text", "text": "This is the one worth spending a minute on before you order. Every product page carries the size chart for that category — measure a garment you already own and compare."}, {"kind": "text", "text": "If you are between sizes or unsure, call us before you order and we will measure the exact piece for you."}]}, {"id": "if-something-is-wrong", "title": "If something is wrong after you have paid", "blocks": [{"kind": "text", "text": "Call us with your order number and tell us what happened. We will look at it. There is no fixed returns window and no automatic refund — but a shop that sent the wrong thing wants to know."}]}]'::jsonb WHERE slug = 'returns';
