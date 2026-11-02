// Einheitliche Typen der Suche (Spec §6.1).

export type Angebotsart = 'ausbildung' | 'dual' | 'studium' | 'job';
export type Bundesland =
  | 'BW' | 'BY' | 'BE' | 'BB' | 'HB' | 'HH' | 'HE' | 'MV'
  | 'NI' | 'NW' | 'RP' | 'SL' | 'SN' | 'ST' | 'SH' | 'TH';
export type QuellenName = 'ba-jobs' | 'ba-studium' | 'adzuna';

export interface Angebot {
  id: string; // `${quelle}:${quellenId}`
  quelle: QuellenName;
  quellenId: string;
  art: Angebotsart;
  titel: string;
  anbieter: string; // Firma oder Hochschule
  ort: { plz?: string; ort: string; bundesland?: Bundesland; lat?: number; lon?: number };
  entfernungKm?: number;
  beginn?: string; // ISO-Datum oder Freitext („Wintersemester“)
  verguetung?: { betrag?: number; einheit: 'monat' | 'jahr'; herkunft: 'feld' | 'ki' };
  veroeffentlicht?: string; // ISO-Datum
  geaendert?: string; // ISO-Datum
  url: string; // Originalanzeige
  weitereQuellen?: { quelle: QuellenName; url: string }[];
}

export interface Kreis {
  name: string; // Anzeigename, z. B. „Frankfurt am Main“
  wo: string; // Wert für die Quelle (Ortsname oder PLZ)
  lat: number;
  lon: number;
  umkreisKm: number;
}

export interface AdapterAbfrage {
  was: string;
  art: Angebotsart;
  kreis?: Kreis; // nur an Adapter mit faehigkeiten.umkreis
  bundeslaender?: Bundesland[]; // nur an Adapter mit faehigkeiten.bundesland
  seite: number; // ab 1
}

export interface AdapterSeite {
  angebote: Angebot[];
  gesamt: number; // Gesamtzahl laut Quelle (vor eigener Filterung)
}

export interface QuellenAdapter {
  name: QuellenName;
  unterstuetzt(art: Angebotsart): boolean;
  /** Arten mit gleicher Klasse holt die Quelle mit derselben Abfrage (BA: Ausbildung + duales Studium). */
  abfrageKlasse(art: Angebotsart): string;
  faehigkeiten: { umkreis: boolean; bundesland: boolean };
  seitenGroesse: number;
  maxSeiten: number;
  suche(abfrage: AdapterAbfrage, signal: AbortSignal): Promise<AdapterSeite>;
}

export type Sortierung = 'relevanz' | 'entfernung' | 'beginn' | 'neueste';

export interface SuchFilter {
  beginnAb?: string;
  nurMitVerguetung?: boolean;
  veroeffentlichtSeitTagen?: 7 | 30;
}

export interface SuchAnfrage {
  was: string;
  arten: Angebotsart[];
  orte: { ort: string; umkreisKm: number }[];
  bundeslaender: Bundesland[];
  filter?: SuchFilter;
  sortierung: Sortierung;
  seite: number;
}

export type Hinweis =
  | { typ: 'quelle_nicht_erreichbar'; quelle: QuellenName }
  | { typ: 'veralteter_stand'; quelle: QuellenName; stand: string }
  | { typ: 'zu_viele_treffer' }
  | { typ: 'ort_bereinigt'; eingabe: string; bereinigt: string }
  | { typ: 'ort_unbekannt'; eingabe: string };

export interface SuchErgebnis {
  angebote: Angebot[];
  gesamt: number;
  seite: number;
  seiten: number;
  hinweise: Hinweis[];
}

export interface GeoTreffer {
  name: string;
  lat: number;
  lon: number;
}
