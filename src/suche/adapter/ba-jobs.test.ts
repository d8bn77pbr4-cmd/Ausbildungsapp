import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { QuelleFehler } from '../fehler';
import type { Angebotsart, Kreis } from '../typen';
import { erstelleBaJobsAdapter, geokodiere, istDual } from './ba-jobs';

const lade = (name: string) => JSON.parse(readFileSync(`tests/fixtures/ba-jobs/${name}.json`, 'utf8'));
const mechatroniker = lade('mechatroniker-frankfurt-25');
const informatik = lade('informatik-angebotsart4');
const job = lade('buerokaufmann-koeln-job');
const mitVerguetung = lade('mit-verguetung');
const leer = lade('leer');
const frankfrut = lade('ort-frankfrut');

const BASIS = 'https://ba.test/jobboerse/jobsuche-service';
const signal = new AbortController().signal;
const kreis: Kreis = { name: 'Frankfurt am Main', wo: '60311', lat: 50.11, lon: 8.68, umkreisKm: 25 };

function stubFetch(daten: unknown, status = 200) {
  const aufrufe: { url: string; headers: Record<string, string> }[] = [];
  const fetch = (async (url: string, init?: RequestInit) => {
    aufrufe.push({ url: String(url), headers: (init?.headers ?? {}) as Record<string, string> });
    return new Response(JSON.stringify(daten), { status });
  }) as typeof globalThis.fetch;
  return { aufrufe, fetch };
}

/** Holt Ausbildung und duales Studium – zusammen ergibt das alle Einträge einer angebotsart=4-Antwort. */
async function alleAusbildungsArten(daten: unknown) {
  const a = erstelleBaJobsAdapter({ basisUrl: BASIS, fetch: stubFetch(daten).fetch });
  const arten: Angebotsart[] = ['ausbildung', 'dual'];
  const teile = await Promise.all(arten.map((art) => a.suche({ was: 'x', art, seite: 1 }, signal)));
  return teile.flatMap((t) => t.angebote);
}

