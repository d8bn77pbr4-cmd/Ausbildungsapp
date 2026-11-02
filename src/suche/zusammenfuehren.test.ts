import { expect, test } from 'vitest';
import { angebot } from '../../tests/hilfen/angebot';
import { normalisiereAnbieter, normalisiereTitel, zusammenfuehren } from './zusammenfuehren';

test('Normalisierung von Titeln', () => {
  const ziel = normalisiereTitel('Mechatroniker');
  for (const t of ['Ausbildung zum Mechatroniker*in (m/w/d)', 'Mechatroniker (w/m/d)', 'Mechatroniker:in', 'Ausbildung als Mechatroniker/-in (d/m/w)', 'MECHATRONIKER (m/w/x)'])
    expect(normalisiereTitel(t), t).toBe(ziel);
  expect(normalisiereTitel('Kauffrau für Büromanagement')).toBe('kauffrau fuer bueromanagement');
});

test('Normalisierung von Anbietern', () => {
  expect(normalisiereAnbieter('Opel Automobile GmbH')).toBe(normalisiereAnbieter('OPEL Automobile'));
  expect(normalisiereAnbieter('Müller & Co. KG')).toBe(normalisiereAnbieter('Mueller'));
  expect(normalisiereAnbieter('Stadtwerke e.V.')).toBe('stadtwerke');
});

test('gleiche id → ein Eintrag, kleinste Entfernung bleibt, Reihenfolge bleibt', () => {
  const a = angebot({ quellenId: 'x', entfernungKm: 30 });
  const b = angebot({ quellenId: 'y' });
  const r = zusammenfuehren([a, b, { ...a, entfernungKm: 12 }]);
  expect(r.map((x) => x.id)).toEqual([a.id, b.id]);
  expect(r[0].entfernungKm).toBe(12);
});

test('quellenübergreifend gleich (Anbieter + Titel + PLZ) → ein Eintrag mit weitereQuellen', () => {
  const ba = angebot({ quelle: 'ba-jobs', titel: 'Mechatroniker (m/w/d)', anbieter: 'Opel Automobile GmbH', ort: { ort: 'Rüsselsheim', plz: '65428' } });
  const az = angebot({ quelle: 'adzuna', titel: 'Ausbildung zum Mechatroniker*in', anbieter: 'OPEL Automobile', ort: { ort: 'Rüsselsheim', plz: '65428' }, url: 'https://adzuna.de/1' });
  const r = zusammenfuehren([ba, az]);
  expect(r).toHaveLength(1);
  expect(r[0].id).toBe(ba.id);
  expect(r[0].weitereQuellen).toEqual([{ quelle: 'adzuna', url: 'https://adzuna.de/1' }]);
});

test('andere PLZ → zwei Einträge', () => {
  const ort1 = { ort: 'A', plz: '11111' };
  const ort2 = { ort: 'B', plz: '22222' };
  expect(zusammenfuehren([angebot({ titel: 'X', anbieter: 'Y', ort: ort1 }), angebot({ quelle: 'adzuna', titel: 'X', anbieter: 'Y', ort: ort2 })])).toHaveLength(2);
});

test('ohne PLZ wird nicht quellenübergreifend zusammengeführt', () => {
  const ohne = { ort: 'Irgendwo' };
  expect(zusammenfuehren([angebot({ titel: 'X', anbieter: 'Y', ort: ohne }), angebot({ quelle: 'adzuna', titel: 'X', anbieter: 'Y', ort: ohne })])).toHaveLength(2);
});

test('gleiche Quelle, verschiedene id → bleiben getrennt (echte zweite Stelle möglich)', () => {
  const ort = { ort: 'A', plz: '11111' };
  expect(zusammenfuehren([angebot({ titel: 'X', anbieter: 'Y', ort }), angebot({ titel: 'X', anbieter: 'Y', ort })])).toHaveLength(2);
});
