import { expect, test } from 'vitest';
import { entfernungKm } from './geo';

test('Entfernung Frankfurt–Gießen ≈ 52 km', () => {
  expect(entfernungKm({ lat: 50.1109, lon: 8.6821 }, { lat: 50.5841, lon: 8.6784 })).toBeCloseTo(52.6, 0);
});

test('gleicher Punkt → 0', () => {
  expect(entfernungKm({ lat: 52.52, lon: 13.4 }, { lat: 52.52, lon: 13.4 })).toBe(0);
});
