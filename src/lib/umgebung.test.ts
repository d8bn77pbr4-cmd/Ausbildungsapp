import { expect, test } from 'vitest';
import { leseUmgebung } from './umgebung';

const basis = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_123456789012345',
  SUPABASE_SECRET_KEY: 'sb_secret_1234567890123456789',
  ERLAUBTE_EMAILS: ' A@b.de, c@d.de ',
};

test('liest gültige Umgebung mit Standardwerten', () => {
  const u = leseUmgebung(basis);
  expect(u.erlaubteEmails).toEqual(['a@b.de', 'c@d.de']);
  expect(u.suchCache).toBe('supabase');
  expect(u.baJobsUrl).toBe('https://rest.arbeitsagentur.de/jobboerse/jobsuche-service');
  expect(u.baStudiumUrl).toBe('https://rest.arbeitsagentur.de/infosysbub/studisu');
  expect(u.e2eOhneLogin).toBe(false);
});

test('nennt fehlende Variable verständlich', () => {
  expect(() => leseUmgebung({ ...basis, SUPABASE_SECRET_KEY: undefined })).toThrow(
    'Fehlende oder ungültige Einstellung: SUPABASE_SECRET_KEY – siehe docs/einrichtung.md',
  );
});

test('E2E_OHNE_LOGIN wirkt nie in Produktion', () => {
  expect(leseUmgebung({ ...basis, E2E_OHNE_LOGIN: '1', NODE_ENV: 'production' }).e2eOhneLogin).toBe(false);
  expect(leseUmgebung({ ...basis, E2E_OHNE_LOGIN: '1', NODE_ENV: 'development' }).e2eOhneLogin).toBe(true);
});
