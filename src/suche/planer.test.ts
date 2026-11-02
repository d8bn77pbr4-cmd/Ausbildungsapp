import { describe, expect, test } from 'vitest';
import { angebot } from '../../tests/hilfen/angebot';
import { SpeicherCache } from './cache';
import { planeAbfragen, sucheAusfuehren, type SuchDeps } from './planer';
import type { AdapterAbfrage, AdapterSeite, Angebot, Angebotsart, Bundesland, Kreis, QuellenAdapter, QuellenName, SuchAnfrage } from './typen';

const K = (name: string, lat = 50, lon = 9): Kreis => ({ name, wo: name, lat, lon, umkreisKm: 100 });
const TEST_KREISE: Partial<Record<Bundesland, Kreis[]>> = { HE: [K('he1'), K('he2')], NW: [K('nw1'), K('nw2'), K('nw3')] };
const kreiseFuer = (bl: Bundesland) => TEST_KREISE[bl] ?? [];
const GIESSEN = { name: 'Gießen', lat: 50.5841, lon: 8.6784 };

interface FakeOptionen {
  name?: QuellenName;
  faehigkeiten?: { umkreis: boolean; bundesland: boolean };
  arten?: Angebotsart[];
  seitenGroesse?: number;
  maxSeiten?: number;
  antwort?: (a: AdapterAbfrage, signal: AbortSignal) => AdapterSeite | Promise<AdapterSeite>;
}

function fakeAdapter(o: FakeOptionen = {}) {
  const aufrufe: AdapterAbfrage[] = [];
  const adapter: QuellenAdapter = {
    name: o.name ?? 'ba-jobs',
    unterstuetzt: (art) => (o.arten ?? ['ausbildung', 'dual', 'job']).includes(art),
    abfrageKlasse: (art) => (art === 'dual' ? 'ausbildung' : art),
    faehigkeiten: o.faehigkeiten ?? { umkreis: true, bundesland: false },
    seitenGroesse: o.seitenGroesse ?? 100,
    maxSeiten: o.maxSeiten ?? 10,
    async suche(abfrage, signal) {
      aufrufe.push(abfrage);
      return (o.antwort ?? (() => ({ angebote: [], gesamt: 0 })))(abfrage, signal);
    },
  };
  return { adapter, aufrufe };
}

const studiumFaehig = { faehigkeiten: { umkreis: false, bundesland: true }, arten: ['studium'] as Angebotsart[], name: 'ba-studium' as const };

function anfrage(teil: Partial<SuchAnfrage> = {}): SuchAnfrage {
  return { was: 'Mechatroniker', arten: ['ausbildung'], orte: [], bundeslaender: [], sortierung: 'relevanz', seite: 1, ...teil };
}

function deps(adapter: QuellenAdapter[], teil: Partial<SuchDeps> = {}): SuchDeps {
  return {
    adapter,
    cache: new SpeicherCache(),
    kreiseFuer,
    geokodiere: async () => GIESSEN,
    timeoutMs: 50,
    heute: () => new Date('2026-11-02T10:00:00Z'),
    ...teil,
  };
}

const haengt = (_a: AdapterAbfrage, signal: AbortSignal) =>
  new Promise<AdapterSeite>((_, abbrechen) => signal.addEventListener('abort', () => abbrechen(signal.reason)));

