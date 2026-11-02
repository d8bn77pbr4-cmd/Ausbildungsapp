import { z } from 'zod';
import { ausBaRegion } from '../bundeslaender';
import { QuelleFehler } from '../fehler';
import type { AdapterAbfrage, AdapterSeite, Angebot, Angebotsart, GeoTreffer, QuellenAdapter } from '../typen';

const API_SCHLUESSEL = 'jobboerse-jobsuche';
const DETAIL_URL = 'https://www.arbeitsagentur.de/jobsuche/jobdetail/';

const Eintrag = z.object({
  referenznummer: z.string().min(1),
  stellenangebotsTitel: z.string().min(1).optional().catch(undefined),
  hauptberuf: z.string().min(1).optional().catch(undefined),
  firma: z.string().catch(''),
  ausbildungsart: z.string().optional().catch(undefined),
  stellenlokationen: z
    .array(
      z.object({
        adresse: z.object({ plz: z.string().optional(), ort: z.string().optional(), region: z.string().optional() }).partial().optional(),
        breite: z.number().optional(),
        laenge: z.number().optional(),
      }),
    )
    .optional()
    .catch(undefined),
  entfernung: z.number().optional().catch(undefined),
  eintrittszeitraum: z.object({ von: z.string().optional() }).optional().catch(undefined),
  datumErsteVeroeffentlichung: z.string().optional().catch(undefined),
  aenderungsdatum: z.string().optional().catch(undefined),
  externeURL: z.string().optional().catch(undefined),
  ausbildungsverguetungJahr1: z.number().positive().optional().catch(undefined),
});

const Antwort = z.object({
  maxErgebnisse: z.number().catch(0),
  ergebnisliste: z.array(z.unknown()).catch([]),
  woOutput: z
    .object({ bereinigterOrt: z.string(), koordinaten: z.array(z.object({ lat: z.number(), lon: z.number() })) })
    .optional()
    .catch(undefined),
});

const DUAL_IM_TITEL = /\bdual(es|er|en)?\b.*\b(studium|bachelor|studiengang|student)/i;

/** Die BA ordnet manche dualen Studiengänge als Ausbildung ein – deshalb zusätzlich der Titel. */
export function istDual(titel: string, ausbildungsart?: string): boolean {
  return ausbildungsart === 'DUALES_STUDIUM' || DUAL_IM_TITEL.test(titel);
}

function istSichereUrl(url: string | undefined): url is string {
  return !!url && /^https?:\/\//i.test(url);
}

interface Optionen {
  basisUrl: string;
  fetch?: typeof fetch;
}

async function holeJobs(opt: Optionen, parameter: Record<string, string>, signal?: AbortSignal) {
  const url = `${opt.basisUrl}/pc/v6/jobs?${new URLSearchParams(parameter)}`;
  let antwort: Response;
  try {
    antwort = await (opt.fetch ?? fetch)(url, { headers: { 'X-API-Key': API_SCHLUESSEL }, signal });
  } catch (fehler) {
    throw new QuelleFehler('ba-jobs', `Keine Verbindung: ${(fehler as Error).message}`);
  }
  if (!antwort.ok) throw new QuelleFehler('ba-jobs', `HTTP ${antwort.status}`);
  return Antwort.parse(await antwort.json());
}

function zuAngebot(e: z.infer<typeof Eintrag>, titel: string, abfrage: AdapterAbfrage): Angebot {
  const lok = e.stellenlokationen?.[0];
  const art: Angebotsart = abfrage.art === 'job' ? 'job' : istDual(titel, e.ausbildungsart) ? 'dual' : 'ausbildung';
  return {
    id: `ba-jobs:${e.referenznummer}`,
    quelle: 'ba-jobs',
    quellenId: e.referenznummer,
    art,
    titel,
    anbieter: e.firma,
    ort: {
      plz: lok?.adresse?.plz,
      ort: lok?.adresse?.ort ?? '',
      bundesland: ausBaRegion(lok?.adresse?.region),
      lat: lok?.breite,
      lon: lok?.laenge,
    },
    entfernungKm: abfrage.kreis ? e.entfernung : undefined,
    beginn: e.eintrittszeitraum?.von,
    verguetung: e.ausbildungsverguetungJahr1 ? { betrag: e.ausbildungsverguetungJahr1, einheit: 'monat', herkunft: 'feld' } : undefined,
    veroeffentlicht: e.datumErsteVeroeffentlichung,
    geaendert: e.aenderungsdatum,
    url: istSichereUrl(e.externeURL) ? e.externeURL : DETAIL_URL + encodeURIComponent(e.referenznummer),
  };
}

export function erstelleBaJobsAdapter(opt: Optionen): QuellenAdapter {
  return {
    name: 'ba-jobs',
    unterstuetzt: (art) => art !== 'studium',
    faehigkeiten: { umkreis: true, bundesland: false },
    seitenGroesse: 100,
    maxSeiten: 10,
    async suche(abfrage, signal): Promise<AdapterSeite> {
      const parameter: Record<string, string> = {
        was: abfrage.was,
        angebotsart: abfrage.art === 'job' ? '1' : '4',
        page: String(abfrage.seite),
        size: '100',
      };
      if (abfrage.kreis) {
        parameter.wo = abfrage.kreis.wo;
        parameter.umkreis = String(abfrage.kreis.umkreisKm);
      }
      const daten = await holeJobs(opt, parameter, signal);
      let ungueltig = 0;
      const angebote: Angebot[] = [];
      for (const roh of daten.ergebnisliste) {
        const geprueft = Eintrag.safeParse(roh);
        // Manche Anzeigen haben keinen Titel – dann ist der Hauptberuf der beste Ersatz.
        const titel = geprueft.success ? (geprueft.data.stellenangebotsTitel ?? geprueft.data.hauptberuf) : undefined;
        if (!geprueft.success || !titel) {
          ungueltig++;
          continue;
        }
        const angebot = zuAngebot(geprueft.data, titel, abfrage);
        if (angebot.art === abfrage.art) angebote.push(angebot);
      }
      if (ungueltig) console.warn(`ba-jobs: ${ungueltig} ungültige Einträge übersprungen`);
      return { angebote, gesamt: daten.maxErgebnisse };
    },
  };
}

/** Nutzt die Ortserkennung der BA-Jobsuche (woOutput), um einen Ort in Koordinaten zu übersetzen. */
export async function geokodiere(ort: string, opt: Optionen & { signal?: AbortSignal }): Promise<GeoTreffer | null> {
  const daten = await holeJobs(opt, { wo: ort, angebotsart: '4', size: '1', page: '1' }, opt.signal);
  const punkt = daten.woOutput?.koordinaten[0];
  if (!daten.woOutput || !punkt) return null;
  return { name: daten.woOutput.bereinigterOrt, lat: punkt.lat, lon: punkt.lon };
}
