import { expect, test } from 'vitest';
import { istErlaubt, zugriffsEntscheidung } from './zugriff';

test('istErlaubt ignoriert Groß-/Kleinschreibung und Leerzeichen', () => {
  expect(istErlaubt(' A@B.de ', ['a@b.de'])).toBe(true);
  expect(istErlaubt('x@y.de', ['a@b.de'])).toBe(false);
  expect(istErlaubt(null, ['a@b.de'])).toBe(false);
  expect(istErlaubt('', ['a@b.de'])).toBe(false);
});

test.each([
  ['/login', null, 'weiter'],
  ['/auth/callback', null, 'weiter'],
  ['/manifest.webmanifest', null, 'weiter'],
  ['/app-icon/192', null, 'weiter'],
  ['/apple-icon', null, 'weiter'],
  ['/icon.svg', null, 'weiter'],
  ['/heute', null, 'zum_login'],
  ['/', null, 'zum_login'],
  ['/api/suche', null, 'api_nicht_angemeldet'],
  ['/heute', 'fremd@x.de', 'nicht_freigegeben'],
  ['/api/suche', 'fremd@x.de', 'nicht_freigegeben'],
  ['/heute', 'a@b.de', 'weiter'],
  ['/loginx', null, 'zum_login'],
] as const)('%s mit %s → %s', (pfad, email, erwartet) => {
  expect(zugriffsEntscheidung({ pfad, email, erlaubteEmails: ['a@b.de'], ohneLogin: false })).toBe(erwartet);
});

test('ohneLogin lässt alles durch', () => {
  expect(zugriffsEntscheidung({ pfad: '/heute', email: null, erlaubteEmails: [], ohneLogin: true })).toBe('weiter');
});
