# Bewerbungsradar – Design-Spezifikation

Stand: 2026-11-02 · Status: zur Freigabe · Name der App: **Bewerbungsradar** (Repository: Ausbildungsapp)

## 1. Ziel

Eine private Web-App, die **Suche, Bewerbung und Nachverfolgung** für Ausbildungen, duale Studiengänge, Studiengänge und Jobs in Deutschland an einem Ort bündelt.

**Nutzer:** eine Person (Eigentümer:in), später optional bis ca. 100 eingeladene Personen. Kein öffentliches Produkt.

**Erfolgskriterien**

1. Die Suche „Mechatroniker, Ausbildung, Hessen + NRW“ zeigt zusammengeführte Treffer ohne Duplikate, nur aus diesen Bundesländern, in < 5 s (aus dem Cache in < 1 s).
2. Eine Bewerbung per Gmail inkl. Anhängen ist in < 2 Minuten versendet.
3. Neue Angebote einer gespeicherten Suche werden innerhalb von 24 h gemeldet.
4. Keine Antwort-Mail einer Firma geht unter: Sie wird automatisch zugeordnet oder als Vorschlag angezeigt.
5. Jede Ansicht hat genau eine erkennbare Hauptaufgabe und zeigt nur, was für die nächste Entscheidung nötig ist (siehe §4).

## 2. Getroffene Entscheidungen

| Thema | Entscheidung | Grund |
|---|---|---|
| Zielgruppe | privat (≤ 100 Nutzer) | Gmail-Lesen ohne Google-Sicherheitsaudit; geringer Rechtsaufwand |
| Quellen | BA-Jobsuche, BA-Studiensuche, Adzuna; Indeed/StepStone/Azubiyo nur als vorausgefüllte Links | Scraping verstößt gegen deren AGB und den Datenbankschutz (§ 87b UrhG) |
| Lesestatus | Kein Tracking-Pixel. Stattdessen Nachfass-Assistent + Antwort-Erkennung | § 25 TDDDG/DSGVO; Pixel-Daten sind unzuverlässig (Apple Mail, Outlook) |
| Technik | Next.js (TypeScript) + Supabase (Frankfurt) + Vercel | wartungsarm, Gratis-Tarife, eine Sprache, einsteigerfreundlich |
| Gestaltung | Apple-Prinzipien (HIG, Fluid Interfaces), progressive Offenlegung | Wunsch: geordnet, logisch, nicht zu viel auf einmal |

## 3. Nicht-Ziele (Version 1)

- Firmen-Accounts oder eigene Stellenanzeigen
- Automatisches Ausfüllen fremder Bewerberportale
- Native iOS-/Android-Apps (stattdessen installierbare Web-App)
- KI-Recherche auf Firmen-Karriereseiten (mögliche spätere Ausbaustufe)
- Versand ohne ausdrückliche Bestätigung
- Öffnungs-Tracking jeder Art, Analytics-Dienste

## 4. Gestaltungsgrundsätze

1. **Eine Hauptaufgabe pro Ansicht.** Pro Bildschirm genau ein hervorgehobener Button.
2. **Progressive Offenlegung.** Liste → Karte → Steckbrief → Originalanzeige. Jede Ebene zeigt nur, was für den nächsten Schritt nötig ist.
   - Ergebniskarte: höchstens 4 Fakten (Titel, Anbieter, Ort + Entfernung, Beginn) und 1 Zusatz-Chip (Vergütung, falls bekannt).
   - Steckbrief: „Das Wichtigste“ (Vergütung, Beginn, Frist, Bewerbungsweg) sofort sichtbar. „Voraussetzungen“, „Aufgaben“ und „Kontakt“ sind aufklappbar.
   - Selten genutzte Filter sind standardmäßig eingeklappt.
