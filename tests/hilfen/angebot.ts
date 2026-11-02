import type { Angebot } from '@/suche/typen';

let zaehler = 0;

/** Baut ein Test-Angebot; nur die Felder angeben, auf die es ankommt. */
export function angebot(teil: Partial<Angebot> = {}): Angebot {
  zaehler++;
  const quelle = teil.quelle ?? 'ba-jobs';
  const quellenId = teil.quellenId ?? `t${zaehler}`;
  return {
    id: `${quelle}:${quellenId}`,
    quelle,
    quellenId,
    art: 'ausbildung',
    titel: `Titel ${zaehler}`,
    anbieter: `Firma ${zaehler}`,
    ort: { ort: 'Gießen', plz: '35390', bundesland: 'HE', lat: 50.58, lon: 8.68 },
    url: `https://beispiel.de/${quellenId}`,
    ...teil,
  };
}
