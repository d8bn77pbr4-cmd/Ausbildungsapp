// Ermittelt Koordinaten der Randorte jedes Bundeslands (über die Ortserkennung der BA).
// Aufruf: npx tsx scripts/randorte-geokodieren.ts
import { writeFileSync } from 'node:fs';
import { geokodiere } from '../src/suche/adapter/ba-jobs';

const RANDORTE = `
SH 25992 23769 21502 25541 | HH 22559 21039 22397 | HB 27568 28757 28309 | BE 13591 12559 13465 12309
NI 26721 27472 34346 29439 49808 37441 | NW 52062 32469 37671 57299 48599 53604 57319
HE 34385 69239 36129 65385 35066 | RP 76887 57567 54595 67547 66953 | SL 66706 66424 66693 66606
BW 97877 79539 78462 74564 77694 89073 | BY 63739 95028 94032 83471 87561 88131 96450
TH 04600 99817 96515 99734 | SN 02826 08523 04860 09484 02763 | ST 29410 06712 38855 06886 39619
BB 17291 16303 01968 15230 19348 03046 | MV 18055 18546 19258 17373 17235 23966`;

async function main() {
  const ergebnis: { bundesland: string; plz: string; lat: number; lon: number }[] = [];
  for (const gruppe of RANDORTE.split(/[|\n]/).filter((g) => g.trim())) {
    const [bundesland, ...plzListe] = gruppe.trim().split(/\s+/);
    for (const plz of plzListe) {
      const treffer = await geokodiere(plz, { basisUrl: 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service' });
      if (!treffer) throw new Error(`PLZ ${plz} (${bundesland}) nicht gefunden`);
      ergebnis.push({ bundesland, plz, lat: Number(treffer.lat.toFixed(4)), lon: Number(treffer.lon.toFixed(4)) });
    }
  }
  writeFileSync('tests/fixtures/randorte.json', JSON.stringify(ergebnis, null, 1) + '\n');
  console.log(`${ergebnis.length} Randorte gespeichert`);
}

main().catch((fehler) => {
  console.error(fehler);
  process.exit(1);
});