3. **Fester Ablauf:** Suchen → Merken → Bewerben → Verfolgen. Jede Karte bietet nur den nächsten logischen Schritt an.
4. **Ruhige Oberfläche:** viel Weißraum, große Titel, Systemschrift (SF Pro auf Apple-Geräten, sonst Inter), eine Akzentfarbe (Blau), Hell/Dunkel automatisch.
5. **Fluid-Interface-Regeln** (Apple WWDC, Skill *ultimate-design-engineer*):
   - Sofortige Rückmeldung beim Drücken (`scale(0.96)`, 100–160 ms).
   - Direkte Manipulation: Karten im Board folgen dem Finger 1:1.
   - Unterbrechbare Feder-Animationen (Springs) beim Ablegen.
   - Dauern: Tabs/Hover 120–160 ms, Sheets/Panels 200–350 ms. Häufige Aktionen (Tippen in die Suche) ohne Animation.
   - Nie aus `scale(0)` einblenden, nur `transform`/`opacity` animieren, `prefers-reduced-motion` respektieren.
   - Glas-Material (`backdrop-filter: blur`) nur für die Tab-Leiste und den Hintergrund von Sheets.
6. **Status dreifach codiert:** Farbe + Symbol + Text.
   - Gemerkt (grau, Lesezeichen) · Beworben (orange, Uhr + „seit 9 Tagen“) · Gespräch (lila, Kalender) · Zusage (grün, Haken) · Absage (rot, Kreuz).
7. **Barrierefreiheit:** Kontrast nach WCAG AA, Touch-Ziele ≥ 44 pt, komplett per Tastatur bedienbar.

## 5. Informationsarchitektur

Tab-Leiste: auf dem Handy unten (Glas), auf dem Desktop als Seitenleiste. Fünf Tabs:

| Tab | Hauptaufgabe | Inhalt (in dieser Reihenfolge) | Primäraktion |
|---|---|---|---|
| **Heute** | „Was ist jetzt zu tun?“ | 1. Zu erledigen (Nachfassen, Fristen ≤ 3 Tage, neue Antworten) · 2. Neue Treffer (Zähler je gespeicherter Suche) | erste offene Aufgabe |
| **Suchen** | Angebote finden | Umschalter „Neue Suche / Gespeichert“ · Suchmaske → Ergebnisliste → Steckbrief (Sheet) | „Suche speichern“ (nach einer Suche) |
| **Bewerbungen** | Überblick über den Stand | Board mit 4 Spalten: Gemerkt · Beworben · Gespräch · Entschieden (Zusage/Absage). Mobil als Segment-Umschalter, Desktop nebeneinander. Karte → Detail mit Verlauf | „Bewerbung eintragen“ |
| **Postfach** | Antworten verstehen | Vorschläge „Gehört zu …?“ oben, darunter Bewerbungs-Mails gruppiert nach Bewerbung | Vorschlag bestätigen |
| **Profil** | Unterlagen & Verbindungen | Unterlagen, Anschreiben-Vorlagen, Gmail-Verbindung, Benachrichtigungen, „Alle Daten löschen“ | – |

**Leere Zustände:** Jede Ansicht erklärt in einem Satz, was hier erscheinen wird, und bietet einen Button zum Startpunkt (z. B. „Heute“ leer → „Erste Suche starten“).

**Suchmaske**

- „Was?“: Beruf, Studienfach oder Freitext (mit Vorschlägen)
- Angebotsart: Ausbildung · Duales Studium · Studium · Job (Mehrfachauswahl, Standard: Ausbildung)
- „Wo?“: Chips für Bundesländer und/oder Orte, pro Ort ein Umkreis-Regler (10–200 km, Standard 25 km)
- „Weitere Filter“ (eingeklappt): Beginn ab, nur mit Vergütungsangabe, veröffentlicht seit
- Sortierung: Relevanz (Standard: Reihenfolge der Quellen, im Reißverschlussverfahren gemischt), Entfernung, Beginn, neueste zuerst
- Unter der Ergebnisliste: „Auch auf Indeed / StepStone / Azubiyo suchen“ (öffnet dort die gleiche Suche)

