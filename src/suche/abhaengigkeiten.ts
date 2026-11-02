import type { Umgebung } from '@/lib/umgebung';
import { erstelleBaJobsAdapter, geokodiere } from './adapter/ba-jobs';
import { erstelleBaStudiumAdapter } from './adapter/ba-studium';
import { erstelleSuchCache } from './cache-erstellen';
import { kreiseFuer } from './kreise';
import type { SuchDeps } from './planer';

/** Baut die echten Abhängigkeiten der Suche aus den Einstellungen. */
export function erstelleSuchDeps(u: Umgebung): SuchDeps {
  return {
    adapter: [erstelleBaJobsAdapter({ basisUrl: u.baJobsUrl }), erstelleBaStudiumAdapter({ basisUrl: u.baStudiumUrl })],
    cache: erstelleSuchCache(u),
    kreiseFuer,
    geokodiere: (ort, signal) => geokodiere(ort, { basisUrl: u.baJobsUrl, signal }),
  };
}