describe('planeAbfragen', () => {
  const basis = { was: 'x', arten: ['ausbildung'] as Angebotsart[], kreise: [], bundeslaender: [] as Bundesland[], bundesweit: false };

  test('Bundesland bei ba-jobs → je Kreis eine Abfrage mit Bundeslandfilter', () => {
    const plan = planeAbfragen({ ...basis, bundeslaender: ['HE'] }, [fakeAdapter().adapter], kreiseFuer);
    expect(plan).toEqual(TEST_KREISE.HE!.map((kreis) => ({ adapter: 'ba-jobs', abfrage: { was: 'x', art: 'ausbildung', kreis }, filterBundeslaender: ['HE'] })));
  });

  test('Bundesland bei ba-studium → je Land eine Abfrage (Seitenlimit gilt je Land)', () => {
    const plan = planeAbfragen({ ...basis, arten: ['studium'], bundeslaender: ['HE', 'NW'] }, [fakeAdapter(studiumFaehig).adapter], kreiseFuer);
    expect(plan).toEqual([
      { adapter: 'ba-studium', abfrage: { was: 'x', art: 'studium', bundeslaender: ['HE'] }, filterBundeslaender: ['HE'] },
      { adapter: 'ba-studium', abfrage: { was: 'x', art: 'studium', bundeslaender: ['NW'] }, filterBundeslaender: ['NW'] },
    ]);
  });

  test('Ort bei ba-studium → Abfrage in den Bundesländern rund um den Ort, mit Kreisfilter', () => {
    const k = K('Gießen');
    const plan = planeAbfragen({ ...basis, arten: ['studium'], kreise: [k] }, [fakeAdapter(studiumFaehig).adapter], kreiseFuer);
    expect(plan).toEqual([
      { adapter: 'ba-studium', abfrage: { was: 'x', art: 'studium', bundeslaender: ['HE'] }, filterKreis: k },
      { adapter: 'ba-studium', abfrage: { was: 'x', art: 'studium', bundeslaender: ['NW'] }, filterKreis: k },
    ]);
  });

  test('Ausbildung + Duales Studium → eine Abfrage je Abfrageklasse der Quelle', () => {
    const plan = planeAbfragen({ ...basis, arten: ['ausbildung', 'dual', 'job'], bundesweit: true }, [fakeAdapter().adapter], kreiseFuer);
    expect(plan.map((p) => p.abfrage.art)).toEqual(['ausbildung', 'job']);
  });

  test('Ort bei ba-jobs → Abfrage mit Kreis, ohne Filter', () => {
    const k = K('Gießen');
    expect(planeAbfragen({ ...basis, kreise: [k] }, [fakeAdapter().adapter], kreiseFuer)).toEqual([{ adapter: 'ba-jobs', abfrage: { was: 'x', art: 'ausbildung', kreis: k } }]);
  });

  test('bundesweit → je Adapter und Art eine Abfrage ohne Ort und Filter', () => {
    const plan = planeAbfragen({ ...basis, arten: ['ausbildung', 'studium'], bundesweit: true }, [fakeAdapter().adapter, fakeAdapter(studiumFaehig).adapter], kreiseFuer);
    expect(plan).toEqual([
      { adapter: 'ba-jobs', abfrage: { was: 'x', art: 'ausbildung' } },
      { adapter: 'ba-studium', abfrage: { was: 'x', art: 'studium' } },
    ]);
  });

  test('Arten gehen nur an Adapter, die sie unterstützen', () => {
    const plan = planeAbfragen({ ...basis, arten: ['studium', 'job'], bundesweit: true }, [fakeAdapter().adapter, fakeAdapter(studiumFaehig).adapter], kreiseFuer);
    expect(plan.map((p) => `${p.adapter}:${p.abfrage.art}`).sort()).toEqual(['ba-jobs:job', 'ba-studium:studium']);
  });
});

