-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "sizeChartId" TEXT;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_sizeChartId_fkey" FOREIGN KEY ("sizeChartId") REFERENCES "SizeChart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Point each category at the chart its products are actually measured by.
--
-- The column would otherwise ship empty, which means every product page loses
-- its size guide until somebody sets twelve dropdowns by hand — and the guide
-- is the cheapest return-prevention the shop has.
--
-- The mapping is not a guess: these charts were written for these categories.
-- "Shirts, t-shirts & polos" names three of them in its own title.
UPDATE "Category" c SET "sizeChartId" = s.id
FROM "SizeChart" s
WHERE (c.slug IN ('formal-shirt', 't-shirt', 'polo')     AND s.slug = 'shirts')
   OR (c.slug = 'panjabi'                                AND s.slug = 'panjabi')
   OR (c.slug = 'pants'                                  AND s.slug = 'pants')
   OR (c.slug = 'shoes'                                  AND s.slug = 'shoes')
   OR (c.slug = 'pakistani-stitched'                     AND s.slug = 'ladies');

-- Deliberately left null: watches, wallets, purses and bracelets come in one
-- size, and belts are sold by waist number with no chart written for them yet.
-- A "Size guide" that opens an empty table is worse than no link.
