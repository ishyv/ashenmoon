/**
 * Grid-coordinate key encoding. The collision grid, the custom-solid map, and
 * building occupancy all key on "x,y" strings; this is the single encoder so the
 * format can never drift between a writer and a reader.
 */
export function coordKey(x: number, y: number): string {
  return `${x},${y}`;
}
