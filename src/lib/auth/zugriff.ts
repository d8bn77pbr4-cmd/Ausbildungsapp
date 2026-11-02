export type Zugriff = 'weiter' | 'zum_login' | 'api_nicht_angemeldet' | 'nicht_freigegeben';

const OEFFENTLICH_EXAKT = new Set(['/login', '/auth/callback', '/manifest.webmanifest', '/icon.svg', '/apple-icon']);
const OEFFENTLICH_PRAEFIX = ['/app-icon/'];

/** Ist die E-Mail-Adresse freigegeben? Vergleich ohne Groß-/Kleinschreibung und Leerzeichen. */
export function istErlaubt(email: string | null | undefined, erlaubteEmails: string[]): boolean {
  const e = email?.trim().toLowerCase();
  if (!e) return false;
  return erlaubteEmails.some((erlaubt) => erlaubt.trim().toLowerCase() === e);
}

function istOeffentlich(pfad: string): boolean {
  return OEFFENTLICH_EXAKT.has(pfad) || OEFFENTLICH_PRAEFIX.some((p) => pfad.startsWith(p));
}

/** Reine Entscheidung, was mit einer Anfrage passiert – ohne Netz, damit sie testbar ist. */
export function zugriffsEntscheidung(p: {
  pfad: string;
  email: string | null;
  erlaubteEmails: string[];
  ohneLogin: boolean;
}): Zugriff {
  if (p.ohneLogin || istOeffentlich(p.pfad)) return 'weiter';
  if (!p.email) return p.pfad.startsWith('/api/') ? 'api_nicht_angemeldet' : 'zum_login';
  return istErlaubt(p.email, p.erlaubteEmails) ? 'weiter' : 'nicht_freigegeben';
}
