import { expect, test } from 'vitest';
import { ausBaRegion, BUNDESLAENDER, erkenneBundesland } from './bundeslaender';

test.each([
  ['hessen', 'HE'], ['NRW', 'NW'], ['Nordrhein-Westfalen', 'NW'], ['Baden-Württemberg', 'BW'], ['baden wuerttemberg', 'BW'],
  ['BaWü', 'BW'], ['RLP', 'RP'], ['Sachsen', 'SN'], ['Sachsen-Anhalt', 'ST'], ['Meck-Pomm', 'MV'], ['Thüringen', 'TH'],
  ['  Bayern ', 'BY'], ['SH', 'SH'], ['Schleswig-Holstein', 'SH'], ['Berlin', 'BE'],
] as const)('erkennt %s als %s', (text, bl) => {
  expect(erkenneBundesland(text)).toBe(bl);
});

test.each(['Frankfurt', 'Hessisch Lichtenau', 'Hessen bei Halberstadt', '', 'Niedersachsen-Süd'])('%s ist kein Bundesland', (text) => {
  expect(erkenneBundesland(text)).toBeNull();
});

test('BA-Regionen werden auf Codes abgebildet', () => {
  expect(ausBaRegion('NORDRHEIN_WESTFALEN')).toBe('NW');
  expect(ausBaRegion('BADEN_WUERTTEMBERG')).toBe('BW');
  expect(ausBaRegion('THUERINGEN')).toBe('TH');
  expect(ausBaRegion('HESSEN')).toBe('HE');
  expect(ausBaRegion('AUSLAND')).toBeUndefined();
  expect(ausBaRegion(undefined)).toBeUndefined();
});

test('alle 16 Bundesländer haben Anzeigenamen', () => {
  expect(Object.keys(BUNDESLAENDER)).toHaveLength(16);
  expect(BUNDESLAENDER.NW).toBe('Nordrhein-Westfalen');
});