## 6. Architektur

```
Browser (Next.js-App, installierbar als PWA)
   │
   ▼
Next.js-Server (Vercel, Funktionsregion fra1 Frankfurt)
   ├── Such-Planer ──────────► Quellen-Adapter: BA-Jobsuche | BA-Studiensuche | Adzuna
   ├── Steckbrief-Dienst ────► Claude API
   ├── Gmail-Dienst ─────────► Gmail API
   ├── Aufgaben-Dienst (Nachfassen, Fristen)
   └── Benachrichtigungs-Dienst ► Web Push | Sammel-Mail an sich selbst (über Gmail)
   │
   ▼
Supabase (eu-central-1 Frankfurt): Postgres + Auth + Storage
Vercel Cron (täglich 05:00 UTC) ──► /api/cron/taeglich
```

Jeder Dienst ist ein eigenes Modul mit klarer Schnittstelle und ohne direkten Zugriff auf die Interna anderer Dienste.

### 6.1 Einheitliches Angebotsformat

```ts
type Angebotsart = 'ausbildung' | 'dual' | 'studium' | 'job';
type Bundesland = 'BW' | 'BY' | 'BE' | 'BB' | 'HB' | 'HH' | 'HE' | 'MV'
                | 'NI' | 'NW' | 'RP' | 'SL' | 'SN' | 'ST' | 'SH' | 'TH';

interface Angebot {
  id: string;                 // `${quelle}:${quellenId}`
  quelle: 'ba-jobs' | 'ba-studium' | 'adzuna';
  quellenId: string;
  art: Angebotsart;
  titel: string;
  anbieter: string;           // Firma oder Hochschule
  ort: { plz?: string; ort: string; bundesland?: Bundesland; lat?: number; lon?: number };
  entfernungKm?: number;
  beginn?: string;            // ISO-Datum oder Freitext („Wintersemester“)
  verguetung?: { betrag?: number; einheit: 'monat' | 'jahr'; herkunft: 'feld' | 'ki' };
  veroeffentlicht?: string;   // ISO-Datum
  geaendert?: string;         // ISO-Datum, steuert Neuerzeugung des Steckbriefs
  url: string;                // Originalanzeige
  weitereQuellen?: { quelle: Angebot['quelle']; url: string }[];  // nach Zusammenführung
}

interface Kreis {
  name: string;               // Anzeigename, z. B. „Frankfurt am Main“
  wo: string;                 // Wert für die Quelle (Ortsname oder PLZ)
  lat: number;
  lon: number;
  umkreisKm: number;
}

interface AdapterAbfrage {
  was: string;
  art: Angebotsart;
  kreis?: Kreis;                // nur an Adapter mit faehigkeiten.umkreis
  bundeslaender?: Bundesland[]; // nur an Adapter mit faehigkeiten.bundesland
  seite: number;                // ab 1
}

interface AdapterSeite {
  angebote: Angebot[];
  gesamt: number;             // Gesamtzahl laut Quelle (vor eigener Filterung)
}

interface QuellenAdapter {
  name: Angebot['quelle'];
  unterstuetzt(art: Angebotsart): boolean;
  faehigkeiten: { umkreis: boolean; bundesland: boolean };
  seitenGroesse: number;      // BA-Jobs 100, BA-Studium 20
  maxSeiten: number;          // BA-Jobs 20 (≤ 2.000 Einträge), BA-Studium 50 (≤ 1.000 Einträge)
  suche(abfrage: AdapterAbfrage, signal: AbortSignal): Promise<AdapterSeite>;
}
```

### 6.2 Quellen (live getestet am 2026-11-02)

