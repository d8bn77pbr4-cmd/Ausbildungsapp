// Stellt BA-Jobsuche und BA-Studiensuche mit aufgenommenen echten Antworten nach (für Browser-Tests).
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';

const lade = (pfad: string) => JSON.parse(readFileSync(pfad, 'utf8'));
const jobs = lade('tests/fixtures/ba-jobs/mechatroniker-frankfurt-25.json');
delete jobs.ergebnisliste[0].eintrittszeitraum; // für den Test „Beginn: nicht angegeben“
const job = lade('tests/fixtures/ba-jobs/buerokaufmann-koeln-job.json');
const leer = lade('tests/fixtures/ba-jobs/leer.json');
const studium = lade('tests/fixtures/ba-studium/informatik-he-nw.json');
const studiumLeer = lade('tests/fixtures/ba-studium/leer.json');

createServer((anfrage, antwort) => {
  const url = new URL(anfrage.url ?? '/', 'http://localhost');
  const p = url.searchParams;
  const sende = (daten: unknown) => {
    antwort.writeHead(200, { 'content-type': 'application/json' });
    antwort.end(JSON.stringify(daten));
  };
  if (url.pathname === '/gesund') return sende({ ok: true });
  if (url.pathname === '/ba-jobs/pc/v6/jobs') {
    if (p.get('was') === 'xqzvwk' || p.get('wo') === 'Frankfrt') return sende(leer);
    if (p.get('angebotsart') === '1') return sende(job);
    if (p.get('page') !== '1') return sende({ ...jobs, ergebnisliste: [] });
    return sende(jobs);
  }
  if (url.pathname === '/ba-studium/pc/v1/studienangebote') {
    if (p.get('sw') === 'xqzvwk') return sende(studiumLeer);
    if (p.get('pg') !== '1') return sende({ ...studium, items: [] });
    return sende(studium);
  }
  antwort.writeHead(404);
  antwort.end();
}).listen(4010, () => console.log('Mock-Quellen auf http://localhost:4010'));