describe('BA-Jobsuche-Adapter', () => {
  test('Fähigkeiten und Grenzen', () => {
    const a = erstelleBaJobsAdapter({ basisUrl: BASIS, fetch: stubFetch(leer).fetch });
    expect(a.name).toBe('ba-jobs');
    expect(a.faehigkeiten).toEqual({ umkreis: true, bundesland: false });
    expect([a.seitenGroesse, a.maxSeiten]).toEqual([100, 20]);
    const arten: Angebotsart[] = ['ausbildung', 'dual', 'job', 'studium'];
    expect(arten.map((art) => a.unterstuetzt(art))).toEqual([true, true, true, false]);
  });

  test('baut die Abfrage-URL inkl. Umlauten, Sonderzeichen und Header', async () => {
    const { aufrufe, fetch } = stubFetch(leer);
    await erstelleBaJobsAdapter({ basisUrl: BASIS, fetch }).suche(
      { was: 'Kauffrau für Büromanagement & C#', art: 'ausbildung', seite: 2, kreis },
      signal,
    );
    const url = new URL(aufrufe[0].url);
    expect(url.origin + url.pathname).toBe(`${BASIS}/pc/v6/jobs`);
    expect(url.searchParams.get('was')).toBe('Kauffrau für Büromanagement & C#');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ wo: '60311', umkreis: '25', angebotsart: '4', page: '2', size: '100' });
    expect(aufrufe[0].headers['X-API-Key']).toBe('jobboerse-jobsuche');
  });

  test('ohne Kreis kein wo/umkreis; Job → angebotsart 1', async () => {
    const { aufrufe, fetch } = stubFetch(leer);
    await erstelleBaJobsAdapter({ basisUrl: BASIS, fetch }).suche({ was: 'Bürokaufmann', art: 'job', seite: 1 }, signal);
    const p = new URL(aufrufe[0].url).searchParams;
    expect(p.has('wo')).toBe(false);
    expect(p.has('umkreis')).toBe(false);
    expect(p.get('angebotsart')).toBe('1');
  });

  test('mappt ein Ausbildungsangebot vollständig', async () => {
    const { angebote, gesamt } = await erstelleBaJobsAdapter({ basisUrl: BASIS, fetch: stubFetch(mechatroniker).fetch }).suche(
      { was: 'Mechatroniker', art: 'ausbildung', seite: 1, kreis },
      signal,
    );
    expect(gesamt).toBe(mechatroniker.maxErgebnisse);
    const roh = mechatroniker.ergebnisliste.find((e: { stellenangebotsTitel: string; ausbildungsart: string }) => !istDual(e.stellenangebotsTitel, e.ausbildungsart));
    const a = angebote.find((x) => x.quellenId === roh.referenznummer)!;
    expect(a.id).toBe(`ba-jobs:${roh.referenznummer}`);
    expect(a.quelle).toBe('ba-jobs');
    expect(a.art).toBe('ausbildung');
    expect(a.titel).toBe(roh.stellenangebotsTitel);
    expect(a.anbieter).toBe(roh.firma);
    expect(a.ort).toMatchObject({ plz: roh.stellenlokationen[0].adresse.plz, ort: roh.stellenlokationen[0].adresse.ort, bundesland: 'HE' });
    expect(a.ort.lat).toBe(roh.stellenlokationen[0].breite);
    expect(a.ort.lon).toBe(roh.stellenlokationen[0].laenge);
    expect(a.entfernungKm).toBe(roh.entfernung);
    expect(a.beginn).toBe(roh.eintrittszeitraum.von);
    expect(a.veroeffentlicht).toBe(roh.datumErsteVeroeffentlichung);
    expect(a.geaendert).toBe(roh.aenderungsdatum);
    expect(a.url).toMatch(/^https:\/\//);
  });

  test('ohne Kreis keine Entfernung', async () => {
    const angebote = await alleAusbildungsArten(mechatroniker);
    expect(angebote.every((a) => a.entfernungKm === undefined)).toBe(true);
  });

  test('Link-Fallback ohne externeURL', async () => {
    const angebote = await alleAusbildungsArten(mechatroniker);
    const roh = mechatroniker.ergebnisliste.find((e: { externeURL?: string }) => !e.externeURL);
    const a = angebote.find((x) => x.quellenId === roh.referenznummer)!;
    expect(a.url).toBe(`https://www.arbeitsagentur.de/jobsuche/jobdetail/${encodeURIComponent(roh.referenznummer)}`);
  });

  test('unsichere externeURL (kein http/https) wird durch den BA-Link ersetzt', async () => {
    const boese = structuredClone(mechatroniker);
    boese.ergebnisliste[0].externeURL = 'javascript:alert(1)';
    const roh = boese.ergebnisliste[0];
    const a = (await alleAusbildungsArten(boese)).find((x) => x.quellenId === roh.referenznummer)!;
    expect(a.url).toBe(`https://www.arbeitsagentur.de/jobsuche/jobdetail/${encodeURIComponent(roh.referenznummer)}`);
  });

  test('Vergütung aus dem 1. Lehrjahr, sonst undefined', async () => {
    const roh = mitVerguetung.ergebnisliste[0];
    const a = (await alleAusbildungsArten(mitVerguetung)).find((x) => x.quellenId === roh.referenznummer)!;
    expect(a.verguetung).toEqual({ betrag: roh.ausbildungsverguetungJahr1, einheit: 'monat', herkunft: 'feld' });
    const ohneRoh = mechatroniker.ergebnisliste.find((e: { verguetungsangabe: string }) => e.verguetungsangabe === 'KEINE_ANGABEN');
    const ohne = (await alleAusbildungsArten(mechatroniker)).find((x) => x.quellenId === ohneRoh.referenznummer)!;
    expect(ohne.verguetung).toBeUndefined();
  });

  test.each([
    ['Duales Studium 2027: Bachelor of Science', 'AUSBILDUNG', true],
    ['Dualer Bachelor in Informatik (m/w/d)', undefined, true],
    ['Informatik', 'DUALES_STUDIUM', true],
    ['Mechatroniker*in', 'AUSBILDUNG', false],
    ['Ausbildung Fachinformatiker – kein Studium', 'AUSBILDUNG', false],
  ])('istDual(%s, %s) = %s', (titel, art, erwartet) => {
    expect(istDual(titel, art)).toBe(erwartet);
  });

  test('liefert nur die angefragte Art', async () => {
    const gemischt = { ...mechatroniker, ergebnisliste: [...mechatroniker.ergebnisliste.slice(0, 10), ...informatik.ergebnisliste.slice(0, 10)] };
    const a = erstelleBaJobsAdapter({ basisUrl: BASIS, fetch: stubFetch(gemischt).fetch });
    const dual = (await a.suche({ was: 'Informatik', art: 'dual', seite: 1 }, signal)).angebote;
    const ausbildung = (await a.suche({ was: 'Informatik', art: 'ausbildung', seite: 1 }, signal)).angebote;
    expect(dual.length).toBeGreaterThan(0);
    expect(ausbildung.length).toBeGreaterThan(0);
    expect(dual.every((x) => x.art === 'dual')).toBe(true);
    expect(ausbildung.every((x) => x.art === 'ausbildung')).toBe(true);
    expect(dual.length + ausbildung.length).toBe(20);
  });

  test('Job-Angebote haben Art job', async () => {
    const { angebote } = await erstelleBaJobsAdapter({ basisUrl: BASIS, fetch: stubFetch(job).fetch }).suche(
      { was: 'Bürokaufmann', art: 'job', seite: 1 },
      signal,
    );
    expect(angebote.length).toBe(job.ergebnisliste.length);
    expect(angebote.every((x) => x.art === 'job')).toBe(true);
  });

  test('überspringt ungültige Einträge statt abzustürzen', async () => {
    const kaputt = structuredClone(mechatroniker);
    delete kaputt.ergebnisliste[0].referenznummer;
    kaputt.ergebnisliste[1].stellenangebotsTitel = 42;
    delete kaputt.ergebnisliste[1].hauptberuf;
    expect((await alleAusbildungsArten(kaputt)).length).toBe(mechatroniker.ergebnisliste.length - 2);
  });

  test('fehlt der Titel, wird der Hauptberuf zum Titel', async () => {
    const roh = mechatroniker.ergebnisliste.find((e: { stellenangebotsTitel: string | null }) => !e.stellenangebotsTitel);
    expect(roh).toBeDefined();
    const a = (await alleAusbildungsArten(mechatroniker)).find((x) => x.quellenId === roh.referenznummer)!;
    expect(a.titel).toBe(roh.hauptberuf);
  });

  test('fehlende Felder bleiben undefined', async () => {
    const duenn = structuredClone(mechatroniker);
    const e = duenn.ergebnisliste[0];
    delete e.eintrittszeitraum;
    delete e.stellenlokationen[0].breite;
    delete e.stellenlokationen[0].laenge;
    delete e.stellenlokationen[0].adresse.region;
    delete e.datumErsteVeroeffentlichung;
    const a = (await alleAusbildungsArten(duenn)).find((x) => x.quellenId === e.referenznummer)!;
    expect(a.beginn).toBeUndefined();
    expect(a.ort.lat).toBeUndefined();
    expect(a.ort.bundesland).toBeUndefined();
    expect(a.veroeffentlicht).toBeUndefined();
  });

  test('leere Antwort ohne ergebnisliste → keine Angebote', async () => {
    const r = await erstelleBaJobsAdapter({ basisUrl: BASIS, fetch: stubFetch(leer).fetch }).suche({ was: 'xqzvwk', art: 'ausbildung', seite: 1 }, signal);
    expect(r).toEqual({ angebote: [], gesamt: 0 });
  });

  test('wirft QuelleFehler bei HTTP 500', async () => {
    const a = erstelleBaJobsAdapter({ basisUrl: BASIS, fetch: stubFetch({}, 500).fetch });
    await expect(a.suche({ was: 'x', art: 'ausbildung', seite: 1 }, signal)).rejects.toBeInstanceOf(QuelleFehler);
  });
});

describe('geokodiere', () => {
  test('bekannter Ort → bereinigter Name und Koordinaten', async () => {
    const { aufrufe, fetch } = stubFetch(frankfrut);
    expect(await geokodiere('Frankfrut', { basisUrl: BASIS, fetch })).toEqual({ name: 'Frankfurt (Oder)', lat: 52.3177933, lon: 14.51009085 });
    expect(new URL(aufrufe[0].url).searchParams.get('wo')).toBe('Frankfrut');
  });

  test('ohne woOutput → null', async () => {
    expect(await geokodiere('Nirgendwo', { basisUrl: BASIS, fetch: stubFetch(leer).fetch })).toBeNull();
  });
});