- **BA-Jobsuche**
  - `GET https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs`, Header `X-API-Key: jobboerse-jobsuche`.
  - Die ältere v4 antwortet inzwischen mit HTTP 403.
  - Parameter: `was`, `wo`, `umkreis` (bis 200 getestet), `angebotsart` (4 = Ausbildung/Duales Studium, 1 = Arbeit), `size` ≤ 100, `page`.
  - Antwort: `ergebnisliste[]` mit `referenznummer`, `stellenangebotsTitel`, `firma`, `stellenlokationen[].adresse` (`plz`, `ort`, `region` z. B. `HESSEN`), `breite`/`laenge`, `eintrittszeitraum`, `verguetungsangabe`, `externeURL`, `aenderungsdatum`. Außerdem `facetten` (u. a. `ausbildungsverguetung`, `arbeitsort`).
  - Nur ca. 12 % der Ausbildungsangebote haben eine Vergütungsangabe als Feld (813 von 6.684 im Test).
  - `ausbildungsart` (Filterwert 0 = Ausbildung, 1/2 = duales Studium). Die BA ordnet manche dualen Studiengänge als Ausbildung ein; deshalb wird zusätzlich der Titel geprüft.
  - Link zur Anzeige: `externeURL`, sonst `https://www.arbeitsagentur.de/jobsuche/jobdetail/{referenznummer}`.
  - `wo` akzeptiert auch eine PLZ. `woOutput` liefert den erkannten Ort mit Koordinaten und dient als Geokodierung. Tippfehler wie „Frankfrut“ werden von der BA selbst korrigiert.
- **BA-Studiensuche**
  - `GET https://rest.arbeitsagentur.de/infosysbub/studisu/pc/v1/studienangebote?sw=…`, Header `X-API-Key: infosysbub-studisu`.
  - Felder u. a. `studiBezeichnung`, `studienanbieter`, `region` (Bundesland), `studienort` (inkl. `location` mit Koordinaten), `studienform`, `studiBeginn`, `hochschulart`, `abschlussgrad`.
  - Seiten à 20 Einträge über `pg`. Bundeslandfilter `re=HE;NW` (mehrere Länder per Semikolon, getestet). Keine Umkreissuche: Die Entfernung wird aus `studienort.location` selbst berechnet.
- **Adzuna**
  - `GET https://api.adzuna.com/v1/api/jobs/de/search/{seite}` mit `app_id`/`app_key` (kostenlose Registrierung). Ergänzt vor allem Jobs.
- **Direkt-Links**
  - Indeed, StepStone und Azubiyo mit vorausgefüllter Suche (nur Links, kein Abruf von Daten).
- **Risiko**
  - Die BA-Schnittstellen sind nur inoffiziell dokumentiert (bund.dev) und können sich ohne Ankündigung ändern (siehe v4 → v6).
  - Gegenmaßnahmen: Adapter kapseln die Schnittstellen, eine Schema-Prüfung (zod) validiert jede Antwort, und ein täglicher Vertragstest meldet Formatänderungen.

### 6.3 Such-Planer

1. **Eingabe → Suchkreise**
   - Ort + Umkreis → 1 Kreis.
   - Orte der Nutzerin/des Nutzers werden zuerst über `woOutput` der BA-Jobsuche geokodiert. Bei einem unbekannten Ort erscheint der Hinweis „Ort nicht gefunden“. Ist er der einzige Ort, wird **nicht** stillschweigend bundesweit gesucht.
   - Bundesland bei Adaptern ohne Bundeslandfilter (BA-Jobsuche) → vordefinierte Abdeckungskreise aus `data/bundesland-kreise.json` (Radius ≤ 100 km, höchstens 6 Kreise je Bundesland, von Hand festgelegt und per Test gegen die Randorte jedes Bundeslands geprüft). Danach wird nach `bundesland` gefiltert.
     - Grund: Die BA-Jobsuche kennt keinen Bundeslandfilter. `wo=Hessen` findet den Ort „Hessen bei Halberstadt“ (getestet). Mit Gießen + 100 km lagen 66 % der Treffer in Hessen, der Rest wird gefiltert.
   - Bundesland bei Adaptern mit Bundeslandfilter (BA-Studiensuche) → je Bundesland eine Abfrage (das Seitenlimit gilt je Land).
   - Ort bei Adaptern ohne Umkreissuche (BA-Studiensuche) → je Bundesland, dessen Abdeckungskreise den Suchkreis berühren, eine Abfrage; danach Entfernungsfilter.
   - Arten mit gleicher Abfrageklasse (BA: Ausbildung + duales Studium = `angebotsart=4`) werden nur einmal abgerufen und danach nach Art getrennt.
   - Stadtstaaten (Berlin, Hamburg, Bremen) → 1 Kreis.
   - Art: Für Ausbildung und duales Studium fragt die BA-Jobsuche `angebotsart=4` ab. Als `dual` gilt ein Angebot bei `ausbildungsart = DUALES_STUDIUM` oder wenn der Titel „duales Studium“, „dualer Bachelor“ o. Ä. enthält, sonst als `ausbildung`.
