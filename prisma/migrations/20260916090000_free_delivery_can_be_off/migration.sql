-- Say that zero switches the offer off.
--
-- It now does — `freeDeliveryOffered()` treats a zero threshold as "no free
-- delivery", and every surface that advertised the offer hides itself.
--
-- Before that change, zero meant the opposite. `subtotal >= 0` is true of
-- every order ever placed, so a shop owner who typed 0 hoping to end the
-- promotion would have given free delivery on every order in the country,
-- with nothing on any screen to tell them. The help text is part of the fix:
-- the number that turns it off has to be written down where it is typed.
UPDATE "Setting"
   SET "helpText" = 'Compared against the goods subtotal, not the total. Set it to 0 to switch free delivery off completely.'
 WHERE key = 'delivery.freeThreshold';
