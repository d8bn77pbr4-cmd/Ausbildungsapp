import type { SupabaseClient } from '@supabase/supabase-js';
import { expect, test } from 'vitest';
import { cacheSchluessel, SpeicherCache, SupabaseCache } from './cache';

test('cacheSchluessel ist unabhängig von der Schlüsselreihenfolge und unterscheidet Inhalte', () => {
  expect(cacheSchluessel({ a: 1, b: [2, { c: 3, d: 4 }] })).toBe(cacheSchluessel({ b: [2, { d: 4, c: 3 }], a: 1 }));
  expect(cacheSchluessel({ a: 1 })).not.toBe(cacheSchluessel({ a: 2 }));
  expect(cacheSchluessel({ a: 1 })).toMatch(/^[0-9a-f]{64}$/);
});

test('SpeicherCache: gültig 6 h, danach abgelaufen, nach weiteren 7 Tagen weg', async () => {
  let jetzt = new Date('2026-11-02T08:00:00Z');
  const c = new SpeicherCache(() => jetzt);
  await c.schreibe('k', { x: 1 });
  expect(await c.lies('k')).toEqual({ wert: { x: 1 }, gueltig: true, geschrieben: '2026-11-02T08:00:00.000Z' });
  jetzt = new Date('2026-11-02T14:00:01Z');
  expect((await c.lies('k'))!.gueltig).toBe(false);
  jetzt = new Date('2026-11-09T14:00:01Z');
  expect(await c.lies('k')).toBeNull();
  expect(await c.lies('unbekannt')).toBeNull();
});

/** Minimaler Ersatz für den Supabase-Client: nur die Aufrufe, die der Cache nutzt. */
function fakeClient(o: { zeile?: unknown; fehler?: Error; wirft?: boolean }) {
  const aufrufe: string[] = [];
  const antwort = { data: o.zeile ?? null, error: o.fehler ?? null };
  const kette: Record<string, unknown> = {};
  for (const name of ['select', 'eq', 'lt', 'delete']) kette[name] = () => (aufrufe.push(name), kette);
  kette.maybeSingle = async () => {
    if (o.wirft) throw new Error('Netz weg');
    return antwort;
  };
  kette.upsert = async () => {
    aufrufe.push('upsert');
    if (o.wirft) throw new Error('Netz weg');
    return antwort;
  };
  kette.then = (fertig: (w: unknown) => void) => fertig(antwort);
  const client = { from: () => kette } as unknown as SupabaseClient;
  return { client, aufrufe };
}

test('SupabaseCache liest einen Eintrag und bewertet die Gültigkeit', async () => {
  const zeile = { ergebnis: { x: 1 }, geschrieben: '2026-11-02T08:00:00Z', ablauf: '2026-11-02T14:00:00Z' };
  const { client } = fakeClient({ zeile });
  expect(await new SupabaseCache(client, () => new Date('2026-11-02T09:00:00Z')).lies('k')).toEqual({ wert: { x: 1 }, gueltig: true, geschrieben: '2026-11-02T08:00:00.000Z' });
  expect((await new SupabaseCache(client, () => new Date('2026-11-03T09:00:00Z')).lies('k'))!.gueltig).toBe(false);
  expect(await new SupabaseCache(client, () => new Date('2026-11-10T09:00:00Z')).lies('k')).toBeNull();
});

test('SupabaseCache: Datenbankfehler brechen die Suche nicht ab', async () => {
  for (const o of [{ fehler: new Error('offline') }, { wirft: true }]) {
    const { client } = fakeClient(o);
    await expect(new SupabaseCache(client).lies('k')).resolves.toBeNull();
    await expect(new SupabaseCache(client).schreibe('k', 1)).resolves.toBeUndefined();
  }
});

test('SupabaseCache räumt beim Schreiben höchstens alle 10 Minuten auf', async () => {
  let jetzt = new Date('2026-11-02T08:00:00Z');
  const { client, aufrufe } = fakeClient({});
  const c = new SupabaseCache(client, () => jetzt);
  await c.schreibe('a', 1);
  await c.schreibe('b', 2);
  jetzt = new Date('2026-11-02T08:11:00Z');
  await c.schreibe('c', 3);
  expect(aufrufe.filter((a) => a === 'upsert')).toHaveLength(3);
  expect(aufrufe.filter((a) => a === 'delete')).toHaveLength(2);
});