2. **Abfragen:** Für jeden Kreis werden alle passenden Adapter parallel abgefragt (Timeout 8 s je Abfrage). Je Suche höchstens 80 Abrufe bei den Quellen (erst Seite 1 aller Abfragen, dann Folgeseiten verschränkt nach Seitennummer); darüber Hinweis „Sehr viele Treffer“. Fällt eine Quelle aus, wird nur einmal gewartet: laufende Abrufe werden abgebrochen, weitere nutzen sofort die Notreserve. Die Ortserkennung wird ebenfalls gecacht (gleiche Notreserve). Pro Abfrage gibt es höchstens 20 Seiten à 100 Einträge (BA-Studiensuche: 50 à 20). Wird das Limit erreicht: Hinweis „Sehr viele Treffer – grenze die Suche ein, um alle zu sehen.“
3. **Zusammenführen:**
   - Gleiche `id` → ein Eintrag.
   - Über Quellen hinweg: Ist der normalisierte Anbietername, der normalisierte Titel und die PLZ gleich, wird zusammengeführt. Alle Quellen-Links bleiben in `weitereQuellen` erhalten.
4. **Filtern, sortieren, ausliefern:** nach Bundesland und Zusatzfiltern, 30 Einträge pro Seite.
5. **Cache:** Schlüssel ist die normalisierte Abfrage je Kreis und Adapter. Gültig 6 h, gespeichert in Postgres. Abgelaufene Einträge bleiben 7 Tage als Notreserve: Fällt eine Quelle aus, wird dieser ältere Stand gezeigt, mit Hinweis auf das Datum. Danach werden sie gelöscht.

### 6.4 Steckbrief-Dienst

- **Auslöser:** das erste Öffnen eines Angebots. Das Ergebnis wird in `steckbrief` gespeichert und nur neu erzeugt, wenn sich `geaendert` ändert.
- **Eingabe:** der vollständige Anzeigentext. Der Bezugsweg für BA-Angebote (Detail-Endpunkt in v6) ist **erster Prüfpunkt von Phase 3**. Fallback: Steckbrief nur aus den Listenfeldern + Link zur Originalanzeige.
- **Modell:** `claude-haiku-5-5`, strukturierte Ausgabe per JSON-Schema.
- **Felder:**
  - `verguetung[]` (pro Lehrjahr), `beginn`, `dauer`
  - `voraussetzungen[]`, `aufgaben[]` (≤ 3)
  - `frist`, `kontakt { name, email, telefon }`
  - `bewerbungsweg` (`email` | `portal` | `post` | `unbekannt`), `portalUrl`
- **Regel:** Jedes Feld trägt `herkunft: 'anzeige' | 'nicht_angegeben'`. Der Prompt verbietet Schätzungen. Die App zeigt „nicht angegeben“ in Grau.
- **Bewerbungsweg steuert die Primäraktion:**
  - `email` → „Per Gmail bewerben“
  - `portal` → „Zum Bewerberportal“, danach „Als beworben markieren“
  - sonst → „Bewerbung eintragen“
