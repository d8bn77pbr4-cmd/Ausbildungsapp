import { describe, expect, test } from 'vitest';
import { angebot } from '../../tests/hilfen/angebot';
import { SuchAnfrageSchema, verarbeiteSuchAnfrage } from './anfrage';
import { SpeicherCache } from './cache';
import type { SuchDeps } from './planer';
import type { QuellenAdapter } from './typen';

const x = angebot();
const adapter: QuellenAdapter = {
  name: 'ba-jobs',
  unterstuetzt: () => true,
  abfrageKlasse: (art) => art,
  faehigkeiten: { umkreis: true, bundesland: false },
  seitenGroesse: 100,
  maxSeiten: 10,
  suche: async () => ({ angebote: [x], gesamt: 1 }),
};
const deps: SuchDeps = { adapter: [adapter], cache: new SpeicherCache(), kreiseFuer: () => [], geokodiere: async () => ({ name: 'Gießen', lat: 50.58, lon: 8.68 }) };
const gueltig = { was: 'Mechatroniker', arten: ['ausbildung'], orte: [{ ort: 'Gießen', umkreisKm: 25 }], bundeslaender: ['HE'] };

describe('verarbeiteSuchAnfrage', () => {
  test.each([
    [{ ...gueltig, was: 'M' }, 'was', 'Bitte gib mindestens 2 Zeichen ein.'],
    [{ ...gueltig, was: '   M  ' }, 'was', 'Bitte gib mindestens 2 Zeichen ein.'],
    [{ ...gueltig, was: 'x'.repeat(101) }, 'was', 'Höchstens 100 Zeichen.'],
    [{ ...gueltig, arten: [] }, 'arten', 'Wähle mindestens eine Angebotsart.'],
    [{ ...gueltig, orte: [{ ort: 'Gießen', umkreisKm: 5 }] }, 'orte.0.umkreisKm', 'Umkreis zwischen 10 und 200 km.'],
    [{ ...gueltig, orte: [{ ort: 'Gießen', umkreisKm: 250 }] }, 'orte.0.umkreisKm', 'Umkreis zwischen 10 und 200 km.'],
    [{ ...gueltig, orte: Array.from({ length: 6 }, (_, i) => ({ ort: `Ort${i}`, umkreisKm: 25 })) }, 'orte', 'Höchstens 5 Orte.'],
  ])('ungültig → 400 mit Feldmeldung (%#)', async (body, feld, meldung) => {
    const r = await verarbeiteSuchAnfrage(body, deps);
    expect(r.status).toBe(400);
    if (r.status === 400) {
      expect(r.body.fehler).toBe('ungueltige_anfrage');
      expect(r.body.felder[feld]).toBe(meldung);
    }
  });

  test.each([null, 'Text', 42, { ...gueltig, bundeslaender: ['XX'] }, { ...gueltig, arten: ['urlaub'] }])('kaputter Body → 400 statt Serverfehler (%#)', async (body) => {
    expect((await verarbeiteSuchAnfrage(body, deps)).status).toBe(400);
  });

  test('gültiger Body → 200 mit Suchergebnis', async () => {
    const r = await verarbeiteSuchAnfrage(gueltig, deps);
    expect(r.status).toBe(200);
    if (r.status === 200) {
      expect(r.body.angebote.map((a) => a.id)).toEqual([x.id]);
      expect(r.body.seite).toBe(1);
    }
  });

  test('Sonderzeichen im Suchbegriff sind erlaubt', async () => {
    expect((await verarbeiteSuchAnfrage({ ...gueltig, was: 'C# & .NET-Entwickler' }, deps)).status).toBe(200);
  });
});

describe('SuchAnfrageSchema', () => {
  test('Bundesland-Namen in „orte“ werden zu Bundesländern (auch ohne Oberfläche)', () => {
    const a = SuchAnfrageSchema.parse({ was: 'Mechatroniker', arten: ['ausbildung'], orte: [{ ort: 'Hessen', umkreisKm: 25 }, { ort: 'Gießen', umkreisKm: 25 }], bundeslaender: ['HE'] });
    expect(a.orte).toEqual([{ ort: 'Gießen', umkreisKm: 25 }]);
    expect(a.bundeslaender).toEqual(['HE']);
    const b = SuchAnfrageSchema.parse({ was: 'Mechatroniker', arten: ['ausbildung'], orte: [{ ort: 'nrw', umkreisKm: 25 }] });
    expect(b).toMatchObject({ orte: [], bundeslaender: ['NW'] });
  });

  test('Standardwerte und Aufräumen', () => {
    const a = SuchAnfrageSchema.parse({ was: '  Mechatroniker ', arten: ['ausbildung', 'ausbildung'] });
    expect(a).toEqual({ was: 'Mechatroniker', arten: ['ausbildung'], orte: [], bundeslaender: [], sortierung: 'relevanz', seite: 1 });
  });
});
