import { BUNDESLAENDER } from './bundeslaender';
import { cacheSchluessel, type SuchCache } from './cache';
import { entfernungKm } from './geo';
import { filtere, reissverschluss, sortiere } from './ordnen';
import type {
  AdapterAbfrage, AdapterSeite, Angebot, Angebotsart, Bundesland, GeoTreffer, Hinweis, Kreis, QuellenAdapter, QuellenName, SuchAnfrage, SuchErgebnis,
} from './typen';
import { Warteschlange } from './warteschlange';
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
  /** Höchstzahl an Abrufen bei den Quellen je Suche (Standard 80). */
  seitenBudget?: number;
  /** Abbruch von außen, z. B. wenn der Browser die Anfrage beendet. */
  abbruch?: AbortSignal;
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
    // Eine Abfrage je Abfrageklasse: Ausbildung + duales Studium holt die BA mit derselben Abfrage.
    const klassen = new Map<string, Angebotsart>();
    for (const art of p.arten) if (a.unterstuetzt(art) && !klassen.has(a.abfrageKlasse(art))) klassen.set(a.abfrageKlasse(art), art);
    for (const art of klassen.values()) {
      const basis = { was: p.was, art };
      if (p.bundesweit) {
        plan.push({ adapter: a.name, abfrage: basis });
        continue;
      }
      for (const kreis of p.kreise) {
        if (a.faehigkeiten.umkreis) plan.push({ adapter: a.name, abfrage: { ...basis, kreis } });
        else {
          // Ohne Umkreissuche: je Bundesland rund um den Ort eine Abfrage (Seitenlimit gilt je Land), dann nach Entfernung filtern.
          const laender = a.faehigkeiten.bundesland ? laenderUm(kreis, kreiseFuer) : [];
          if (laender.length === 0) plan.push({ adapter: a.name, abfrage: basis, filterKreis: kreis });
          for (const bl of laender) plan.push({ adapter: a.name, abfrage: { ...basis, bundeslaender: [bl] }, filterKreis: kreis });
        }
      }
      if (p.bundeslaender.length === 0) continue;
      if (a.faehigkeiten.bundesland) {
        for (const bl of p.bundeslaender) plan.push({ adapter: a.name, abfrage: { ...basis, bundeslaender: [bl] }, filterBundeslaender: [bl] });
      } else {
        for (const bl of p.bundeslaender) {
          for (const kreis of kreiseFuer(bl)) plan.push({ adapter: a.name, abfrage: { ...basis, kreis }, filterBundeslaender: [bl] });
        }
      }
    }
  }
  return plan;
}

/** Bundesländer, deren Abdeckungskreise den Suchkreis berühren. */
function laenderUm(kreis: Kreis, kreiseFuer: (bl: Bundesland) => Kreis[]): Bundesland[] {
  return (Object.keys(BUNDESLAENDER) as Bundesland[]).filter((bl) => kreiseFuer(bl).some((k) => entfernungKm(k, kreis) <= k.umkreisKm + kreis.umkreisKm));
}

