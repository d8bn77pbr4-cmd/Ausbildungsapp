# Bewerbungsradar

Private Web-App, die die Suche nach **Ausbildungen, dualen Studiengängen, Studiengängen und Jobs** in Deutschland bündelt – nach Orten mit Umkreis und nach mehreren Bundesländern gleichzeitig. Läuft im Browser und lässt sich auf dem Handy als App speichern.

- **Einrichten (Supabase + Vercel, ca. 15 Min.):** [docs/einrichtung.md](docs/einrichtung.md)
- **Design-Spezifikation:** [docs/superpowers/specs/2026-11-02-bewerbungsradar-design.md](docs/superpowers/specs/2026-11-02-bewerbungsradar-design.md)
- **Umsetzungsplan Phase 1–2:** [docs/superpowers/plans/2026-11-02-bewerbungsradar-phase-1-2.md](docs/superpowers/plans/2026-11-02-bewerbungsradar-phase-1-2.md)

## Quellen

- Jobsuche der Bundesagentur für Arbeit (Ausbildung, duales Studium, Jobs)
- Studiensuche der Bundesagentur für Arbeit (Studiengänge)
- Indeed, StepStone, Azubiyo: nur als Links mit vorausgefüllter Suche (deren Angebote werden nicht ausgelesen)

## Befehle

| Befehl | Zweck |
|---|---|
| `npm run dev` | lokal starten (braucht `.env.local`, siehe `.env.example`) |
| `npm test` | Unit-Tests |
| `npm run test:e2e` | Browser-Tests (iPhone- und Desktop-Größe) gegen nachgestellte Quellen |
| `npm run test:vertrag` | Live-Prüfung, ob die BA-Schnittstellen noch wie erwartet antworten |
| `npm run lint` / `npm run typecheck` / `npm run build` | Qualität und Produktions-Build |

Hilfsskripte: `scripts/fixtures-aufnehmen.ts` (Testdaten neu aufnehmen), `scripts/kreise-erzeugen.ts` (Suchkreise je Bundesland), `scripts/randorte-geokodieren.ts` (Prüfpunkte für die Kreise).