- **Orientierungswert:** Die gesetzliche Mindestausbildungsvergütung (§ 17 BBiG) erscheint als klar gekennzeichneter Hinweis. Der Wert wird je Jahr als Konstante aus einer offiziellen Quelle übernommen.

### 6.5 Täglicher Lauf: Benachrichtigungen & Aufgaben

1. **Neue Angebote:** Jede aktive gespeicherte Suche läuft ohne Cache. Neue `id`s werden gegen `gesehen` geprüft und eingetragen.
2. **Nachfassen:** Eine Bewerbung im Status `beworben`, deren letzte eingehende Mail bzw. Statusänderung älter als N Tage ist (Standard 14, pro Bewerbung einstellbar), wird zur Aufgabe in „Heute“. Dazu gibt es einen vorformulierten Entwurf für eine Nachfrage.
3. **Fristen:** Gemerkte Angebote mit Frist in ≤ 3 Tagen werden zur Aufgabe.
4. **Versand:** höchstens eine gebündelte Push-Nachricht pro Tag (z. B. „5 neue Angebote · 1 Nachfrage fällig“), optional zusätzlich eine Sammel-Mail an die eigene Adresse über Gmail. Ohne Neuigkeiten wird nichts gesendet.

- Web Push mit VAPID-Schlüsseln. Auf dem iPhone funktioniert das nur als installierte Web-App (iOS ≥ 16.4). Die App erklärt das beim Aktivieren.
- Der Vercel-Gratis-Tarif erlaubt den Cron einmal täglich. Das passt zum 24-h-Kriterium.
- **Zeitbudget je Lauf:** Suchen werden nacheinander verarbeitet. Nicht geschaffte Suchen kommen beim nächsten Lauf zuerst dran.
- Der tägliche Lauf greift auf die Datenbank zu. Dadurch wird das kostenlose Supabase-Projekt nicht wegen Inaktivität pausiert. Schon ab Phase 1–2 gibt es dafür einen täglichen Weckruf (`/api/cron/wachhalten`, geschützt durch `CRON_SECRET`).

### 6.6 Gmail-Dienst

- **OAuth 2.0:** Google-Cloud-Projekt, Typ „Extern“, Status „In Produktion“, unverifiziert. Der Warnhinweis „nicht verifiziert“ wird einmalig bestätigt. Im Status „Test“ würden die Tokens alle 7 Tage ablaufen.
- **Scopes:** ausschließlich `gmail.send` und `gmail.readonly`.
- **Token-Speicherung:** Das Refresh-Token liegt verschlüsselt in der Datenbank (AES-256-GCM, Schlüssel als Umgebungsvariable). Es erreicht nie den Browser.
- **Senden:**
  - Vorlage mit Platzhaltern `{{anrede}}`, `{{ansprechpartner}}`, `{{firma}}`, `{{beruf}}` → Vorschau → Senden durch die Nutzerin/den Nutzer.
  - Die Anhänge kommen aus Storage. Warnung, wenn die Summe > 10 MB ist.
  - Gespeichert werden `messageId` und `threadId`.
  - Danach wird die Bewerbung automatisch auf `beworben` gesetzt, mit Ereignis im Verlauf.
- **Antworten erkennen** (im täglichen Lauf und beim Öffnen von „Postfach“):
  1. Neue Nachrichten in einer gespeicherten `threadId` → automatisch zugeordnet.
  2. Sonst Kandidaten per Gmail-Suche (letzte 30 Tage): Absender-Domain der Firma oder bekannte Bewerbersysteme (`data/ats-domains.json`, z. B. Personio, Softgarden, SuccessFactors, Workday, d.vinci) → Vorschlag „Gehört zu …?“.
  3. KI-Einstufung (`claude-haiku-5-5`) nur für zugeordnete bzw. vorgeschlagene Mails: `eingangsbestaetigung` | `einladung` | `absage` | `zusage` | `rueckfrage` | `sonstiges`. Daraus entsteht ein Status-Vorschlag, den die Nutzerin/der Nutzer bestätigt.
