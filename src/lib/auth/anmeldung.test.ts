import { expect, test, vi } from 'vitest';
import { anmeldungAnfordern, codeBestaetigen, NEUTRALE_MELDUNG } from './anmeldung';

test('ungültige Adresse → Fehlermeldung, kein Versand', async () => {
  const sende = vi.fn();
  const r = await anmeldungAnfordern('kein-at-zeichen', { erlaubteEmails: ['a@b.de'], sende });
  expect(r).toEqual({ status: 'fehler', meldung: 'Bitte gib eine gültige E-Mail-Adresse ein.' });
  expect(sende).not.toHaveBeenCalled();
});

test('fremde Adresse → keine Mail, aber dieselbe neutrale Meldung', async () => {
  const sende = vi.fn();
  const r = await anmeldungAnfordern('fremd@x.de', { erlaubteEmails: ['a@b.de'], sende });
  expect(r).toEqual({ status: 'gesendet', meldung: NEUTRALE_MELDUNG, email: 'fremd@x.de' });
  expect(sende).not.toHaveBeenCalled();
});

test('freigegebene Adresse → genau ein Versand, normalisiert', async () => {
  const sende = vi.fn().mockResolvedValue(undefined);
  const r = await anmeldungAnfordern('  A@B.de ', { erlaubteEmails: ['a@b.de'], sende });
  expect(sende).toHaveBeenCalledTimes(1);
  expect(sende).toHaveBeenCalledWith('a@b.de');
  expect(r.status).toBe('gesendet');
});

test('Versandfehler verrät nichts', async () => {
  const sende = vi.fn().mockRejectedValue(new Error('rate limit'));
  const r = await anmeldungAnfordern('a@b.de', { erlaubteEmails: ['a@b.de'], sende });
  expect(r).toEqual({ status: 'gesendet', meldung: NEUTRALE_MELDUNG, email: 'a@b.de' });
});

test('NEUTRALE_MELDUNG hat den vereinbarten Text', () => {
  expect(NEUTRALE_MELDUNG).toBe('Wenn die Adresse freigegeben ist, kommt gleich eine E-Mail mit Code und Anmeldelink.');
});

test.each([['123 456', '123456'], ['12345678', '12345678'], ['  987654 ', '987654']])('Code %s wird zu %s', async (eingabe, code) => {
  const pruefe = vi.fn().mockResolvedValue(true);
  const r = await codeBestaetigen('a@b.de', eingabe, { erlaubteEmails: ['a@b.de'], pruefe });
  expect(pruefe).toHaveBeenCalledWith('a@b.de', code);
  expect(r).toEqual({ status: 'angemeldet' });
});

test.each(['12345', 'abcdef', '12345678901'])('ungültiger Code %s → Meldung ohne Prüfung', async (eingabe) => {
  const pruefe = vi.fn();
  const r = await codeBestaetigen('a@b.de', eingabe, { erlaubteEmails: ['a@b.de'], pruefe });
  expect(r).toEqual({ status: 'fehler', meldung: 'Der Code besteht aus 6 bis 10 Ziffern.' });
  expect(pruefe).not.toHaveBeenCalled();
});

test('falscher Code oder fremde Adresse → gleiche Meldung', async () => {
  const pruefe = vi.fn().mockResolvedValue(false);
  const falsch = await codeBestaetigen('a@b.de', '123456', { erlaubteEmails: ['a@b.de'], pruefe });
  const fremd = await codeBestaetigen('fremd@x.de', '123456', { erlaubteEmails: ['a@b.de'], pruefe });
  const meldung = 'Der Code stimmt nicht oder ist abgelaufen.';
  expect(falsch).toEqual({ status: 'fehler', meldung });
  expect(fremd).toEqual({ status: 'fehler', meldung });
  expect(pruefe).toHaveBeenCalledTimes(1);
});
