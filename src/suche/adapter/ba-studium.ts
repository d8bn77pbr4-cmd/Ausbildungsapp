import { z } from 'zod';
import { istBundesland } from '../bundeslaender';
import { QuelleFehler } from '../fehler';
import type { AdapterSeite, Angebot, QuellenAdapter } from '../typen';

const API_SCHLUESSEL = 'infosysbub-studisu';
const DETAIL_URL = 'https://web.arbeitsagentur.de/studiensuche/studienangebot/';

const Studienangebot = z.object({
  id: z.union([z.string().min(1), z.number()]).transform(String),
  studiBezeichnung: z.string().min(1),
  studienanbieter: z.object({ name: z.string() }).partial().optional().catch(undefined),
  studiBeginn: z.string().optional().catch(undefined),
  region: z.object({ Key: z.string() }).partial().optional().catch(undefined),
  studienort: z
    .object({
      postleitzahl: z.string().nullable().optional(),
      ort: z.string().nullable().optional(),
      location: z.object({ lat: z.number(), lon: z.number() }).nullable().optional(),
    })
    .optional()
    .catch(undefined),
});

const Antwort = z.object({
  maxErgebnisse: z.number().catch(0),
  items: z.array(z.object({ studienangebot: z.unknown() }).partial()).catch([]),
});

interface Optionen {
  basisUrl: string;
  fetch?: typeof fetch;
}

function zuAngebot(s: z.infer<typeof Studienangebot>): Angebot {
  const region = s.region?.Key;
  return {
    id: `ba-studium:${s.id}`,
    quelle: 'ba-studium',
    quellenId: s.id,
    art: 'studium',
    titel: s.studiBezeichnung,
    anbieter: s.studienanbieter?.name ?? '',
    ort: {
      plz: s.studienort?.postleitzahl ?? undefined,
      ort: s.studienort?.ort ?? '',
      bundesland: region && istBundesland(region) ? region : undefined,
      lat: s.studienort?.location?.lat,
      lon: s.studienort?.location?.lon,
    },
    beginn: s.studiBeginn,
    url: DETAIL_URL + encodeURIComponent(s.id),
  };
}

export function erstelleBaStudiumAdapter(opt: Optionen): QuellenAdapter {
  return {
    name: 'ba-studium',
    unterstuetzt: (art) => art === 'studium',
    abfrageKlasse: () => 'studium',
    faehigkeiten: { umkreis: false, bundesland: true },
    seitenGroesse: 20,
    maxSeiten: 50,
    async suche(abfrage, signal): Promise<AdapterSeite> {
      const parameter: Record<string, string> = { sw: abfrage.was };
      if (abfrage.bundeslaender?.length) parameter.re = abfrage.bundeslaender.join(';');
      parameter.pg = String(abfrage.seite);
      const url = `${opt.basisUrl}/pc/v1/studienangebote?${new URLSearchParams(parameter)}`;
      let antwort: Response;
      try {
        antwort = await (opt.fetch ?? fetch)(url, { headers: { 'X-API-Key': API_SCHLUESSEL }, signal });
      } catch (fehler) {
        throw new QuelleFehler('ba-studium', `Keine Verbindung: ${(fehler as Error).message}`);
      }
      if (!antwort.ok) throw new QuelleFehler('ba-studium', `HTTP ${antwort.status}`);
      const daten = Antwort.parse(await antwort.json());
      const angebote: Angebot[] = [];
      let ungueltig = 0;
      for (const eintrag of daten.items) {
        const geprueft = Studienangebot.safeParse(eintrag.studienangebot);
        if (geprueft.success) angebote.push(zuAngebot(geprueft.data));
        else ungueltig++;
      }
      if (ungueltig) console.warn(`ba-studium: ${ungueltig} ungültige Einträge übersprungen`);
      return { angebote, gesamt: daten.maxErgebnisse };
    },
  };
}
