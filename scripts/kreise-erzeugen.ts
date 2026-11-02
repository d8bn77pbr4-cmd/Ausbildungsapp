// Erzeugt data/bundesland-kreise.json aus den hier festgelegten Kreismitten (PLZ) und Radien.
// Koordinaten kommen aus der Ortserkennung der BA. Aufruf: npx tsx scripts/kreise-erzeugen.ts
// Prüfung: src/suche/kreise.test.ts (jeder Randort eines Landes liegt in einem seiner Kreise).
import { writeFileSync } from 'node:fs';
import { geokodiere } from '../src/suche/adapter/ba-jobs';

const MITTEN: Record<string, [name: string, plz: string, umkreisKm: number][]> = {
  SH: [['Husum', '25813', 100], ['Bad Segeberg', '23795', 100]],
  HH: [['Hamburg', '20095', 30]],
  HB: [['Bremen', '28195', 65]],
  BE: [['Berlin', '10117', 30]],
  NI: [['Oldenburg', '26122', 100], ['Osnabrück', '49074', 100], ['Hannover', '30159', 100], ['Göttingen', '37073', 100], ['Uelzen', '29525', 100], ['Leer', '26789', 100]],
  NW: [['Köln', '50667', 100], ['Münster', '48143', 100], ['Bielefeld', '33602', 100], ['Siegen', '57072', 100], ['Wesel', '46483', 100]],
  HE: [['Kassel', '34117', 100], ['Fulda', '36037', 100], ['Frankfurt am Main', '60311', 100]],
  RP: [['Koblenz', '56068', 100], ['Kaiserslautern', '67655', 100], ['Trier', '54290', 100]],
  SL: [['Saarbrücken', '66111', 60]],
  BW: [['Heilbronn', '74072', 100], ['Karlsruhe', '76133', 100], ['Stuttgart', '70173', 100], ['Freiburg', '79098', 100], ['Ravensburg', '88212', 100]],
  BY: [['Würzburg', '97070', 100], ['Bayreuth', '95444', 100], ['Straubing', '94315', 100], ['Rosenheim', '83022', 100], ['Kempten', '87435', 100], ['Ingolstadt', '85049', 100]],
  TH: [['Erfurt', '99084', 100], ['Gera', '07545', 100]],
  SN: [['Dresden', '01067', 100], ['Chemnitz', '09111', 100], ['Leipzig', '04109', 100]],
  ST: [['Magdeburg', '39104', 100], ['Halle (Saale)', '06108', 100]],
  BB: [['Berlin (Umland)', '10117', 100], ['Cottbus', '03046', 100], ['Neuruppin', '16816', 100]],
  MV: [['Schwerin', '19053', 100], ['Greifswald', '17489', 100]],
};

async function main() {
  const daten: Record<string, { name: string; wo: string; lat: number; lon: number; umkreisKm: number }[]> = {};
  for (const [land, mitten] of Object.entries(MITTEN)) {
    daten[land] = [];
    for (const [name, plz, umkreisKm] of mitten) {
      const t = await geokodiere(plz, { basisUrl: 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service' });
      if (!t) throw new Error(`Kreismitte ${plz} (${name}) nicht gefunden`);
      daten[land].push({ name, wo: plz, lat: Number(t.lat.toFixed(4)), lon: Number(t.lon.toFixed(4)), umkreisKm });
    }
  }
  writeFileSync('data/bundesland-kreise.json', JSON.stringify(daten, null, 1) + '\n');
  console.log('data/bundesland-kreise.json geschrieben:', Object.values(daten).flat().length, 'Kreise');
}

main().catch((fehler) => {
  console.error(fehler);
  process.exit(1);
});
