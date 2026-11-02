import { z } from 'zod';
import { istErlaubt } from './zugriff';

export const NEUTRALE_MELDUNG = 'Wenn die Adresse freigegeben ist, kommt gleich eine E-Mail mit Code und Anmeldelink.';
const CODE_FALSCH = 'Der Code stimmt nicht oder ist abgelaufen.';

export type AnmeldeZustand =
  | { status: 'start' }
  | { status: 'gesendet'; meldung: string; email: string }
  | { status: 'angemeldet' }
  | { status: 'fehler'; meldung: string };

/**
 * Fordert Code + Link an. Fremde Adressen lösen keine Mail aus und bekommen dieselbe Meldung,
 * damit niemand herausfinden kann, welche Adressen freigegeben sind.
 */
export async function anmeldungAnfordern(
  eingabe: string,
  deps: { erlaubteEmails: string[]; sende: (email: string) => Promise<void> },
): Promise<AnmeldeZustand> {
  const email = eingabe.trim().toLowerCase();
  if (!z.email().safeParse(email).success) {
    return { status: 'fehler', meldung: 'Bitte gib eine gültige E-Mail-Adresse ein.' };
  }
  if (istErlaubt(email, deps.erlaubteEmails)) {
    try {
      await deps.sende(email);
    } catch (fehler) {
      console.error('Anmeldemail konnte nicht gesendet werden', fehler);
    }
  }
  return { status: 'gesendet', meldung: NEUTRALE_MELDUNG, email };
}

/** Prüft den Code aus der Mail. Funktioniert auch in der Home-Bildschirm-App. */
export async function codeBestaetigen(
  email: string,
  eingabe: string,
  deps: { erlaubteEmails: string[]; pruefe: (email: string, code: string) => Promise<boolean> },
): Promise<AnmeldeZustand> {
  const code = eingabe.replace(/\s+/g, '');
  if (!/^\d{6,10}$/.test(code)) {
    return { status: 'fehler', meldung: 'Der Code besteht aus 6 bis 10 Ziffern.' };
  }
  const normalisiert = email.trim().toLowerCase();
  if (!istErlaubt(normalisiert, deps.erlaubteEmails)) {
    return { status: 'fehler', meldung: CODE_FALSCH };
  }
  const ok = await deps.pruefe(normalisiert, code).catch(() => false);
  return ok ? { status: 'angemeldet' } : { status: 'fehler', meldung: CODE_FALSCH };
}
