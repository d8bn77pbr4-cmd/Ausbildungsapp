import daten from '../../data/bundesland-kreise.json';
import type { Bundesland, Kreis } from './typen';

/** Abdeckungskreise je Bundesland (erzeugt mit scripts/kreise-erzeugen.ts). */
export const ALLE_KREISE = daten as Record<Bundesland, Kreis[]>;

export function kreiseFuer(bl: Bundesland): Kreis[] {
  return ALLE_KREISE[bl] ?? [];
}
