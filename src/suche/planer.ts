import pLimit from 'p-limit';
import { cacheSchluessel, type SuchCache } from './cache';
import { entfernungKm } from './geo';
import { filtere, reissverschluss, sortiere } from './ordnen';
import type {
  AdapterAbfrage, AdapterSeite, Angebot, Angebotsart, Bundesland, GeoTreffer, Hinweis, Kreis, QuellenAdapter, QuellenName, SuchAnfrage, SuchErgebnis,
} from './typen';
import { zusammenfuehren } from './zusammenfuehren';

const PRO_SEITE = 30;

export interface GeplanteAbfrage {
  adapter: QuellenName;
  abfrage: Omit<AdapterAbfrage, 'seite'>;
  filterBundeslaender?: Bundesland[];
  filterKreis?: Kreis;
}

export interface SuchDeps {
  adapter: QuellenAdapter[];
  cache: SuchCache;
  kreiseFuer: (bl: Bundesland) => Kreis[];
  geokodiere: (ort: string, signal: AbortSignal) => Promise<GeoTreffer | null>;
  timeoutMs?: number;
  parallel?: number;
  heute?: () => Date;
}

/** Übersetzt Orte, Bundesländer und Arten in konkrete Abfragen je Quelle (Spec §6.3). */
export function planeAbfragen(
  p: { was: string; arten: Angebotsart[]; kreise: Kreis[]; bundeslaender: Bundesland[]; bundesweit: boolean },
  adapter: QuellenAdapter[],
  kreiseFuer: (bl: Bundesland) => Kreis[],
): GeplanteAbfrage[] {
  const plan: GeplanteAbfrage[] = [];
  for (const a of adapter) {
    for (const art of p.arten) {
      if (!a.unterstuetzt(art)) continue;
      const basis = { was: p.was, art };
      if (p.bundesweit) {
        plan.push({ adapter: a.name, abfrage: basis });
        continue;
      }
      for (const kreis of p.kreise) {
        plan.push(a.faehigkeiten.umkreis ? { adapter: a.name, abfrage: { ...basis, kreis } } : { adapter: a.name, abfrage: basis, filterKreis: kreis });
      }
      if (p.bundeslaender.length === 0) continue;
      if (a.faehigkeiten.bundesland) {
        plan.push({ adapter: a.name, abfrage: { ...basis, bundeslaender: p.bundeslaender }, filterBundeslaender: p.bundeslaender });
      } else {
        for (const bl of p.bundeslaender) {
          for (const kreis of kreiseFuer(bl)) plan.push({ adapter: a.name, abfrage: { ...basis, kreis }, filterBundeslaender: [bl] });
        }
      }
    }
  }
  return plan;
}

type SeitenErgebnis = { seite: AdapterSeite; veraltet?: string } | { fehler: true };

class HinweisSammler {
  readonly liste: Hinweis[] = [];

  add(h: Hinweis) {
    if (h.typ === 'veralteter_stand') {
      const vorhanden = this.liste.find((x) => x.typ === 'veralteter_stand' && x.quelle === h.quelle);
      if (vorhanden && vorhanden.typ === 'veralteter_stand') {
        if (h.stand < vorhanden.stand) vorhanden.stand = h.stand;
        return;
      }
    }
    const gleich = this.liste.some((x) => JSON.stringify(x) === JSON.stringify(h));
    if (!gleich) this.liste.push(h);
  }
}

function wendeFilterAn(angebote: Angebot[], g: GeplanteAbfrage): Angebot[] {
  let ergebnis = angebote;
  if (g.filterBundeslaender) {
    const erlaubt = new Set(g.filterBundeslaender);
    // Bei Bundesland-Kreisen ist die Entfernung zur Kreismitte für dich bedeutungslos.
    ergebnis = ergebnis.filter((a) => a.ort.bundesland && erlaubt.has(a.ort.bundesland)).map((a) => (g.abfrage.kreis ? { ...a, entfernungKm: undefined } : a));
  }
  if (g.filterKreis) {
    const k = g.filterKreis;
    ergebnis = ergebnis.flatMap((a) => {
      if (a.ort.lat === undefined || a.ort.lon === undefined) return [];
      const km = entfernungKm(k, { lat: a.ort.lat, lon: a.ort.lon });
      return km <= k.umkreisKm ? [{ ...a, entfernungKm: Math.round(km) }] : [];
    });
  }
  return ergebnis;
}