describe('sucheAusfuehren', () => {
  test('blättert bis zur letzten Seite der Quelle', async () => {
    const { adapter, aufrufe } = fakeAdapter({ seitenGroesse: 2, maxSeiten: 3, antwort: () => ({ angebote: [angebot()], gesamt: 4 }) });
    const r = await sucheAusfuehren(anfrage(), deps([adapter]));
    expect(aufrufe.map((a) => a.seite)).toEqual([1, 2]);
    expect(r.hinweise).toEqual([]);
  });

  test('Seitenlimit → Hinweis zu_viele_treffer', async () => {
    const { adapter, aufrufe } = fakeAdapter({ seitenGroesse: 2, maxSeiten: 3, antwort: () => ({ angebote: [angebot()], gesamt: 100 }) });
    const r = await sucheAusfuehren(anfrage(), deps([adapter]));
    expect(aufrufe.map((a) => a.seite).sort()).toEqual([1, 2, 3]);
    expect(r.hinweise).toEqual([{ typ: 'zu_viele_treffer' }]);
  });

  test('hängende Quelle → Hinweis genau einmal, andere Treffer bleiben', async () => {
    const x = angebot({ quelle: 'adzuna' });
    const langsam = fakeAdapter({ name: 'ba-jobs', antwort: haengt });
    const schnell = fakeAdapter({ name: 'adzuna', antwort: () => ({ angebote: [x], gesamt: 1 }) });
    const r = await sucheAusfuehren(anfrage({ arten: ['ausbildung', 'dual'] }), deps([langsam.adapter, schnell.adapter]));
    expect(r.angebote.map((a) => a.id)).toEqual([x.id]);
    expect(r.hinweise).toEqual([{ typ: 'quelle_nicht_erreichbar', quelle: 'ba-jobs' }]);
  });

  test('Fehler einer Quelle + älterer Cache-Stand → Treffer aus der Notreserve mit Hinweis', async () => {
    let jetzt = new Date('2026-11-02T08:00:00Z');
    const cache = new SpeicherCache(() => jetzt);
    let kaputt = false;
    const x = angebot();
    const { adapter } = fakeAdapter({ antwort: () => { if (kaputt) throw new Error('500'); return { angebote: [x], gesamt: 1 }; } });
    await sucheAusfuehren(anfrage(), deps([adapter], { cache }));
    jetzt = new Date('2026-11-02T15:00:00Z');
    kaputt = true;
    const r = await sucheAusfuehren(anfrage(), deps([adapter], { cache }));
    expect(r.angebote.map((a) => a.id)).toEqual([x.id]);
    expect(r.hinweise).toEqual([{ typ: 'veralteter_stand', quelle: 'ba-jobs', stand: '2026-11-02T08:00:00.000Z' }]);
  });

  test('gültiger Cache-Treffer → kein zweiter Abruf', async () => {
    const { adapter, aufrufe } = fakeAdapter({ antwort: () => ({ angebote: [angebot()], gesamt: 1 }) });
    const d = deps([adapter]);
    await sucheAusfuehren(anfrage(), d);
    await sucheAusfuehren(anfrage(), d);
    expect(aufrufe).toHaveLength(1);
  });

  test('überlappende Kreise und Ort + Bundesland → jedes Angebot genau einmal', async () => {
    const x = angebot({ ort: { ort: 'Gießen', plz: '35390', bundesland: 'HE', lat: 50.58, lon: 8.68 } });
    const y = angebot({ ort: { ort: 'Köln', plz: '50667', bundesland: 'NW', lat: 50.94, lon: 6.96 } });
    const { adapter } = fakeAdapter({ antwort: () => ({ angebote: [x, y], gesamt: 2 }) });
    const r = await sucheAusfuehren(anfrage({ bundeslaender: ['HE', 'NW'], orte: [{ ort: 'Gießen', umkreisKm: 25 }] }), deps([adapter]));
    expect(r.angebote.map((a) => a.id).sort()).toEqual([x.id, y.id].sort());
    expect(r.gesamt).toBe(2);
  });

  test('Bundeslandfilter entfernt fremde und unbekannte Länder – nur bei Bundeslandsuche, ohne Kreis-Entfernung', async () => {
    const he = angebot({ entfernungKm: 70, ort: { ort: 'A', plz: '1', bundesland: 'HE' } });
    const by = angebot({ entfernungKm: 80, ort: { ort: 'B', plz: '2', bundesland: 'BY' } });
    const ohne = angebot({ ort: { ort: 'C', plz: '3' } });
    const { adapter } = fakeAdapter({ antwort: () => ({ angebote: [he, by, ohne], gesamt: 3 }) });
    const nurLand = await sucheAusfuehren(anfrage({ bundeslaender: ['HE'] }), deps([adapter]));
    expect(nurLand.angebote.map((a) => a.id)).toEqual([he.id]);
    expect(nurLand.angebote[0].entfernungKm).toBeUndefined();
    const nurOrt = await sucheAusfuehren(anfrage({ orte: [{ ort: 'Gießen', umkreisKm: 25 }] }), deps([adapter]));
    expect(nurOrt.angebote).toHaveLength(3);
  });

  test('Kreisfilter (Quelle ohne Umkreissuche) setzt Entfernung und entfernt Fernes und Ortlose', async () => {
    const nah = angebot({ quelle: 'ba-studium', art: 'studium', ort: { ort: 'Marburg', lat: 50.81, lon: 8.77 } });
    const fern = angebot({ quelle: 'ba-studium', art: 'studium', ort: { ort: 'Kassel', lat: 51.31, lon: 9.49 } });
    const ortlos = angebot({ quelle: 'ba-studium', art: 'studium', ort: { ort: '' } });
    const { adapter } = fakeAdapter({ ...studiumFaehig, antwort: () => ({ angebote: [nah, fern, ortlos], gesamt: 3 }) });
    const r = await sucheAusfuehren(anfrage({ arten: ['studium'], orte: [{ ort: 'Gießen', umkreisKm: 50 }] }), deps([adapter]));
    expect(r.angebote.map((a) => a.id)).toEqual([nah.id]);
    expect(r.angebote[0].entfernungKm).toBe(26);
  });

  test('einziger Ort unbekannt → Hinweis, leeres Ergebnis, keine stille bundesweite Suche', async () => {
    const { adapter, aufrufe } = fakeAdapter({ antwort: () => ({ angebote: [angebot()], gesamt: 1 }) });
    const r = await sucheAusfuehren(anfrage({ orte: [{ ort: 'Frankfrt', umkreisKm: 25 }] }), deps([adapter], { geokodiere: async () => null }));
    expect(r).toEqual({ angebote: [], gesamt: 0, seite: 1, seiten: 0, hinweise: [{ typ: 'ort_unbekannt', eingabe: 'Frankfrt' }] });
    expect(aufrufe).toHaveLength(0);
  });

  test('unbekannter Ort + Bundesland → Bundeslandsuche läuft trotzdem', async () => {
    const { adapter, aufrufe } = fakeAdapter({ antwort: () => ({ angebote: [], gesamt: 0 }) });
    await sucheAusfuehren(anfrage({ orte: [{ ort: 'Frankfrt', umkreisKm: 25 }], bundeslaender: ['HE'] }), deps([adapter], { geokodiere: async () => null }));
    expect(aufrufe).toHaveLength(2);
  });

  test('Ortserkennung nicht erreichbar → Quellen-Hinweis statt „unbekannt“', async () => {
    const { adapter } = fakeAdapter();
    const r = await sucheAusfuehren(anfrage({ orte: [{ ort: 'Gießen', umkreisKm: 25 }] }), deps([adapter], { geokodiere: () => Promise.reject(new Error('weg')) }));
    expect(r.hinweise).toEqual([{ typ: 'quelle_nicht_erreichbar', quelle: 'ba-jobs' }]);
  });

  test('korrigierter Ort → Hinweis ort_bereinigt; nur Groß-/Kleinschreibung → kein Hinweis', async () => {
    const { adapter } = fakeAdapter();
    const geokodiere = async (ort: string) => (ort === 'Frankfrut' ? { name: 'Frankfurt (Oder)', lat: 52.3, lon: 14.5 } : { name: 'Frankfurt am Main', lat: 50.1, lon: 8.7 });
    const r = await sucheAusfuehren(anfrage({ orte: [{ ort: 'Frankfrut', umkreisKm: 25 }, { ort: 'frankfurt am main', umkreisKm: 25 }] }), deps([adapter], { geokodiere }));
    expect(r.hinweise).toEqual([{ typ: 'ort_bereinigt', eingabe: 'Frankfrut', bereinigt: 'Frankfurt (Oder)' }]);
  });

  test('30 Treffer pro Seite', async () => {
    const viele: Angebot[] = Array.from({ length: 75 }, () => angebot());
    const { adapter } = fakeAdapter({ antwort: () => ({ angebote: viele, gesamt: 75 }) });
    const r = await sucheAusfuehren(anfrage({ seite: 2 }), deps([adapter]));
    expect(r.angebote.map((a) => a.id)).toEqual(viele.slice(30, 60).map((a) => a.id));
    expect([r.gesamt, r.seite, r.seiten]).toEqual([75, 2, 3]);
  });

  test('Filter und Sortierung werden angewendet', async () => {
    const nah = angebot({ entfernungKm: 3, verguetung: { betrag: 900, einheit: 'monat', herkunft: 'feld' } });
    const fern = angebot({ entfernungKm: 20, verguetung: { betrag: 1000, einheit: 'monat', herkunft: 'feld' } });
    const ohne = angebot({ entfernungKm: 1 });
    const { adapter } = fakeAdapter({ antwort: () => ({ angebote: [fern, ohne, nah], gesamt: 3 }) });
    const r = await sucheAusfuehren(
      anfrage({ orte: [{ ort: 'Gießen', umkreisKm: 25 }], filter: { nurMitVerguetung: true }, sortierung: 'entfernung' }),
      deps([adapter]),
    );
    expect(r.angebote.map((a) => a.id)).toEqual([nah.id, fern.id]);
  });

  test('Ausbildung + Duales Studium → ein Abruf je Seite, nicht angefragte Arten gefiltert', async () => {
    const aus = angebot({ art: 'ausbildung' });
    const dual = angebot({ art: 'dual' });
    const job = angebot({ art: 'job' });
    const { adapter, aufrufe } = fakeAdapter({ antwort: () => ({ angebote: [aus, dual, job], gesamt: 3 }) });
    const r = await sucheAusfuehren(anfrage({ arten: ['ausbildung', 'dual'] }), deps([adapter]));
    expect(aufrufe).toHaveLength(1);
    expect(r.angebote.map((a) => a.id)).toEqual([aus.id, dual.id]);
  });

  test('Seitenbudget je Suche: fair über alle Abfragen verteilt, dann Hinweis', async () => {
    const { adapter, aufrufe } = fakeAdapter({ seitenGroesse: 1, maxSeiten: 10, antwort: (a) => ({ angebote: [angebot({ quellenId: `${a.kreis?.name}-${a.seite}` })], gesamt: 10 }) });
    const r = await sucheAusfuehren(anfrage({ bundeslaender: ['HE'] }), deps([adapter], { seitenBudget: 6 }));
    expect(aufrufe).toHaveLength(6);
    expect(aufrufe.filter((a) => a.kreis?.name === 'he1').map((a) => a.seite).sort()).toEqual([1, 2, 3]);
    expect(aufrufe.filter((a) => a.kreis?.name === 'he2').map((a) => a.seite).sort()).toEqual([1, 2, 3]);
    expect(r.hinweise).toEqual([{ typ: 'zu_viele_treffer' }]);
  });

  test('hängende Quelle mit Notreserve: nur ein Timeout, danach sofort die Reserve', async () => {
    let jetzt = new Date('2026-11-02T08:00:00Z');
    const cache = new SpeicherCache(() => jetzt);
    let haengen = false;
    const { adapter } = fakeAdapter({
      seitenGroesse: 1,
      maxSeiten: 20,
      antwort: (a, signal) => (haengen ? haengt(a, signal) : { angebote: [angebot({ quellenId: `${a.kreis?.name}-${a.seite}` })], gesamt: 20 }),
    });
    const suche = anfrage({ bundeslaender: ['HE', 'NW'] });
    const erste = await sucheAusfuehren(suche, deps([adapter], { cache, seitenBudget: 1000, timeoutMs: 100 }));
    jetzt = new Date('2026-11-02T15:00:00Z');
    haengen = true;
    const start = Date.now();
    const r = await sucheAusfuehren(suche, deps([adapter], { cache, seitenBudget: 1000, timeoutMs: 100 }));
    expect(Date.now() - start).toBeLessThan(300);
    expect(r.gesamt).toBe(erste.gesamt);
    expect(r.hinweise).toEqual([{ typ: 'veralteter_stand', quelle: 'ba-jobs', stand: '2026-11-02T08:00:00.000Z' }]);
  });

  test('Abbruch durch den Browser beendet die Suche sofort', async () => {
    const { adapter } = fakeAdapter({ antwort: haengt });
    const start = Date.now();
    const r = await sucheAusfuehren(anfrage(), deps([adapter], { timeoutMs: 5000, abbruch: AbortSignal.abort() }));
    expect(Date.now() - start).toBeLessThan(500);
    expect(r.angebote).toEqual([]);
  });

  test('Ortserkennung wird gecacht', async () => {
    let anzahl = 0;
    const d = deps([fakeAdapter().adapter], { geokodiere: async () => (anzahl++, GIESSEN) });
    await sucheAusfuehren(anfrage({ orte: [{ ort: 'Gießen', umkreisKm: 25 }] }), d);
    await sucheAusfuehren(anfrage({ orte: [{ ort: ' gießen ', umkreisKm: 25 }], seite: 2 }), d);
    expect(anzahl).toBe(1);
  });

  test('BA komplett ausgefallen: Ortssuche nutzt die Notreserve (Ort und Seiten)', async () => {
    let jetzt = new Date('2026-11-02T08:00:00Z');
    const cache = new SpeicherCache(() => jetzt);
    let kaputt = false;
    const x = angebot();
    const { adapter } = fakeAdapter({ antwort: () => { if (kaputt) throw new Error('503'); return { angebote: [x], gesamt: 1 }; } });
    const geokodiere = async () => { if (kaputt) throw new Error('503'); return GIESSEN; };
    const suche = anfrage({ orte: [{ ort: 'Gießen', umkreisKm: 25 }] });
    await sucheAusfuehren(suche, deps([adapter], { cache, geokodiere }));
    jetzt = new Date('2026-11-02T15:00:00Z');
    kaputt = true;
    const r = await sucheAusfuehren(suche, deps([adapter], { cache, geokodiere }));
    expect(r.angebote.map((a) => a.id)).toEqual([x.id]);
    expect(r.hinweise).toEqual([{ typ: 'veralteter_stand', quelle: 'ba-jobs', stand: '2026-11-02T08:00:00.000Z' }]);
  });
});
