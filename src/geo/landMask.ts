/**
 * Schematic land polygon for the map theatre (lon/lat).
 * Follows the approximate Eastern Han / Three Kingdoms China seaboard so
 * faction fills do not paint the Yellow Sea, East China Sea, or Gulf of Tonkin.
 * Borders are indicative — not a surveyed coastline.
 */

/** Closed later by clip helper. Winding: outer land, CCW. */
export const LAND_MASK_RING: [number, number][] = [
  // West / southwest interior edge
  [98.0, 22.0],
  [98.0, 42.8],
  // North frontier across 幽并
  [110.0, 42.8],
  [117.5, 42.6],
  // Liaodong peninsula (keep land, cut Yellow Sea east of it)
  [121.2, 41.2],
  [122.3, 40.2],
  [121.6, 39.2],
  // Bohai Sea notch (water)
  [120.0, 38.8],
  [118.2, 38.6],
  [117.6, 38.2],
  // Shandong north coast → tip → south
  [119.0, 37.8],
  [121.0, 37.7],
  [122.4, 37.4],
  [122.2, 36.6],
  [121.0, 36.2],
  [120.2, 35.4],
  // Jiangsu / Shanghai shelf (stay west of deep sea)
  [120.8, 34.0],
  [121.4, 32.2],
  [121.2, 31.0],
  [120.6, 29.5],
  // Zhejiang – Fujian coast
  [120.0, 28.0],
  [119.4, 26.5],
  [118.6, 25.0],
  [117.2, 23.8],
  // Guangdong / Pearl River delta (mainland only)
  [115.5, 22.8],
  [113.5, 22.2],
  [111.5, 21.6],
  // Leizhou / northern Gulf of Tonkin — keep land, exclude open gulf
  [110.0, 21.2],
  [108.8, 21.5],
  [107.5, 21.8],
  [106.0, 22.2],
  [104.0, 22.4],
  [101.5, 22.3],
  [99.0, 22.1],
  [98.0, 22.0],
]
