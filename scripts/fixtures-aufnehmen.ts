// Nimmt echte Antworten der BA-Schnittstellen als Testdaten auf.
// Aufruf: npx tsx scripts/fixtures-aufnehmen.ts
import { mkdirSync, writeFileSync } from 'node:fs';

const JOBS = 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs';
const STUDIUM = 'https://rest.arbeitsagentur.de/infosysbub/studisu/pc/v1/studienangebote';

async function hole(basis: string, schluessel: string, parameter: Record<string, string>) {
  const url = `${basis}?${new URLSearchParams(parameter)}`;
  const antwort = await fetch(url, { headers: { 'X-API-Key': schluessel } });
  if (!antwort.ok) throw new Error(`${antwort.status} für ${url}`);
  return antwort.json();
}

function speichere(pfad: string, daten: unknown) {
  mkdirSync(pfad.split('/').slice(0, -1).join('/'), { recursive: true });
  writeFileSync(pfad, JSON.stringify(daten, null, 1) + '\n');
  console.log('gespeichert:', pfad);
}

async function main() {
  const j = (p: Record<string, string>) => hole(JOBS, 'jobboerse-jobsuche', p);
  speichere('tests/fixtures/ba-jobs/mechatroniker-frankfurt-25.json',
    await j({ was: 'Mechatroniker', wo: 'Frankfurt', umkreis: '25', angebotsart: '4', size: '100', page: '1' }));
  speichere('tests/fixtures/ba-jobs/informatik-angebotsart4.json', await j({ was: 'Informatik', angebotsart: '4', size: '100', page: '1' }));
  speichere('tests/fixtures/ba-jobs/buerokaufmann-koeln-job.json',
    await j({ was: 'Bürokaufmann', wo: 'Köln', umkreis: '25', angebotsart: '1', size: '50', page: '1' }));
  speichere('tests/fixtures/ba-jobs/ort-frankfrut.json', await j({ wo: 'Frankfrut', angebotsart: '4', size: '1', page: '1' }));
  speichere('tests/fixtures/ba-jobs/leer.json', await j({ was: 'xqzvwk', angebotsart: '4', size: '10', page: '1' }));

  // Ein Eintrag mit echter Vergütungsangabe (falls es einen gibt)
  for (const was of ['Mechatroniker', 'Kaufmann', 'Elektroniker', 'Pflege', 'Bank', 'Verwaltung', 'Industriekaufmann']) {
    for (const page of ['1', '2', '3', '4', '5']) {
      const d = await j({ was, angebotsart: '4', size: '100', page });
      const treffer = (d.ergebnisliste ?? []).filter((e: { verguetungsangabe?: unknown }) => e.verguetungsangabe && e.verguetungsangabe !== 'KEINE_ANGABEN');
      if (treffer.length) {
        speichere('tests/fixtures/ba-jobs/mit-verguetung.json', { ...d, ergebnisliste: treffer.slice(0, 5) });
        console.log('Vergütungsformat:', JSON.stringify(treffer.slice(0, 3).map((e: { verguetungsangabe?: unknown }) => e.verguetungsangabe)));
        return studium();
      }
    }
  }
  console.log('Keine Vergütungsangabe in den Stichproben gefunden.');
  return studium();
}

async function studium() {
  const s = (p: Record<string, string>) => hole(STUDIUM, 'infosysbub-studisu', p);
  speichere('tests/fixtures/ba-studium/informatik.json', await s({ sw: 'Informatik', pg: '1' }));
  speichere('tests/fixtures/ba-studium/informatik-he-nw.json', await s({ sw: 'Informatik', re: 'HE;NW', pg: '1' }));
  speichere('tests/fixtures/ba-studium/leer.json', await s({ sw: 'xqzvwk', pg: '1' }));
}

main().catch((fehler) => {
  console.error(fehler);
  process.exit(1);
});
