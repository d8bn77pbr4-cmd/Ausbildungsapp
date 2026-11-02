// Live-Vertragstest: prüft täglich, ob die BA-Schnittstellen noch so antworten wie erwartet.
// Läuft nur mit VERTRAG=1 (npm run test:vertrag).
import { describe, expect, test } from 'vitest';
import { erstelleBaJobsAdapter, geokodiere } from '@/suche/adapter/ba-jobs';
import { erstelleBaStudiumAdapter } from '@/suche/adapter/ba-studium';
import { entfernungKm } from '@/suche/geo';
import { ALLE_KREISE, kreiseFuer } from '@/suche/kreise';
import { SpeicherCache } from '@/suche/cache';
import { sucheAusfuehren } from '@/suche/planer';

const JOBS = 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service';
const STUDIUM = 'https://rest.arbeitsagentur.de/infosysbub/studisu';
const signal = () => AbortSignal.timeout(15_000);

describe.skipIf(!process.env.VERTRAG)('Vertrag BA-Jobsuche', () => {
  test('Mechatroniker um Frankfurt liefert gültig gemappte Angebote', { timeout: 30_000 }, async () => {
    const ort = await geokodiere('Frankfurt', { basisUrl: JOBS, signal: signal() });
    expect(ort?.name).toBe('Frankfurt am Main');
    const kreis = { name: ort!.name, wo: 'Frankfurt', lat: ort!.lat, lon: ort!.lon, umkreisKm: 25 };
    const { angebote, gesamt } = await erstelleBaJobsAdapter({ basisUrl: JOBS }).suche({ was: 'Mechatroniker', art: 'ausbildung', seite: 1, kreis }, signal());
    expect(gesamt).toBeGreaterThan(0);
    expect(angebote.length).toBeGreaterThan(0);
    for (const a of angebote) {
      expect(a.titel.length).toBeGreaterThan(0);
      expect(a.url).toMatch(/^https:\/\//);
      expect(a.entfernungKm).toBeLessThanOrEqual(30);
    }
  });

  test('BA-Link für Angebote ohne externeURL ist erreichbar', { timeout: 30_000 }, async () => {
    const { angebote } = await erstelleBaJobsAdapter({ basisUrl: JOBS }).suche({ was: 'Mechatroniker', art: 'ausbildung', seite: 1 }, signal());
    const intern = angebote.find((a) => a.url.startsWith('https://www.arbeitsagentur.de/jobsuche/jobdetail/'));
    expect(intern).toBeDefined();
    const antwort = await fetch(intern!.url, { redirect: 'follow', signal: signal() });
    expect(antwort.status).toBe(200);
  });
});

describe.skipIf(!process.env.VERTRAG)('Vertrag BA-Studiensuche', () => {
  test('Informatik in Hessen liefert nur hessische Studiengänge', { timeout: 30_000 }, async () => {
    const { angebote, gesamt } = await erstelleBaStudiumAdapter({ basisUrl: STUDIUM }).suche({ was: 'Informatik', art: 'studium', bundeslaender: ['HE'], seite: 1 }, signal());
    expect(gesamt).toBeGreaterThan(0);
    expect(angebote.length).toBeGreaterThan(0);
    expect(angebote.every((a) => a.ort.bundesland === 'HE')).toBe(true);
    expect(angebote.every((a) => typeof a.ort.lat === 'number')).toBe(true);
  });
});

describe.skipIf(!process.env.VERTRAG)('Vertrag Kreismitten', () => {
  test('jede Kreismitte wird von der BA noch an derselben Stelle erkannt (≤ 10 km)', { timeout: 180_000 }, async () => {
    for (const [land, kreise] of Object.entries(ALLE_KREISE)) {
      for (const k of kreise) {
        const t = await geokodiere(k.wo, { basisUrl: JOBS, signal: signal() });
        expect(t, `${land} ${k.name}`).not.toBeNull();
        expect(entfernungKm(k, t!), `${land} ${k.name}`).toBeLessThanOrEqual(10);
      }
    }
  });
});

describe.skipIf(!process.env.VERTRAG)('Vertrag Referenzsuche (Erfolgskriterium 1)', () => {
  test('„Mechatroniker, Ausbildung, Hessen + NRW“ in < 5 s, nur HE/NW', { timeout: 60_000 }, async () => {
    const start = Date.now();
    const r = await sucheAusfuehren(
      { was: 'Mechatroniker', arten: ['ausbildung'], orte: [], bundeslaender: ['HE', 'NW'], sortierung: 'relevanz', seite: 1 },
      {
        adapter: [erstelleBaJobsAdapter({ basisUrl: JOBS }), erstelleBaStudiumAdapter({ basisUrl: STUDIUM })],
        cache: new SpeicherCache(),
        kreiseFuer,
        geokodiere: (ort, s) => geokodiere(ort, { basisUrl: JOBS, signal: s }),
      },
    );
    const dauer = Date.now() - start;
    console.log(`Referenzsuche: ${r.gesamt} Treffer in ${dauer} ms, Hinweise: ${JSON.stringify(r.hinweise)}`);
    expect(r.gesamt).toBeGreaterThan(0);
    expect(r.angebote.every((a) => a.ort.bundesland === 'HE' || a.ort.bundesland === 'NW')).toBe(true);
    expect(dauer).toBeLessThan(5000);
  });
});
