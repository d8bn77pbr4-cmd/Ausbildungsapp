import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { QuelleFehler } from '../fehler';
import type { Angebotsart } from '../typen';
import { erstelleBaStudiumAdapter } from './ba-studium';

const lade = (name: string) => JSON.parse(readFileSync(`tests/fixtures/ba-studium/${name}.json`, 'utf8'));
const heNw = lade('informatik-he-nw');
const leer = lade('leer');

const BASIS = 'https://ba.test/infosysbub/studisu';
const signal = new AbortController().signal;

function stubFetch(daten: unknown, status = 200) {
  const aufrufe: { url: string; headers: Record<string, string> }[] = [];
  const fetch = (async (url: string, init?: RequestInit) => {
    aufrufe.push({ url: String(url), headers: (init?.headers ?? {}) as Record<string, string> });
    return new Response(JSON.stringify(daten), { status });
  }) as typeof globalThis.fetch;
  return { aufrufe, fetch };
}

describe('BA-Studiensuche-Adapter', () => {
  test('Fähigkeiten und Grenzen', () => {
    const a = erstelleBaStudiumAdapter({ basisUrl: BASIS, fetch: stubFetch(leer).fetch });
    expect(a.name).toBe('ba-studium');
    expect(a.faehigkeiten).toEqual({ umkreis: false, bundesland: true });
    expect([a.seitenGroesse, a.maxSeiten]).toEqual([20, 50]);
    const arten: Angebotsart[] = ['ausbildung', 'dual', 'job', 'studium'];
    expect(arten.map((art) => a.unterstuetzt(art))).toEqual([false, false, false, true]);
  });

  test('URL mit Bundesländern und Seite', async () => {
    const { aufrufe, fetch } = stubFetch(leer);
    await erstelleBaStudiumAdapter({ basisUrl: BASIS, fetch }).suche({ was: 'Informatik', art: 'studium', bundeslaender: ['HE', 'NW'], seite: 3 }, signal);
    const url = new URL(aufrufe[0].url);
    expect(url.origin + url.pathname).toBe(`${BASIS}/pc/v1/studienangebote`);
    expect(Object.fromEntries(url.searchParams)).toEqual({ sw: 'Informatik', re: 'HE;NW', pg: '3' });
    expect(aufrufe[0].headers['X-API-Key']).toBe('infosysbub-studisu');
  });

  test('ohne Bundesländer kein re-Parameter', async () => {
    const { aufrufe, fetch } = stubFetch(leer);
    await erstelleBaStudiumAdapter({ basisUrl: BASIS, fetch }).suche({ was: 'Wirtschaft & Recht', art: 'studium', seite: 1 }, signal);
    const p = new URL(aufrufe[0].url).searchParams;
    expect(p.has('re')).toBe(false);
    expect(p.get('sw')).toBe('Wirtschaft & Recht');
  });

  test('mappt einen Studiengang', async () => {
    const { angebote, gesamt } = await erstelleBaStudiumAdapter({ basisUrl: BASIS, fetch: stubFetch(heNw).fetch }).suche(
      { was: 'Informatik', art: 'studium', bundeslaender: ['HE', 'NW'], seite: 1 },
      signal,
    );
    expect(gesamt).toBe(heNw.maxErgebnisse);
    expect(angebote).toHaveLength(heNw.items.length);
    const roh = heNw.items[0].studienangebot;
    const a = angebote[0];
    expect(a).toMatchObject({
      id: `ba-studium:${roh.id}`,
      quelle: 'ba-studium',
      quellenId: roh.id,
      art: 'studium',
      titel: roh.studiBezeichnung,
      anbieter: roh.studienanbieter.name,
      beginn: roh.studiBeginn,
    });
    expect(a.ort).toEqual({
      plz: roh.studienort.postleitzahl,
      ort: roh.studienort.ort,
      bundesland: roh.region.Key,
      lat: roh.studienort.location.lat,
      lon: roh.studienort.location.lon,
    });
    expect(a.url).toBe(`https://web.arbeitsagentur.de/studiensuche/studienangebot/${roh.id}`);
    expect(angebote.every((x) => x.ort.bundesland === 'HE' || x.ort.bundesland === 'NW')).toBe(true);
  });

  test('unbekannte Region und fehlender Studienort bleiben undefined', async () => {
    const duenn = structuredClone(heNw);
    duenn.items[0].studienangebot.region = { Key: 'XX' };
    delete duenn.items[0].studienangebot.studienort;
    const a = (await erstelleBaStudiumAdapter({ basisUrl: BASIS, fetch: stubFetch(duenn).fetch }).suche({ was: 'x', art: 'studium', seite: 1 }, signal)).angebote[0];
    expect(a.ort).toEqual({ plz: undefined, ort: '', bundesland: undefined, lat: undefined, lon: undefined });
  });

  test('überspringt ungültige Einträge', async () => {
    const kaputt = structuredClone(heNw);
    delete kaputt.items[0].studienangebot.id;
    kaputt.items[1].studienangebot.studiBezeichnung = null;
    const r = await erstelleBaStudiumAdapter({ basisUrl: BASIS, fetch: stubFetch(kaputt).fetch }).suche({ was: 'x', art: 'studium', seite: 1 }, signal);
    expect(r.angebote).toHaveLength(heNw.items.length - 2);
  });

  test('leere Antwort → keine Angebote', async () => {
    const r = await erstelleBaStudiumAdapter({ basisUrl: BASIS, fetch: stubFetch(leer).fetch }).suche({ was: 'xqzvwk', art: 'studium', seite: 1 }, signal);
    expect(r).toEqual({ angebote: [], gesamt: 0 });
  });

  test('HTTP 500 → QuelleFehler', async () => {
    const a = erstelleBaStudiumAdapter({ basisUrl: BASIS, fetch: stubFetch({}, 500).fetch });
    await expect(a.suche({ was: 'x', art: 'studium', seite: 1 }, signal)).rejects.toBeInstanceOf(QuelleFehler);
  });
});