- **Datensparsam:** Gespeichert werden nur IDs, Einstufung, Datum und Absender. Mail-Inhalte werden bei Bedarf live aus Gmail geladen.

## 7. Datenmodell

Postgres (Supabase). Alle nutzerbezogenen Tabellen haben `user_id` und Row Level Security.

| Tabelle | Zweck | Wichtige Spalten |
|---|---|---|
| `gespeicherte_suche` | Suchen mit Benachrichtigung | `name`, `abfrage` jsonb, `aktiv`, `benachrichtigen` |
| `angebot` | gemeinsamer Angebots-Speicher | `id`, `quelle`, `daten` jsonb, `zuerst_gesehen`, `zuletzt_gesehen` |
| `gesehen` | Erkennung „neu“ | `suche_id`, `angebot_id`, `gesehen_am` |
| `steckbrief` | KI-Zusammenfassung | `angebot_id`, `inhalt` jsonb, `anzeige_stand`, `erstellt_am` |
| `bewerbung` | eine Bewerbung | `angebot_id` (optional), `firma`, `titel`, `status`, `kanal`, `beworben_am`, `erinnerung_nach_tagen`, `notiz` |
| `bewerbung_ereignis` | Verlauf | `bewerbung_id`, `typ`, `datum`, `details` jsonb |
| `mail_zuordnung` | Mail ↔ Bewerbung | `gmail_message_id`, `thread_id`, `bewerbung_id`, `einstufung`, `bestaetigt`, `datum`, `absender` |
| `unterlage` | Lebenslauf, Zeugnisse | `name`, `storage_pfad`, `groesse` |
| `vorlage` | Anschreiben-Vorlagen | `name`, `betreff`, `text` |
| `aufgabe` | Einträge in „Heute“ | `typ`, `bezug_id`, `faellig_am`, `erledigt` |
| `push_abo` | Web-Push-Geräte | `endpoint`, `schluessel` |
| `google_verbindung` | Gmail-Zugang | `email`, `refresh_token_verschluesselt`, `verbunden_am` |
| `such_cache` | 6-h-Cache | `schluessel`, `ergebnis` jsonb, `ablauf` |

- `bewerbung.status`: `gemerkt` → `beworben` → `gespraech` → `zusage` | `absage` | `zurueckgezogen`.
- Board-Spalte „Entschieden“ = `zusage`, `absage` oder `zurueckgezogen`.
- `bewerbung.kanal`: `gmail` | `portal` | `post` | `sonstiges`.

## 8. Fehlerbehandlung

| Fall | Verhalten |
|---|---|
| Eine Quelle antwortet nicht (Timeout 8 s) | Übrige Treffer zeigen + Hinweis „X gerade nicht erreichbar“ – nie stilles Fehlen |
| Alle Quellen fallen aus | Letzter Cache-Stand mit Zeitstempel, sonst klare Meldung mit „Erneut versuchen“ |
| Quellen-Format geändert | Schema-Prüfung überspringt fehlerhafte Einträge und protokolliert sie; Vertragstest schlägt an |
| Claude API Fehler/Timeout | Steckbrief zeigt Listenfelder + „Zusammenfassung später erneut versuchen“; Wiederholung mit Backoff |
| Gmail-Token abgelaufen/widerrufen | Banner „Gmail neu verbinden“; Versand gesperrt, Entwurf bleibt erhalten |
| Anhänge zu groß | Warnung vor dem Senden |
| Täglicher Lauf unvollständig | Fortsetzung beim nächsten Lauf (s. 6.5) |

## 9. Datenschutz & Sicherheit

