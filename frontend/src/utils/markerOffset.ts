
export interface PixelOffset {
  x: number;
  y: number;
}

const GRID_PRECISION = 1000; 
const PIN_SPACING_PX = 46; 


export function getPixelOffsets<T extends { coordinates: number[] }>(
  markers: T[]
): PixelOffset[] {
  const offsets: PixelOffset[] = markers.map(() => ({ x: 0, y: 0 }));
  const groups = new Map<string, number[]>();

  markers.forEach((m, i) => {
    const key = `${Math.round(m.coordinates[0] * GRID_PRECISION)},${Math.round(m.coordinates[1] * GRID_PRECISION)}`;
    const group = groups.get(key);
    if (group) group.push(i);
    else groups.set(key, [i]);
  });

  groups.forEach((indices) => {
    const n = indices.length;
    if (n <= 1) return;
    const radius = Math.max(PIN_SPACING_PX / 2, PIN_SPACING_PX / 2 / Math.sin(Math.PI / n));
    indices.forEach((idx, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      offsets[idx] = { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
    });
  });

  return offsets;
}
