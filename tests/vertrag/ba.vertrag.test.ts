// Live-Vertragstest: prüft täglich, ob die BA-Schnittstellen noch so antworten wie erwartet.
// Läuft nur mit VERTRAG=1 (npm run test:vertrag).
import { describe, expect, test } from 'vitest';
import { erstelleBaJobsAdapter, geokodiere } from '@/suche/adapter/ba-jobs';

const JOBS = 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service';
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
