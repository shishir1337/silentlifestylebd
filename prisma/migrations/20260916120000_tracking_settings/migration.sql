-- Analytics and advertising tags, as settings rather than as code.
--
-- The shop is advertised on Meta, so the container ID and the pixel ID change
-- hands between the owner, an agency and whoever runs the campaigns this
-- month. Putting them in the environment would make every change a deploy;
-- putting them here makes it a form.
--
-- Empty is off. Neither script is loaded until an ID is filled in, so a shop
-- that never advertises never pays for the bytes.
INSERT INTO "Setting" (key, value, type, "group", label, "helpText", position, "updatedAt")
VALUES
  ('tracking.gtmId', '', 'STRING', 'tracking', 'Google Tag Manager container ID',
   'Looks like GTM-XXXXXXX. It is at the top of your container in Tag Manager. Clear this box to stop loading Tag Manager.',
   30, NOW()),

  ('tracking.metaPixelId', '', 'STRING', 'tracking', 'Meta (Facebook) Pixel ID',
   'The 15 or 16 digit number from Events Manager, under Data sources. Clear this box to stop loading the Pixel.',
   31, NOW()),

  -- The one that prevents double counting. See `metaEventsVia` in settings.ts.
  ('tracking.metaEventsVia', 'direct', 'STRING', 'tracking', 'Who sends the events to Meta',
   'Pick one, not both. If the shop and a Tag Manager tag both send, Meta counts every sale twice and optimises your ads against numbers that are not real.',
   32, NOW())
ON CONFLICT (key) DO NOTHING;