type SeitenErgebnis = { seite: AdapterSeite; veraltet?: string } | { fehler: true } | { uebersprungen: true };

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
  const budget = deps.seitenBudget ?? 80;
  const warteschlange = new Warteschlange(deps.parallel ?? 6);
  const hinweise = new HinweisSammler();

  // Fällt eine Quelle aus, warten wir nur einmal: laufende Abrufe werden abgebrochen, weitere nutzen sofort die Reserve.
  const ausgefallen = new Set<QuellenName>();
  const quellenAbbruch = new Map<QuellenName, AbortController>();
  const abbruchFuer = (q: QuellenName) => quellenAbbruch.get(q) ?? quellenAbbruch.set(q, new AbortController()).get(q)!;
  const meldeAusfall = (q: QuellenName) => {
    ausgefallen.add(q);
    abbruchFuer(q).abort();
  };
  const signalFuer = (q: QuellenName) =>
    AbortSignal.any([AbortSignal.timeout(timeoutMs), abbruchFuer(q).signal, ...(deps.abbruch ? [deps.abbruch] : [])]);

  // 1. Orte in Koordinaten übersetzen (mit Cache und Notreserve; Reihenfolge der Eingabe bleibt).
  const geo = await Promise.all(
    anfrage.orte.map(async (o) => {
      const schluessel = cacheSchluessel({ geo: o.ort.trim().toLowerCase() });
      const gespeichert = await deps.cache.lies<{ treffer: GeoTreffer | null }>(schluessel);
      if (gespeichert?.gueltig) return { o, treffer: gespeichert.wert.treffer };
      try {
        if (deps.abbruch?.aborted || ausgefallen.has('ba-jobs')) throw new Error('abgebrochen');
        const treffer = await deps.geokodiere(o.ort, signalFuer('ba-jobs'));
        await deps.cache.schreibe(schluessel, { treffer });
        return { o, treffer };
      } catch {
        meldeAusfall('ba-jobs'); // die Ortserkennung läuft über die BA-Jobsuche
        return gespeichert ? { o, treffer: gespeichert.wert.treffer } : { o, fehler: true as const };
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

  // 3. Abrufen – jede Seite über den Cache, gleiche Abrufe nur einmal, höchstens `budget` Abrufe je Suche.
  let netzAbrufe = 0;
  const laufend = new Map<string, Promise<SeitenErgebnis>>();
  const holeSeite = (adapter: QuellenAdapter, abfrage: AdapterAbfrage): Promise<SeitenErgebnis> => {
    const { art, ...rest } = abfrage;
    const schluessel = cacheSchluessel({ adapter: adapter.name, klasse: adapter.abfrageKlasse(art), ...rest });
    const vorhanden = laufend.get(schluessel);
    if (vorhanden) return vorhanden;
    const auftrag = warteschlange.einreihen(abfrage.seite, async (): Promise<SeitenErgebnis> => {
      const treffer = await deps.cache.lies<AdapterSeite>(schluessel);
      if (treffer?.gueltig) return { seite: treffer.wert };
      const reserve: SeitenErgebnis = treffer ? { seite: treffer.wert, veraltet: treffer.geschrieben } : { fehler: true };
      if (ausgefallen.has(adapter.name) || deps.abbruch?.aborted) return reserve;
      if (netzAbrufe >= budget) return { uebersprungen: true };
      netzAbrufe++;
      try {
        const seite = await adapter.suche(abfrage, signalFuer(adapter.name));
        await deps.cache.schreibe(schluessel, seite);
        return { seite };
      } catch {
        meldeAusfall(adapter.name);
        return reserve;
      }
    });
    laufend.set(schluessel, auftrag);
    return auftrag;
  };

  // Erst Seite 1 aller Abfragen, dann Folgeseiten verschränkt nach Seitennummer (fair bei knappem Budget).
  const adapterVon = (g: GeplanteAbfrage) => deps.adapter.find((a) => a.name === g.adapter)!;
  const ersteSeiten = await Promise.all(plan.map((g) => holeSeite(adapterVon(g), { ...g.abfrage, seite: 1 })));
  const seitenJe = plan.map((g, i) => {
    const erste = ersteSeiten[i];
    if (!('seite' in erste)) return 1;
    const a = adapterVon(g);
    if (erste.seite.gesamt > a.maxSeiten * a.seitenGroesse) hinweise.add({ typ: 'zu_viele_treffer' });
    return Math.min(a.maxSeiten, Math.ceil(erste.seite.gesamt / a.seitenGroesse));
  });
  const folgeAuftraege: { i: number; seite: number }[] = [];
  for (let seite = 2; seite <= Math.max(1, ...seitenJe); seite++) {
    plan.forEach((_, i) => {
      if (seitenJe[i] >= seite) folgeAuftraege.push({ i, seite });
    });
  }
  const folgeSeiten = await Promise.all(
    folgeAuftraege.map(async ({ i, seite }) => ({ i, e: await holeSeite(adapterVon(plan[i]), { ...plan[i].abfrage, seite }) })),
  );

  const teile = plan.map((g, i) => {
    const adapter = adapterVon(g);
    const ergebnisse = [ersteSeiten[i], ...folgeSeiten.filter((f) => f.i === i).map((f) => f.e)];
    const angebote: Angebot[] = [];
    for (const e of ergebnisse) {
      if ('fehler' in e) hinweise.add({ typ: 'quelle_nicht_erreichbar', quelle: adapter.name });
      else if ('uebersprungen' in e) hinweise.add({ typ: 'zu_viele_treffer' });
      else {
        if (e.veraltet) hinweise.add({ typ: 'veralteter_stand', quelle: adapter.name, stand: e.veraltet });
        angebote.push(...e.seite.angebote);
      }
    }
    return wendeFilterAn(angebote, g);
  });

  // 4. Nur gewünschte Arten, zusammenführen, filtern, sortieren, Seite ausschneiden.
  const gewuenscht = reissverschluss(teile).filter((a) => anfrage.arten.includes(a.art));
  const alle = sortiere(filtere(zusammenfuehren(gewuenscht), anfrage.filter, deps.heute?.() ?? new Date()), anfrage.sortierung);
  const start = (anfrage.seite - 1) * PRO_SEITE;
  return {
    angebote: alle.slice(start, start + PRO_SEITE),
    gesamt: alle.length,
    seite: anfrage.seite,
    seiten: Math.ceil(alle.length / PRO_SEITE),
    hinweise: hinweise.liste,
  };
}
