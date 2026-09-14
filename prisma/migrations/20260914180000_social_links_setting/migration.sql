-- Where the shop is, off the shop — as settings rather than as source.
--
-- The Facebook and Instagram links were hardcoded to `https://facebook.com`
-- and `https://instagram.com` in two files: the platforms' own front pages,
-- not the shop's. An icon promising one and delivering the other is worse
-- than no icon — and because they lived in the source, correcting them
-- needed a developer, which is the single thing this admin panel exists to
-- make unnecessary.
--
-- Seeded empty on purpose. The footer and contact page render only the links
-- that are filled in, so until the client pastes their real pages in, no
-- icon is shown at all.

INSERT INTO "Setting" (key, value, type, "group", label, "helpText", position, "updatedAt")
VALUES
  ('social.facebook', '', 'STRING', 'contact', 'Facebook page',
   'The full address of your page, e.g. https://facebook.com/yourshop. Leave blank to hide the icon.',
   14, NOW()),
  ('social.instagram', '', 'STRING', 'contact', 'Instagram profile',
   'The full address of your profile, e.g. https://instagram.com/yourshop. Leave blank to hide the icon.',
   15, NOW()),
  ('social.whatsapp', '', 'STRING', 'contact', 'WhatsApp number',
   'Leave blank to use the phone number above, which is usually the same one.',
   16, NOW())
ON CONFLICT (key) DO NOTHING;
