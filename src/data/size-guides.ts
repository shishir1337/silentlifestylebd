/**
 * Size charts.
 *
 * All measurements in inches, garment-measured flat (not body measurements) —
 * which is how Bangladeshi shoppers are used to comparing against a shirt they
 * already own. Stated explicitly on the page, because the two conventions
 * differ by several inches and guessing wrong is a return.
 */

export interface SizeChart {
  id: string;
  title: string;
  note: string;
  columns: string[];
  rows: (string | number)[][];
}

export const sizeCharts: SizeChart[] = [
  {
    id: "shirts",
    title: "Shirts, t-shirts & polos",
    note: "Measured flat across the garment, then doubled for chest.",
    columns: ["Size", "Chest", "Length", "Shoulder", "Sleeve"],
    rows: [
      ["M", 38, 27.5, 17, 24],
      ["L", 40, 28.5, 18, 24.5],
      ["XL", 42, 29.5, 19, 25],
      ["XXL", 44, 30.5, 20, 25.5],
    ],
  },
  {
    id: "panjabi",
    title: "Panjabi",
    note: "Panjabi sizes follow chest measurement in inches.",
    columns: ["Size", "Chest", "Length", "Shoulder", "Sleeve"],
    rows: [
      [38, 38, 40, 16.5, 23],
      [40, 40, 41, 17.5, 23.5],
      [42, 42, 42, 18.5, 24],
      [44, 44, 43, 19.5, 24.5],
    ],
  },
  {
    id: "pants",
    title: "Formal & gabardine pants",
    note: "Waist is the finished garment waist, not your body waist.",
    columns: ["Size", "Waist", "Hip", "Inseam", "Bottom"],
    rows: [
      [30, 30, 38, 40, 13.5],
      [32, 32, 40, 40, 14],
      [34, 34, 42, 41, 14.5],
      [36, 36, 44, 41, 15],
      [38, 38, 46, 41.5, 15.5],
    ],
  },
  {
    id: "shoes",
    title: "Shoes",
    note: "If you are between sizes, take the larger one.",
    columns: ["Size (EU)", "UK", "Foot length (cm)"],
    rows: [
      [39, 6, 24.5],
      [40, 6.5, 25],
      [41, 7.5, 25.5],
      [42, 8, 26.5],
      [43, 9, 27],
    ],
  },
  {
    id: "ladies",
    title: "Pakistani stitched three piece",
    note: "Kameez measurements. Salwar length is 38 inches on all sizes.",
    columns: ["Size", "Bust", "Waist", "Kameez length"],
    rows: [
      ["S", 36, 34, 40],
      ["M", 38, 36, 41],
      ["L", 40, 38, 42],
      ["XL", 42, 40, 42],
    ],
  },
];
