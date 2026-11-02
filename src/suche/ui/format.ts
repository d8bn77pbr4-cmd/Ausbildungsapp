import type { Angebot, Hinweis, QuellenName } from '../typen';

const ISO = /^(\d{4})-(\d{2})-(\d{2})/;

export function formatDatum(iso: string): string {
  const m = ISO.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

export function formatBeginn(beginn?: string): string {
  if (!beginn) return 'Beginn: nicht angegeben';
  return `Beginn: ${formatDatum(beginn)}`;
}

const EURO = new Intl.NumberFormat('de-DE');

/** Betrag des 1. Lehrjahrs – deshalb „ab“. */
export function formatVerguetung(v?: Angebot['verguetung']): string | null {
  if (!v?.betrag) return null;
  return `ab ${EURO.format(v.betrag)} € / ${v.einheit === 'monat' ? 'Monat' : 'Jahr'}`;
}

export function formatOrt(a: Angebot): string {
  const ort = a.ort.ort || 'Ort nicht angegeben';
  return a.entfernungKm === undefined ? ort : `${ort} · ${a.entfernungKm} km`;
}

const KURZNAME: Record<QuellenName, string> = { 'ba-jobs': 'BA-Jobsuche', 'ba-studium': 'BA-Studiensuche', adzuna: 'Adzuna' };
const LANGNAME: Record<QuellenName, string> = {
  'ba-jobs': 'Bundesagentur für Arbeit – Jobsuche',
  'ba-studium': 'Bundesagentur für Arbeit – Studiensuche',
  adzuna: 'Adzuna',
};

export function quellenName(q: QuellenName): string {
  return LANGNAME[q];
}

const ZEIT = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function hinweisText(h: Hinweis): string {
  switch (h.typ) {
    case 'quelle_nicht_erreichbar':
      return `${KURZNAME[h.quelle]} ist gerade nicht erreichbar – du siehst die übrigen Treffer.`;
    case 'veralteter_stand':
      return `Stand vom ${ZEIT.format(new Date(h.stand))} – die Quelle ist gerade nicht erreichbar.`;
    case 'zu_viele_treffer':
      return 'Sehr viele Treffer – grenze die Suche ein, um alle zu sehen.';
    case 'ort_bereinigt':
      return `Gesucht um: ${h.bereinigt}`;
    case 'ort_unbekannt':
      return `Ort nicht gefunden: ${h.eingabe}`;
  }
}