/** Führt eine Suche komplett aus: geokodieren → planen → abrufen (mit Cache) → filtern → zusammenführen → sortieren → Seite. */
export async function sucheAusfuehren(anfrage: SuchAnfrage, deps: SuchDeps): Promise<SuchErgebnis> {
  const timeoutMs = deps.timeoutMs ?? 8000;
  const begrenzt = pLimit(deps.parallel ?? 6);
  const hinweise = new HinweisSammler();

  // 1. Orte in Koordinaten übersetzen (Reihenfolge der Eingabe bleibt erhalten).
  const geo = await Promise.all(
    anfrage.orte.map(async (o) => {
      try {
        return { o, treffer: await deps.geokodiere(o.ort, AbortSignal.timeout(timeoutMs)) };
      } catch {
        return { o, fehler: true as const };
      }
    }),
  );
  const kreise: Kreis[] = [];
  for (const g of geo) {
    const eingabe = g.o.ort.trim();
    if ('fehler' in g) hinweise.add({ typ: 'quelle_nicht_erreichbar', quelle: 'ba-jobs' });
    else if (!g.treffer) hinweise.add({ typ: 'ort_unbekannt', eingabe });
    else {
      kreise.push({ name: g.treffer.name, wo: eingabe, lat: g.treffer.lat, lon: g.treffer.lon, umkreisKm: g.o.umkreisKm });
      if (g.treffer.name.toLowerCase() !== eingabe.toLowerCase()) hinweise.add({ typ: 'ort_bereinigt', eingabe, bereinigt: g.treffer.name });
    }
  }

  // 2. Planen. Ohne Ort und Bundesland: bundesweit. Unbekannte Orte führen nie zu einer bundesweiten Suche.
  const bundesweit = anfrage.orte.length === 0 && anfrage.bundeslaender.length === 0;
  const plan = planeAbfragen({ was: anfrage.was, arten: anfrage.arten, kreise, bundeslaender: anfrage.bundeslaender, bundesweit }, deps.adapter, deps.kreiseFuer);

  // 3. Abrufen – jede Seite über den Cache, gleiche Abrufe nur einmal gleichzeitig.
  const laufend = new Map<string, Promise<SeitenErgebnis>>();
  const holeSeite = (adapter: QuellenAdapter, abfrage: AdapterAbfrage): Promise<SeitenErgebnis> => {
    const schluessel = cacheSchluessel({ adapter: adapter.name, ...abfrage });
    const vorhanden = laufend.get(schluessel);
    if (vorhanden) return vorhanden;
    const auftrag = begrenzt(async (): Promise<SeitenErgebnis> => {
      const treffer = await deps.cache.lies<AdapterSeite>(schluessel);
      if (treffer?.gueltig) return { seite: treffer.wert };
      try {
        const seite = await adapter.suche(abfrage, AbortSignal.timeout(timeoutMs));
        await deps.cache.schreibe(schluessel, seite);
        return { seite };
      } catch {
        return treffer ? { seite: treffer.wert, veraltet: treffer.geschrieben } : { fehler: true };
      }
    });
    laufend.set(schluessel, auftrag);
    return auftrag;
  };

  const teile = await Promise.all(
    plan.map(async (g) => {
      const adapter = deps.adapter.find((a) => a.name === g.adapter)!;
      const ergebnisse: SeitenErgebnis[] = [await holeSeite(adapter, { ...g.abfrage, seite: 1 })];
      const erste = ergebnisse[0];
      if (!('fehler' in erste)) {
        const seiten = Math.min(adapter.maxSeiten, Math.ceil(erste.seite.gesamt / adapter.seitenGroesse));
        const rest = Array.from({ length: Math.max(0, seiten - 1) }, (_, i) => holeSeite(adapter, { ...g.abfrage, seite: i + 2 }));
        ergebnisse.push(...(await Promise.all(rest)));
        if (erste.seite.gesamt > adapter.maxSeiten * adapter.seitenGroesse) hinweise.add({ typ: 'zu_viele_treffer' });
      }
      const angebote: Angebot[] = [];
      for (const e of ergebnisse) {
        if ('fehler' in e) hinweise.add({ typ: 'quelle_nicht_erreichbar', quelle: adapter.name });
        else {
          if (e.veraltet) hinweise.add({ typ: 'veralteter_stand', quelle: adapter.name, stand: e.veraltet });
          angebote.push(...e.seite.angebote);
        }
      }
      return wendeFilterAn(angebote, g);
    }),
  );

  // 4. Zusammenführen, filtern, sortieren, Seite ausschneiden.
  const alle = sortiere(filtere(zusammenfuehren(reissverschluss(teile)), anfrage.filter, deps.heute?.() ?? new Date()), anfrage.sortierung);
  const start = (anfrage.seite - 1) * PRO_SEITE;
  return {
    angebote: alle.slice(start, start + PRO_SEITE),
    gesamt: alle.length,
    seite: anfrage.seite,
    seiten: Math.ceil(alle.length / PRO_SEITE),
    hinweise: hinweise.liste,
  };
}
