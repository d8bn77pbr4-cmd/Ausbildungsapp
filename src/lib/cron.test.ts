import { expect, test } from 'vitest';
import { cronErlaubt } from './cron';

const GEHEIM = 'ein-langes-geheimnis-1234567890';

test('nur mit exakt passendem Bearer-Geheimnis', () => {
  expect(cronErlaubt(`Bearer ${GEHEIM}`, GEHEIM)).toBe(true);
  expect(cronErlaubt(`Bearer ${GEHEIM}x`, GEHEIM)).toBe(false);
  expect(cronErlaubt(GEHEIM, GEHEIM)).toBe(false);
  expect(cronErlaubt(null, GEHEIM)).toBe(false);
});

test('ohne oder mit zu kurzem Geheimnis ist der Cron immer gesperrt', () => {
  expect(cronErlaubt('Bearer ', undefined)).toBe(false);
  expect(cronErlaubt('Bearer undefined', undefined)).toBe(false);
  expect(cronErlaubt('Bearer kurz', 'kurz')).toBe(false);
});