- Alle Daten liegen in der EU (Supabase Frankfurt, Vercel-Funktionen fra1).
- Login nur für freigegebene E-Mail-Adressen (Allowlist), über Supabase Auth.
- Row Level Security auf allen Tabellen. Der Service-Schlüssel wird nur serverseitig verwendet.
- Geheimnisse (API-Schlüssel, VAPID, Token-Schlüssel) liegen nur in Vercel-Umgebungsvariablen, nie im Repository.
- Gmail: nur senden + lesen. Verarbeitet werden nur bewerbungsbezogene Mails, Inhalte werden nicht dauerhaft gespeichert.
- An die Claude API gehen nur Anzeigentexte und zugeordnete Mails, keine Lebensläufe oder Zeugnisse.
- Unterlagen liegen in einem privaten Storage-Bucket, Zugriff nur über kurzlebige signierte URLs.
- Kein Tracking: weder Pixel in Bewerbungen noch Analytics.
- „Alle Daten löschen“ entfernt Datenbankeinträge und Dateien und widerruft das Google-Token.

## 10. Tests

- **Unit-Tests (Vitest):**
  - Such-Planer (Kreise, Bundeslandfilter, Seitenlimit)
  - Duplikat-Erkennung
  - Adapter-Mapping mit gespeicherten Beispielantworten aus den Live-Tests
  - Steckbrief-Schema
  - Nachfass- und Fristen-Regel
  - Mail-Zuordnung, Vorlagen-Platzhalter
- **Vertragstest (täglich, GitHub Actions):** kleine echte Abfrage gegen die BA-Schnittstellen, prüft das Antwortformat.
- **End-to-End (Playwright):**
  - Suchen → Merken → Bewerben (Gmail simuliert) → Status ändern
  - Postfach-Vorschlag bestätigen
- **UI-Prüfungen:** iPhone-Breite (390 px), Hell/Dunkel, Tastaturbedienung, automatische Barrierefreiheitsprüfung (axe).

## 11. Umsetzungsphasen

Jede Phase endet mit einer lauffähigen, online gestellten Version samt Tests.

1. **Fundament:** Projekt, Supabase, Login, Design-System (Tokens, Tab-Leiste, Karten, Sheet), Deployment auf Vercel.
2. **Suche:** Adapter BA-Jobsuche + BA-Studiensuche, Such-Planer, Bundesland-Kreise, Ergebnisliste. → *erste nutzbare Version*
3. **Steckbrief, Merken, Bewerbungs-Board, gespeicherte Suchen.**
4. **„Heute“, täglicher Lauf, Push/Sammel-Mail, Nachfassen und Fristen.**
5. **Gmail:** verbinden, senden, Postfach, Antwort-Erkennung.
6. **Adzuna, Direkt-Links, Feinschliff.**

## 12. Offene Punkte (werden in der jeweiligen Phase geklärt)

1. BA-Detail-Endpunkt in v6 für den vollständigen Anzeigentext (Phase 3, erster Schritt).
2. ✅ Geklärt am 2026-11-02: Unterscheidung Ausbildung vs. duales Studium (siehe 6.2 und 6.3).
3. ✅ Geklärt am 2026-11-02: Die Studiensuche hat keine Umkreissuche, aber einen Bundeslandfilter (siehe 6.2).
4. Aktueller Wert der Mindestausbildungsvergütung (Phase 3).
5. URL-Muster der Direkt-Links für Indeed, StepStone und Azubiyo (Phase 6).
6. Adzuna-Zugangsschlüssel – Registrierung durch die Nutzerin/den Nutzer (Phase 6).
7. Aktuelle Preise der Claude API vor Phase 3 prüfen (erwartet: wenige Euro pro Monat oder weniger bei privater Nutzung).

## 13. Einrichtung durch die Nutzerin/den Nutzer

Benötigte Konten (Schritt-für-Schritt-Anleitung folgt im Umsetzungsplan): GitHub (vorhanden), Vercel, Supabase, Google Cloud (für Gmail), Anthropic API, später Adzuna. Alle außer der Anthropic API sind kostenlos startbar; die Anthropic API wird nach Nutzung abgerechnet.
