import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { BUNDESLAENDER } from './bundeslaender';
import { entfernungKm } from './geo';
import { ALLE_KREISE, kreiseFuer } from './kreise';
import type { Bundesland } from './typen';

const randorte: { bundesland: Bundesland; plz: string; lat: number; lon: number }[] = JSON.parse(
  readFileSync('tests/fixtures/randorte.json', 'utf8'),
);

test('jeder Randort liegt mit 5 km Reserve in einem Kreis seines Bundeslands', () => {
  expect(randorte.length).toBeGreaterThanOrEqual(80);
  for (const r of randorte) {
    const ok = kreiseFuer(r.bundesland).some((k) => entfernungKm(k, r) <= k.umkreisKm - 5);
    expect(ok, `${r.bundesland} ${r.plz}`).toBe(true);
  }
});

test('höchstens 6 Kreise je Land, Radius ≤ 100 km, alle 16 Länder', () => {
  expect(Object.keys(ALLE_KREISE).sort()).toEqual(Object.keys(BUNDESLAENDER).sort());
  for (const kreise of Object.values(ALLE_KREISE)) {
    expect(kreise.length).toBeGreaterThanOrEqual(1);
    expect(kreise.length).toBeLessThanOrEqual(6);
    for (const k of kreise) {
      expect(k.umkreisKm).toBeLessThanOrEqual(100);
      expect(k.wo).toMatch(/^\d{5}$/);
      expect(k.name.length).toBeGreaterThan(0);
    }
  }
});
