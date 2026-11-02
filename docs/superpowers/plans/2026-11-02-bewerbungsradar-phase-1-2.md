# Bewerbungsradar Phase 1–2 (Fundament & Suche) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine geschützte, installierbare Web-App mit Apple-artigem Rahmen (5 Tabs) und funktionierender Suche nach Ausbildungen, dualen Studiengängen, Studiengängen und Jobs. Gesucht wird nach Orten mit Umkreis und nach mehreren Bundesländern gleichzeitig, aus BA-Jobsuche und BA-Studiensuche.

**Architecture:** Next.js (App Router) auf Vercel (fra1), Supabase (Frankfurt) für Login und Such-Cache. Die Suche ist eine reine, gut testbare Pipeline: geokodieren → planen → Seiten parallel abrufen (über den Cache) → filtern → zusammenführen → sortieren → seitenweise ausliefern. Jede Quelle ist ein Adapter mit derselben Schnittstelle.

**Tech Stack:** Next.js 16.4.x, React 19, TypeScript (strict), CSS Modules + CSS-Variablen, zod 4, @supabase/supabase-js + @supabase/ssr, p-limit, Vitest, @playwright/test 1.63.0, @axe-core/playwright, tsx (Skripte).

**Spec:** `docs/superpowers/specs/2026-11-02-bewerbungsradar-design.md` (§4, §5, §6.1–6.3, §8, §9, §10, §11 Phasen 1–2). Spätere Phasen (Steckbrief, Board, Benachrichtigungen, Gmail, Adzuna, Direkt-Links) bekommen eigene Pläne.

## Global Constraints

- Node ≥ 20; Next.js 16.4.x mit App Router und `src/`-Ordner; TypeScript `strict: true`; Import-Alias `@/*` → `src/*`.
- Kein Tailwind. Styles als CSS Modules, alle Werte als Variablen aus `src/design/tokens.css`.
- Alle externen Daten (Quellen-Antworten, Request-Bodies, Umgebungsvariablen) werden mit zod validiert.
- UI-Sprache Deutsch in Du-Form. Code-Bezeichner Deutsch wie in Spec §6.1 (`Angebot`, `QuellenAdapter`, …).
- Eine Primäraktion pro Ansicht. Ergebniskarte: höchstens 4 Fakten (Titel, Anbieter, Ort + Entfernung, Beginn) + 1 Zusatz-Chip (Vergütung).
- Bewegung:
  - Drücken: `scale(0.96)` in 100–160 ms; Tabs/Hover 120–160 ms; Sheets 200–350 ms.
  - Easing `--ease-out-fast: cubic-bezier(0.23, 1, 0.32, 1)`, `--ease-out-smooth: cubic-bezier(0.16, 1, 0.3, 1)`.
  - Nur `transform`/`opacity` animieren, nie aus `scale(0)`. Bei `prefers-reduced-motion: reduce` keine Bewegung, nur Opacity.
- Glas (`backdrop-filter: blur(20px) saturate(180%)`) nur für Tab-Leiste und Sheet-Hintergrund.
- Barrierefreiheit:
  - Textkontrast ≥ 4.5:1 (axe ohne Verstöße), Touch-Ziele ≥ 44 px, alles per Tastatur bedienbar.
  - Statusfarben nur für Punkte/Symbole, nie als Textfarbe.
- Quellen:
  - BA-Jobs `https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs`, Header `X-API-Key: jobboerse-jobsuche`.
  - BA-Studium `https://rest.arbeitsagentur.de/infosysbub/studisu/pc/v1/studienangebote`, Header `X-API-Key: infosysbub-studisu`.
  - Timeout 8 s je Abruf. Seitenlimits BA-Jobs 10 × 100, BA-Studium 50 × 20. Höchstens 6 parallele Abrufe je Suche.
  - Cache 6 h gültig, Notreserve 7 Tage. UI zeigt 30 Treffer pro Seite.
- Datenschutz:
  - Supabase-Region eu-central-1, Vercel-Region `fra1`.
  - Geheimnisse nur in Umgebungsvariablen. `SUPABASE_SECRET_KEY` nur serverseitig.
  - Kein Tracking, keine Analytics, keine externen Schrift-Requests zur Laufzeit (`next/font` hostet selbst).
- Jede Commit-Nachricht endet mit den beiden Zeilen:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` und `Claude-Session: https://claude.ai/code/session_01NxRrmMr9vVus29RCFyvhcT`.

## Review Focus

1. **Bundesland-Name im Ort-Feld:** „Hessen“, „nrw“ oder „Baden-Württemberg“ ins „Wo?“-Feld getippt wird zum Bundesland-Chip. Es darf nie als Ort an die BA gehen („Hessen bei Halberstadt“). → Task 4 (`erkenneBundesland`), Task 11 (E2E).
2. **Unbekannter einziger Ort:** Ein unbekannter Ort ergibt den Hinweis „Ort nicht gefunden“ und keine stille bundesweite Suche. Ein korrigierter Ort ist sichtbar („Gesucht um: Frankfurt am Main“). → Task 10, Task 11.
3. **Überlappungen:** Überlappende Kreise (Hessen + NRW) oder Ort und Bundesland zugleich → jedes Angebot erscheint genau einmal. → Task 10.
4. **Fehlende oder ungewöhnliche Felder:** kein Beginn, Freitext-Beginn „Auf Anfrage“, keine Koordinaten, kein Bundesland, keine `externeURL`. Die Karte zeigt dann „nicht angegeben“, Sortierungen legen Unbekanntes ans Ende, nichts stürzt ab. → Task 5, 6, 8, 11.
5. **Sonderzeichen und Grenzwerte im Suchbegriff:** „Kauffrau für Büromanagement“, „C#“, „&“, 1 Zeichen, 101 Zeichen → korrekt kodiert bzw. verständliche Feldmeldung (HTTP 400), nie ein Serverfehler. → Task 5, Task 10.

---

## Dateistruktur

```
.github/workflows/ci.yml                 Lint, Typen, Unit, Build, E2E bei jedem Push
.github/workflows/vertragstest.yml       täglicher Live-Test der Quellen
docs/einrichtung.md                      Anleitung für Supabase + Vercel (für die Nutzerin/den Nutzer)
supabase/migrations/0001_such_cache.sql
data/bundesland-kreise.json              Abdeckungskreise je Bundesland
scripts/fixtures-aufnehmen.ts            nimmt echte Quellen-Antworten als Testdaten auf
scripts/randorte-geokodieren.ts          erzeugt tests/fixtures/randorte.json
src/app/layout.tsx, globals.css, manifest.ts, icon.svg, apple-icon.tsx, page.tsx (→ /heute)
src/app/(app)/layout.tsx                 Rahmen mit TabLeiste
src/app/(app)/{heute,suchen,bewerbungen,postfach,profil}/page.tsx
src/app/login/page.tsx, login/aktionen.ts, auth/callback/route.ts
src/app/api/suche/route.ts
src/proxy.ts                             Zugriffsschutz (Next 16: „proxy“, früher „middleware“)
src/lib/umgebung.ts                      Umgebungsvariablen (zod)
src/lib/auth/zugriff.ts                  reine Zugriffslogik
src/lib/supabase/{server,browser}.ts
src/design/tokens.css
src/design/komponenten/{Knopf,Karte,Chip,LeererZustand,Hinweis,Sheet,TabLeiste,Seitentitel}.tsx (+ .module.css)
src/suche/typen.ts                       Typen aus Spec §6.1 + SuchAnfrage/SuchErgebnis/Hinweis
src/suche/bundeslaender.ts               Codes, Namen, Aliase, BA-Region-Mapping
src/suche/geo.ts                         Entfernung (Haversine)
src/suche/kreise.ts                      lädt data/bundesland-kreise.json
src/suche/adapter/ba-jobs.ts             Adapter + geokodiere
src/suche/adapter/ba-studium.ts
src/suche/fehler.ts                      QuelleFehler
src/suche/zusammenfuehren.ts             Normalisierung + Duplikate
src/suche/ordnen.ts                      filtere, sortiere, reissverschluss
src/suche/cache.ts                       SuchCache, SpeicherCache, SupabaseCache
src/suche/planer.ts                      planeAbfragen, sucheAusfuehren
src/suche/anfrage.ts                     zod-Schema SuchAnfrage + verarbeiteSuchAnfrage
src/suche/ui/*.tsx                       Such-Oberfläche
tests/fixtures/…                         aufgenommene Quellen-Antworten
tests/vertrag/ba.vertrag.test.ts         Live-Vertragstest (nur mit VERTRAG=1)
e2e/*.spec.ts, e2e/mock-server.ts        Browser-Tests gegen Mock-Quellen
```

---

## Phase 1 – Fundament

### Task 1: Projektgerüst, Umgebung, CI

**Files:**
- Create: Next-Gerüst (via create-next-app), `vitest.config.ts`, `playwright.config.ts`, `vercel.json`, `.env.example`, `src/lib/umgebung.ts`, `.github/workflows/ci.yml`
- Test: `src/lib/umgebung.test.ts`

**Interfaces:**
- Produces:
  - `leseUmgebung(env: Record<string, string | undefined>): Umgebung`
  - `Umgebung = { supabaseUrl: string; supabasePublishableKey: string; supabaseSecretKey: string; erlaubteEmails: string[]; e2eOhneLogin: boolean; suchCache: 'supabase' | 'speicher'; baJobsUrl: string; baStudiumUrl: string }`
  - npm-Skripte `dev`, `build`, `lint`, `typecheck`, `test`, `test:vertrag`, `test:e2e`

- [ ] **Step 1: Gerüst erzeugen**
  - Run: `npx create-next-app@16.4.4 . --ts --eslint --app --src-dir --no-tailwind --import-alias "@/*" --use-npm --yes`
  - Lehnt das Werkzeug den Ordner wegen `docs/` ab: in einem Temp-Ordner erzeugen und den Inhalt hierher verschieben.
  - Danach installieren: `npm i zod @supabase/supabase-js @supabase/ssr p-limit` und `npm i -D vitest @playwright/test@1.63.0 @axe-core/playwright tsx`.
- [ ] **Step 2: Konfiguration anlegen**
  - `vercel.json`: `{ "regions": ["fra1"] }`.
  - Vitest: `environment: 'node'`, Alias `@` → `src`, schließt `tests/vertrag/**` und `e2e/**` aus.
  - Skripte:
    - `"typecheck": "tsc --noEmit"`, `"test": "vitest run"`
    - `"test:vertrag": "VERTRAG=1 vitest run tests/vertrag"`
    - `"test:e2e": "playwright test"`
  - `.env.example` listet alle Variablen aus Step 3 mit Platzhaltern.
- [ ] **Step 3: Failing test schreiben** – `src/lib/umgebung.test.ts`:
  ```ts
  const basis = { NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_123456789012345',
                  SUPABASE_SECRET_KEY: 'sb_secret_1234567890123456789', ERLAUBTE_EMAILS: ' A@b.de, c@d.de ' };
  test('liest gültige Umgebung mit Standardwerten', () => {
    const u = leseUmgebung(basis);
    expect(u.erlaubteEmails).toEqual(['a@b.de', 'c@d.de']);
    expect(u.suchCache).toBe('supabase');
    expect(u.baJobsUrl).toBe('https://rest.arbeitsagentur.de/jobboerse/jobsuche-service');
    expect(u.baStudiumUrl).toBe('https://rest.arbeitsagentur.de/infosysbub/studisu');
    expect(u.e2eOhneLogin).toBe(false);
  });
  test('nennt fehlende Variable verständlich', () => {
    expect(() => leseUmgebung({ ...basis, SUPABASE_SECRET_KEY: undefined }))
      .toThrow('Fehlende oder ungültige Einstellung: SUPABASE_SECRET_KEY – siehe docs/einrichtung.md');
  });
  test('E2E_OHNE_LOGIN wirkt nie in Produktion', () => {
    expect(leseUmgebung({ ...basis, E2E_OHNE_LOGIN: '1', NODE_ENV: 'production' }).e2eOhneLogin).toBe(false);
    expect(leseUmgebung({ ...basis, E2E_OHNE_LOGIN: '1', NODE_ENV: 'development' }).e2eOhneLogin).toBe(true);
  });
  ```
- [ ] **Step 4:** Run `npm test` → FAIL („leseUmgebung is not defined“).
- [ ] **Step 5: `leseUmgebung` in `src/lib/umgebung.ts` implementieren**
  - Mit zod. `SUCH_CACHE` akzeptiert `supabase` (Standard) oder `speicher`.
  - `BA_JOBS_URL` und `BA_STUDIUM_URL` sind optional, mit den Standardwerten oben.
- [ ] **Step 6:** Run `npm test && npm run lint && npm run typecheck && npm run build` → alles grün.
- [ ] **Step 7: CI anlegen** – `.github/workflows/ci.yml` (bei `push` und `pull_request`, Node 22):
  - `npm ci`, `lint`, `typecheck`, `test`, `build` mit Dummy-Umgebung aus `.env.example`.
  - Wird der Push wegen fehlender `workflow`-Berechtigung abgelehnt: Datei ohne Workflow committen und die Nutzerin/den Nutzer bitten, sie über die GitHub-Weboberfläche hinzuzufügen.
- [ ] **Step 8: Commit** – `git add -A && git commit -m "feat: Projektgerüst, Umgebungsprüfung und CI"`

### Task 2: Design-System und App-Rahmen mit 5 Tabs

**Files:**
- Create:
  - `src/design/tokens.css`
  - `src/design/komponenten/*` (Knopf, Karte, Chip, LeererZustand, Hinweis, Sheet, TabLeiste, Seitentitel)
  - `src/app/(app)/layout.tsx` und die 5 Seiten
  - `src/app/page.tsx` (Redirect → `/heute`)
  - `src/app/manifest.ts`, `src/app/icon.svg`, `src/app/apple-icon.tsx`
- Modify: `src/app/layout.tsx`, `src/app/globals.css`
- Test: `e2e/rahmen.spec.ts`, `playwright.config.ts`

**Interfaces:**
- Produces (React-Komponenten, alle aus `@/design/komponenten/<Name>`):
  - `Knopf({ variante = 'primaer' | 'sekundaer' | 'text', href?, onClick?, type?, disabled?, children })` – rendert `<a>` bei `href`, sonst `<button>`; `min-height: 44px`.
  - `Karte({ als = 'article' | 'button', onClick?, children })`
  - `Chip({ ausgewaehlt?: boolean, onClick?, onEntfernen?: () => void, entfernenLabel?: string, children })` – auswählbar mit `aria-pressed`; mit `onEntfernen` ein ×-Knopf mit `aria-label={entfernenLabel}`.
  - `LeererZustand({ titel: string, text: string, aktion?: { label: string; href: string } })`
  - `Hinweis({ ton: 'info' | 'warnung', children, aktion?: { label: string; onClick: () => void } })` – `role="status"`.
  - `Sheet({ offen: boolean, onSchliessen: () => void, titel: string, children, fuss?: ReactNode })`
    - Natives `<dialog>` mit `showModal()`. ESC und Klick auf den Hintergrund schließen; danach geht der Fokus zurück zum Auslöser.
    - Unter 900 px gleitet es von unten herein (`translateY`), ab 900 px als Panel von rechts (`translateX`, Breite 440 px). Dauer `--dauer-sheet`.
  - `TabLeiste()` – Tabs Heute `/heute`, Suchen `/suchen`, Bewerbungen `/bewerbungen`, Postfach `/postfach`, Profil `/profil`.
    - Inline-SVG-Symbole; aktiver Tab mit `aria-current="page"`.
    - Unter 900 px fest unten als Glas mit `padding-bottom: env(safe-area-inset-bottom)`. Ab 900 px Seitenleiste links, 240 px breit.
  - `Seitentitel({ children })` – `<h1>`, 34 px/700 (Large Title).

- [ ] **Step 1: Failing E2E schreiben** – `e2e/rahmen.spec.ts`
  - `playwright.config.ts`:
    - `webServer`: `npm run dev` mit `E2E_OHNE_LOGIN=1`, `SUCH_CACHE=speicher`, Dummy-Supabase-Werten, `BA_JOBS_URL`/`BA_STUDIUM_URL` = `http://localhost:4010/ba-jobs` bzw. `/ba-studium`.
    - Projekte `iphone` (390×844) und `desktop` (1280×800).
  ```ts
  test('Tabs navigieren und markieren die aktive Seite', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/heute$/);
    for (const [name, pfad] of [['Suchen','/suchen'],['Bewerbungen','/bewerbungen'],['Postfach','/postfach'],['Profil','/profil'],['Heute','/heute']]) {
      await page.getByRole('link', { name }).click();
      await expect(page).toHaveURL(new RegExp(pfad + '$'));
      await expect(page.getByRole('link', { name })).toHaveAttribute('aria-current', 'page');
    }
  });
  test('leerer Zustand auf Heute führt zur Suche', async ({ page }) => {
    await page.goto('/heute');
    await expect(page.getByRole('heading', { name: 'Noch nichts zu tun' })).toBeVisible();
    await page.getByRole('link', { name: 'Erste Suche starten' }).click();
    await expect(page).toHaveURL(/\/suchen$/);
  });
  test('Tab-Leiste: unten auf dem iPhone, links auf dem Desktop', async ({ page }, info) => {
    await page.goto('/heute');
    const box = (await page.getByRole('navigation', { name: 'Hauptnavigation' }).boundingBox())!;
    if (info.project.name === 'iphone') expect(box.y + box.height).toBeGreaterThan(800);
    else expect(box.x).toBe(0);
  });
  for (const schema of ['light', 'dark'] as const)
    test(`keine Barrierefreiheitsverstöße (${schema})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: schema });
      for (const pfad of ['/heute', '/suchen', '/bewerbungen', '/postfach', '/profil']) {
        await page.goto(pfad);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      }
    });
  ```
- [ ] **Step 2:** Run `npm run test:e2e -- e2e/rahmen.spec.ts` → FAIL (keine Tabs).
- [ ] **Step 3: `tokens.css` schreiben**
  - Startwerte hell/dunkel, angepasst bis axe grün ist:
    - Hintergrund `#F2F2F7` / `#000000`, Fläche `#FFFFFF` / `#1C1C1E`
    - Text `#1D1D1F` / `#F5F5F7`, Text-2 `#6E6E73` / `#A1A1A6`
    - Akzent-Fläche `#0071E3` (beide Modi, weißer Text), Akzent-Text `#0066CC` / `#4DA3FF`
    - Status gemerkt `#8E8E93`, beworben `#FF9500` / `#FF9F0A`, gespräch `#AF52DE` / `#BF5AF2`, zusage `#34C759` / `#30D158`, absage `#FF3B30` / `#FF453A`
  - Radien: Karte 16 px, Steuerelemente 10 px. Abstände 4/8/12/16/24/32/48.
  - Schrift: `-apple-system, BlinkMacSystemFont, "SF Pro Text", var(--font-inter), system-ui, sans-serif` (Inter über `next/font/google`).
  - `--dauer-druck: 120ms; --dauer-tab: 140ms; --dauer-sheet: 280ms` plus die beiden Easings.
  - Dunkelmodus über `@media (prefers-color-scheme: dark)`.
- [ ] **Step 4: Komponenten, Rahmen-Layout, Seiten und PWA-Manifest umsetzen**
  - Exakte Texte der leeren Zustände:
    - Heute: Titel „Noch nichts zu tun“, Text „Hier erscheinen neue Angebote und Aufgaben, sobald du eine Suche speicherst.“, Aktion „Erste Suche starten“ → `/suchen`.
    - Bewerbungen: „Noch keine Bewerbungen“ / „Merke dir Angebote oder trage eine Bewerbung ein – hier behältst du den Überblick.“ / „Angebote suchen“ → `/suchen`.
    - Postfach: „Noch keine Antworten“ / „Antworten von Firmen erscheinen hier, sobald Gmail verbunden ist.“ / „Angebote suchen“ → `/suchen`.
    - Profil: Seitentitel „Profil“, Abschnitt „Konto“ (Inhalt folgt in Task 3).
  - Manifest: `name: 'Bewerbungsradar'`, `display: 'standalone'`, `lang: 'de'`, `start_url: '/heute'`.
- [ ] **Step 5:** Run `npm run test:e2e -- e2e/rahmen.spec.ts` → PASS in beiden Projekten.
- [ ] **Step 6: Commit** – `git commit -m "feat: Design-System und App-Rahmen mit Tab-Leiste"`

### Task 3: Login nur für freigegebene Adressen

**Files:**
- Create: `src/lib/auth/zugriff.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/browser.ts`, `src/proxy.ts`, `src/app/login/page.tsx`, `src/app/login/aktionen.ts`, `src/app/auth/callback/route.ts`
- Modify: `src/app/(app)/profil/page.tsx`
- Test: `src/lib/auth/zugriff.test.ts`

**Interfaces:**
- Consumes: `leseUmgebung` (Task 1).
- Produces:
  - `istErlaubt(email: string | null | undefined, erlaubteEmails: string[]): boolean`
  - `zugriffsEntscheidung(p: { pfad: string; email: string | null; erlaubteEmails: string[]; ohneLogin: boolean }): 'weiter' | 'zum_login' | 'api_nicht_angemeldet' | 'nicht_freigegeben'`
  - `erstelleServerClient()`, `erstelleDienstClient()` (mit Secret Key, nur Server) in `src/lib/supabase/server.ts`

- [ ] **Step 1: Failing test schreiben**
  ```ts
  test('istErlaubt ignoriert Groß-/Kleinschreibung und Leerzeichen', () => {
    expect(istErlaubt(' A@B.de ', ['a@b.de'])).toBe(true);
    expect(istErlaubt('x@y.de', ['a@b.de'])).toBe(false);
    expect(istErlaubt(null, ['a@b.de'])).toBe(false);
  });
  test.each([
    ['/login', null, 'weiter'], ['/auth/callback', null, 'weiter'], ['/manifest.webmanifest', null, 'weiter'],
    ['/heute', null, 'zum_login'], ['/api/suche', null, 'api_nicht_angemeldet'],
    ['/heute', 'fremd@x.de', 'nicht_freigegeben'], ['/heute', 'a@b.de', 'weiter'],
  ])('%s mit %s → %s', (pfad, email, erwartet) => {
    expect(zugriffsEntscheidung({ pfad, email, erlaubteEmails: ['a@b.de'], ohneLogin: false })).toBe(erwartet);
  });
  test('ohneLogin lässt alles durch', () => {
    expect(zugriffsEntscheidung({ pfad: '/heute', email: null, erlaubteEmails: [], ohneLogin: true })).toBe('weiter');
  });
  ```
- [ ] **Step 2:** Run `npx vitest run src/lib/auth` → FAIL.
- [ ] **Step 3: Zugriffslogik implementieren**
  - Öffentlich sind `/login`, `/auth/callback`, `/manifest.webmanifest`, `/icon*`, `/apple-icon*`. `/_next/*` wird im `matcher` von `proxy.ts` ausgeschlossen.
- [ ] **Step 4: Supabase-Clients, `proxy.ts` und Login umsetzen**
  - `proxy.ts` (Next 16; heißt die Konvention in der installierten Version noch `middleware.ts`, diesen Namen verwenden):
    - Nutzer über `@supabase/ssr` holen und `zugriffsEntscheidung` anwenden.
    - `zum_login` → Redirect `/login`; `api_nicht_angemeldet` → 401 `{ fehler: 'nicht_angemeldet' }`.
    - `nicht_freigegeben` → `signOut()` + Redirect `/login?fehler=nicht_freigegeben`.
  - Login-Seite:
    - Feld „E-Mail“, Primärknopf „Anmeldelink senden“.
    - Die Server-Aktion ruft `signInWithOtp` nur bei `istErlaubt` auf. Danach zeigt sie immer denselben Text: „Wenn die Adresse freigegeben ist, kommt gleich eine E-Mail mit dem Anmeldelink.“
  - Callback: `exchangeCodeForSession` → Redirect `/heute`.
  - Profil: zeigt die E-Mail und den Knopf „Abmelden“ (Server-Aktion `signOut` → `/login`).
  - Bei `e2eOhneLogin` rufen Profil und `proxy.ts` Supabase gar nicht auf. Profil zeigt dann „Testmodus“ statt einer E-Mail, damit die Browser-Tests ohne echtes Supabase laufen.
- [ ] **Step 5:** Run `npm test && npm run test:e2e && npm run build` → PASS.
- [ ] **Step 6: Commit** – `git commit -m "feat: Login per Anmeldelink nur für freigegebene Adressen"`

---

## Phase 2 – Suche

### Task 4: Typen, Bundesländer, Entfernung

**Files:**
- Create: `src/suche/typen.ts`, `src/suche/bundeslaender.ts`, `src/suche/geo.ts`, `src/suche/fehler.ts`
- Test: `src/suche/bundeslaender.test.ts`, `src/suche/geo.test.ts`

**Interfaces:**
- Produces:
  - `typen.ts`: alle Typen aus Spec §6.1 wörtlich (`Angebotsart`, `Bundesland`, `Angebot`, `Kreis`, `AdapterAbfrage`, `AdapterSeite`, `QuellenAdapter`), dazu:
    ```ts
    export type Sortierung = 'relevanz' | 'entfernung' | 'beginn' | 'neueste';
    export interface SuchFilter { beginnAb?: string; nurMitVerguetung?: boolean; veroeffentlichtSeitTagen?: 7 | 30 }
    export interface SuchAnfrage { was: string; arten: Angebotsart[]; orte: { ort: string; umkreisKm: number }[];
      bundeslaender: Bundesland[]; filter?: SuchFilter; sortierung: Sortierung; seite: number }
    export type Hinweis =
      | { typ: 'quelle_nicht_erreichbar'; quelle: Angebot['quelle'] }
      | { typ: 'veralteter_stand'; quelle: Angebot['quelle']; stand: string }   // ISO-Zeitpunkt
      | { typ: 'zu_viele_treffer' }
      | { typ: 'ort_bereinigt'; eingabe: string; bereinigt: string }
      | { typ: 'ort_unbekannt'; eingabe: string };
    export interface SuchErgebnis { angebote: Angebot[]; gesamt: number; seite: number; seiten: number; hinweise: Hinweis[] }
    export interface GeoTreffer { name: string; lat: number; lon: number }
    ```
  - `bundeslaender.ts`:
    - `BUNDESLAENDER: Record<Bundesland, string>` (Anzeigenamen, z. B. `NW: 'Nordrhein-Westfalen'`)
    - `erkenneBundesland(text: string): Bundesland | null`
    - `ausBaRegion(region: string | undefined): Bundesland | undefined`
  - `geo.ts`: `entfernungKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number` (Haversine, R = 6371)
  - `fehler.ts`: `class QuelleFehler extends Error { constructor(public quelle: Angebot['quelle'], nachricht: string) }`

- [ ] **Step 1: Failing tests schreiben**
  ```ts
  test.each([['hessen','HE'],['NRW','NW'],['Nordrhein-Westfalen','NW'],['Baden-Württemberg','BW'],['baden wuerttemberg','BW'],
             ['BaWü','BW'],['RLP','RP'],['Sachsen','SN'],['Sachsen-Anhalt','ST'],['Meck-Pomm','MV'],['Thüringen','TH']])
    ('erkennt %s als %s', (t, bl) => expect(erkenneBundesland(t)).toBe(bl));
  test.each(['Frankfurt', 'Hessisch Lichtenau', 'Hessen bei Halberstadt', ''])
    ('%s ist kein Bundesland', (t) => expect(erkenneBundesland(t)).toBeNull());
  test('BA-Regionen', () => {
    expect(ausBaRegion('NORDRHEIN_WESTFALEN')).toBe('NW');
    expect(ausBaRegion('BADEN_WUERTTEMBERG')).toBe('BW');
    expect(ausBaRegion('THUERINGEN')).toBe('TH');
    expect(ausBaRegion('AUSLAND')).toBeUndefined();
  });
  test('Entfernung Frankfurt–Gießen ≈ 52 km', () =>
    expect(entfernungKm({ lat: 50.1109, lon: 8.6821 }, { lat: 50.5841, lon: 8.6784 })).toBeCloseTo(52.6, 0));
  ```
- [ ] **Step 2:** Run `npx vitest run src/suche` → FAIL.
- [ ] **Step 3: Implementieren**
  - Normalisierung für `erkenneBundesland`: klein schreiben, ä→ae, ö→oe, ü→ue, ß→ss, Leerzeichen/Bindestriche entfernen, dann exakter Vergleich gegen Namen, Codes und Aliase (NRW, BaWü/Bawue, RLP, MeckPomm, MV, BW …).
  - BA-Regionen: `BADEN_WUERTTEMBERG, BAYERN, BERLIN, BRANDENBURG, BREMEN, HAMBURG, HESSEN, MECKLENBURG_VORPOMMERN, NIEDERSACHSEN, NORDRHEIN_WESTFALEN, RHEINLAND_PFALZ, SAARLAND, SACHSEN, SACHSEN_ANHALT, SCHLESWIG_HOLSTEIN, THUERINGEN`.
- [ ] **Step 4:** Run `npx vitest run src/suche` → PASS.
- [ ] **Step 5: Commit** – `git commit -m "feat: Such-Typen, Bundesland-Erkennung und Entfernung"`

### Task 5: Adapter BA-Jobsuche + Geokodierung

**Files:**
- Create: `src/suche/adapter/ba-jobs.ts`, `scripts/fixtures-aufnehmen.ts`, `tests/fixtures/ba-jobs/*.json`, `tests/vertrag/ba.vertrag.test.ts`
- Test: `src/suche/adapter/ba-jobs.test.ts`

**Interfaces:**
- Consumes: Typen, `ausBaRegion`, `QuelleFehler` (Task 4).
- Produces:
  - `erstelleBaJobsAdapter(opt: { basisUrl: string; fetch?: typeof fetch }): QuellenAdapter`
    - `name: 'ba-jobs'`, unterstützt `ausbildung | dual | job`
    - `faehigkeiten: { umkreis: true, bundesland: false }`, `seitenGroesse: 100`, `maxSeiten: 10`
  - `geokodiere(ort: string, opt: { basisUrl: string; fetch?: typeof fetch; signal?: AbortSignal }): Promise<GeoTreffer | null>`
  - `istDual(titel: string, ausbildungsart?: string): boolean`

- [ ] **Step 1: Testdaten aufnehmen**
  - `scripts/fixtures-aufnehmen.ts` (Ausführung mit `npx tsx`) speichert rohe Antworten:
    - `mechatroniker-frankfurt-25.json` (`was=Mechatroniker&wo=Frankfurt&umkreis=25&angebotsart=4&size=100`)
    - `informatik-angebotsart4.json` (`was=Informatik&angebotsart=4&size=100`)
    - `buerokaufmann-koeln-job.json` (`angebotsart=1`)
    - `ort-frankfrut.json`, `leer.json` (`was=xqzvwk`)
  - Einen Eintrag mit `verguetungsangabe ≠ "KEINE_ANGABEN"` suchen, sein Format notieren und in `mit-verguetung.json` speichern.
  - Falls in 500 Einträgen keiner existiert: im Test nur `KEINE_ANGABEN → undefined` prüfen.
- [ ] **Step 2: Failing tests schreiben** (`fetch` per Stub aus den Fixtures)
  ```ts
  test('baut die Abfrage-URL inkl. Umlauten und Header', async () => {
    const aufrufe = stubFetch(leer);
    await adapter.suche({ was: 'Kauffrau für Büromanagement & C#', art: 'ausbildung', seite: 2,
      kreis: { name: 'Frankfurt am Main', wo: '60311', lat: 50.11, lon: 8.68, umkreisKm: 25 } }, signal);
    const url = new URL(aufrufe[0].url);
    expect(url.pathname).toBe('/pc/v6/jobs');
    expect(url.searchParams.get('was')).toBe('Kauffrau für Büromanagement & C#');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ wo: '60311', umkreis: '25', angebotsart: '4', page: '2', size: '100' });
    expect(aufrufe[0].headers['X-API-Key']).toBe('jobboerse-jobsuche');
  });
  test('mappt ein Ausbildungsangebot vollständig', async () => {
    const { angebote, gesamt } = await adapter.suche({ was: 'Mechatroniker', art: 'ausbildung', seite: 1, kreis }, signal);
    expect(gesamt).toBe(fixture.maxErgebnisse);
    const a = angebote[0];
    expect(a.id).toMatch(/^ba-jobs:/); expect(a.ort.bundesland).toBe('HE');
    expect(typeof a.ort.lat).toBe('number'); expect(a.entfernungKm).toBeTypeOf('number');
    expect(a.url).toMatch(/^https:\/\//);
  });
  test('Link-Fallback ohne externeURL', () => /* Eintrag ohne externeURL */
    expect(a.url).toBe(`https://www.arbeitsagentur.de/jobsuche/jobdetail/${encodeURIComponent(a.quellenId)}`));
  test.each([['Duales Studium 2027: Bachelor of Science','AUSBILDUNG',true],['Dualer Bachelor in Informatik (m/w/d)',undefined,true],
             ['Informatik','DUALES_STUDIUM',true],['Mechatroniker*in','AUSBILDUNG',false]])
    ('istDual(%s, %s) = %s', (t, a, e) => expect(istDual(t, a)).toBe(e));
  test('liefert nur die angefragte Art', /* art 'dual' → alle Ergebnisse art === 'dual' */);
  test('überspringt ungültige Einträge statt abzustürzen', /* Fixture-Kopie mit Eintrag ohne referenznummer → n-1 */);
  test('fehlende Felder bleiben undefined', /* Eintrag ohne eintrittszeitraum/Koordinaten → beginn/lat undefined */);
  test('wirft QuelleFehler bei HTTP 500', async () => {
    stubFetch(null, 500);
    await expect(adapter.suche(abfrage, signal)).rejects.toBeInstanceOf(QuelleFehler);
  });
  test('geokodiere: bekannter Ort → Koordinaten, ohne woOutput → null', /* ort-frankfrut.json, leer ohne woOutput */);
  ```
- [ ] **Step 3:** Run `npx vitest run src/suche/adapter` → FAIL.
- [ ] **Step 4: Implementieren**
  - Abfrage:
    - `angebotsart` = 1 bei `job`, sonst 4 (ohne `ausbildungsart`-Parameter).
    - `wo = kreis.wo`, `umkreis = kreis.umkreisKm`.
    - Abbruch über das übergebene `signal`.
  - Zuordnung der Felder:
    - `referenznummer` → `quellenId`, `stellenangebotsTitel` → `titel`, `firma` → `anbieter`
    - `stellenlokationen[0].adresse.{plz,ort,region}`, `breite` → `lat`, `laenge` → `lon`
    - `entfernung` → `entfernungKm` (nur wenn `kreis` gesetzt)
    - `eintrittszeitraum.von` → `beginn`, `datumErsteVeroeffentlichung` → `veroeffentlicht`, `aenderungsdatum` → `geaendert`
    - `verguetungsangabe` → `{ betrag, einheit: 'monat', herkunft: 'feld' }` nur wenn eine Zahl darin steht
  - Art: `job` bei `job`-Abfragen, sonst `istDual(...) ? 'dual' : 'ausbildung'`. Regex für `istDual`: `/\bdual(es|er|en)?\b.*\b(studium|bachelor|studiengang|student)/i`.
  - Ungültige Einträge per zod `safeParse` aussortieren und die Anzahl mit `console.warn` melden.
  - `geokodiere`: GET `?wo=<ort>&angebotsart=4&size=1` → `woOutput.bereinigterOrt` + `koordinaten[0]`, sonst `null`.
- [ ] **Step 5:** Run `npx vitest run src/suche/adapter` → PASS.
- [ ] **Step 6: Vertragstest anlegen** – `tests/vertrag/ba.vertrag.test.ts` (`describe.skipIf(!process.env.VERTRAG)`):
  - Die Live-Abfrage „Mechatroniker, Frankfurt, 25 km“ liefert ≥ 1 gültig gemapptes Angebot.
  - Der Fallback-Link eines Angebots ohne `externeURL` antwortet mit HTTP 200.
  - Run `npm run test:vertrag` → PASS.
- [ ] **Step 7: Commit** – `git commit -m "feat: Adapter BA-Jobsuche mit Geokodierung"`

### Task 6: Adapter BA-Studiensuche

**Files:**
- Create: `src/suche/adapter/ba-studium.ts`, `tests/fixtures/ba-studium/*.json` (über `scripts/fixtures-aufnehmen.ts`)
- Modify: `tests/vertrag/ba.vertrag.test.ts`
- Test: `src/suche/adapter/ba-studium.test.ts`

**Interfaces:**
- Consumes: Typen, `QuelleFehler`, `BUNDESLAENDER` (Task 4).
- Produces: `erstelleBaStudiumAdapter(opt: { basisUrl: string; fetch?: typeof fetch }): QuellenAdapter`
  - `name: 'ba-studium'`, unterstützt nur `studium`
  - `faehigkeiten: { umkreis: false, bundesland: true }`, `seitenGroesse: 20`, `maxSeiten: 50`

- [ ] **Step 1: Testdaten aufnehmen** – `informatik.json` (`sw=Informatik`), `informatik-he-nw.json` (`sw=Informatik&re=HE;NW`), `leer.json`.
- [ ] **Step 2: Failing tests schreiben**
  ```ts
  test('URL mit Bundesländern und Seite', async () => {
    const aufrufe = stubFetch(leer);
    await adapter.suche({ was: 'Informatik', art: 'studium', bundeslaender: ['HE', 'NW'], seite: 3 }, signal);
    const url = new URL(aufrufe[0].url);
    expect(url.pathname).toBe('/pc/v1/studienangebote');
    expect(Object.fromEntries(url.searchParams)).toEqual({ sw: 'Informatik', re: 'HE;NW', pg: '3' });
    expect(aufrufe[0].headers['X-API-Key']).toBe('infosysbub-studisu');
  });
  test('mappt einen Studiengang', /* id 'ba-studium:<id>', art 'studium', anbieter = studienanbieter.name,
    ort.bundesland aus region.Key, lat/lon aus studienort.location, beginn = studiBeginn (z. B. 'Auf Anfrage'), url gesetzt */);
  test('überspringt ungültige Einträge; HTTP 500 → QuelleFehler', /* wie Task 5 */);
  ```
- [ ] **Step 3:** Run → FAIL.
- [ ] **Step 4: Implementieren**
  - `re` wird nur gesetzt, wenn Bundesländer übergeben sind. `gesamt = maxErgebnisse`.
  - `url = https://web.arbeitsagentur.de/studiensuche/studienangebot/<id>`.
  - Diese URL einmal mit Playwright öffnen und per Screenshot prüfen, dass der Studiengang erscheint. Falls nicht: das korrekte Muster aus der offiziellen Studiensuche-Webseite übernehmen und im Test festhalten.
- [ ] **Step 5:** Run `npx vitest run src/suche/adapter` → PASS.
- [ ] **Step 6:** Den Vertragstest um `sw=Informatik&re=HE` ergänzen (≥ 1 Treffer, alle mit Bundesland `HE`). Run `npm run test:vertrag` → PASS.
- [ ] **Step 7: Commit** – `git commit -m "feat: Adapter BA-Studiensuche"`

### Task 7: Abdeckungskreise je Bundesland

**Files:**
- Create: `data/bundesland-kreise.json`, `src/suche/kreise.ts`, `scripts/randorte-geokodieren.ts`, `tests/fixtures/randorte.json`
- Modify: `tests/vertrag/ba.vertrag.test.ts`
- Test: `src/suche/kreise.test.ts`

**Interfaces:**
- Consumes: `geokodiere` (Task 5), `entfernungKm` (Task 4).
- Produces: `kreiseFuer(bl: Bundesland): Kreis[]`, `ALLE_KREISE: Record<Bundesland, Kreis[]>`

- [ ] **Step 1: Randorte geokodieren** – `scripts/randorte-geokodieren.ts` geokodiert die folgenden PLZ über `geokodiere` und schreibt `tests/fixtures/randorte.json` (`{ bundesland, plz, lat, lon }[]`):
  ```
  SH 25992 23769 21502 25541 | HH 22559 21039 22397 | HB 27568 28757 28309 | BE 13591 12559 13465 12309
  NI 26721 27472 34346 29439 49808 37441 | NW 52062 32469 37671 57299 48599 53604
  HE 34385 69239 36129 65385 35066 | RP 76887 57567 54595 67547 66953 | SL 66706 66424 66693 66606
  BW 97877 79539 78462 74564 77694 89073 | BY 63739 95028 94032 83471 87561 88131 96450
  TH 04600 99817 96515 99734 | SN 02826 08523 04860 09484 02763 | ST 29410 06712 38855 06886 39619
  BB 17291 16303 01968 15230 19348 03046 | MV 18055 18546 19258 17373 17235 23966
  ```
- [ ] **Step 2: Failing test schreiben**
  ```ts
  test('jeder Randort liegt mit 5 km Reserve in einem Kreis seines Bundeslands', () => {
    for (const r of randorte) {
      const ok = kreiseFuer(r.bundesland).some(k => entfernungKm(k, r) <= k.umkreisKm - 5);
      expect(ok, `${r.bundesland} ${r.plz}`).toBe(true);
    }
  });
  test('höchstens 6 Kreise je Land, Radius ≤ 100 km, alle 16 Länder', () => {
    expect(Object.keys(ALLE_KREISE)).toHaveLength(16);
    for (const ks of Object.values(ALLE_KREISE)) {
      expect(ks.length).toBeGreaterThanOrEqual(1); expect(ks.length).toBeLessThanOrEqual(6);
      for (const k of ks) expect(k.umkreisKm).toBeLessThanOrEqual(100);
    }
  });
  ```
- [ ] **Step 3:** Run → FAIL.
- [ ] **Step 4: `data/bundesland-kreise.json` von Hand festlegen** (`Record<Bundesland, Kreis[]>`)
  - So wenige Kreise wie möglich, `wo` als PLZ der Kreismitte. Stadtstaaten mit 1 Kreis (z. B. Bremen Mitte mit 60 km, damit Bremerhaven drin ist).
  - So lange anpassen, bis der Test grün ist.
- [ ] **Step 5:** Run `npx vitest run src/suche/kreise` → PASS.
- [ ] **Step 6:** Vertragstest ergänzen: `geokodiere(kreis.wo)` liegt für jeden Kreis ≤ 10 km von `lat/lon` entfernt. Run `npm run test:vertrag` → PASS.
- [ ] **Step 7: Commit** – `git commit -m "feat: Abdeckungskreise für alle 16 Bundesländer"`

### Task 8: Zusammenführen, Filtern, Sortieren

**Files:**
- Create: `src/suche/zusammenfuehren.ts`, `src/suche/ordnen.ts`
- Test: `src/suche/zusammenfuehren.test.ts`, `src/suche/ordnen.test.ts`

**Interfaces:**
- Consumes: `Angebot`, `SuchFilter`, `Sortierung` (Task 4).
- Produces:
  - `normalisiereTitel(s: string): string`, `normalisiereAnbieter(s: string): string`
  - `zusammenfuehren(angebote: Angebot[]): Angebot[]` – Reihenfolge des ersten Auftretens bleibt erhalten
  - `reissverschluss<T>(listen: T[][]): T[]`
  - `filtere(angebote: Angebot[], filter: SuchFilter | undefined, heute: Date): Angebot[]`
  - `sortiere(angebote: Angebot[], nach: Sortierung): Angebot[]` – stabil; bei `relevanz` unverändert

- [ ] **Step 1: Failing tests schreiben**
  ```ts
  test('Normalisierung', () => {
    expect(normalisiereTitel('Ausbildung zum Mechatroniker*in (m/w/d)')).toBe(normalisiereTitel('Mechatroniker (w/m/d)'));
    expect(normalisiereAnbieter('Opel Automobile GmbH')).toBe(normalisiereAnbieter('OPEL Automobile'));
  });
  test('gleiche id → ein Eintrag, kleinste Entfernung bleibt', /* zwei Kopien mit entfernungKm 30 und 12 → 1, entfernungKm 12 */);
  test('quellenübergreifend gleich (Anbieter+Titel+PLZ) → ein Eintrag mit weitereQuellen', /* ba-jobs + adzuna-Objekt → 1, weitereQuellen.length 1 */);
  test('andere PLZ → zwei Einträge', /* … */);
  test('reissverschluss', () => expect(reissverschluss([[1,2,3],[4],[5,6]])).toEqual([1,4,5,2,6,3]));
  test('Filter blenden Angebote ohne Angabe aus', () => {
    // nurMitVerguetung: nur mit verguetung; beginnAb '2027-08-01': nur ISO-beginn >= Datum ('Auf Anfrage' fällt raus);
    // veroeffentlichtSeitTagen 7 (heute 2026-11-02): nur veroeffentlicht >= 2026-10-26
  });
  test('Sortierung legt Unbekanntes ans Ende', () => {
    // entfernung aufsteigend, undefined zuletzt; beginn ISO aufsteigend, Freitext/undefined zuletzt; neueste: veroeffentlicht absteigend
  });
  ```
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implementieren**
  - Beide Normalisierungen: klein schreiben, ä→ae, ö→oe, ü→ue, ß→ss, Satzzeichen → Leerzeichen, Leerzeichen zusammenfassen.
  - Titel: zusätzlich Genderzusätze (`(m/w/d)` in allen Reihenfolgen, `*in`, `:in`, `/-in`, `(w/m/x)`) und die Präfixe „ausbildung zum/zur/als“ entfernen.
  - Anbieter: zusätzlich die Rechtsformen `gmbh, mbh, ag, kg, se, ohg, gbr, ev, & co` entfernen.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** – `git commit -m "feat: Duplikate zusammenführen, filtern und sortieren"`

### Task 9: Such-Cache

**Files:**
- Create: `src/suche/cache.ts`, `supabase/migrations/0001_such_cache.sql`
- Test: `src/suche/cache.test.ts`

**Interfaces:**
- Consumes: `erstelleDienstClient` (Task 3), `Umgebung` (Task 1).
- Produces:
  ```ts
  export interface CacheTreffer<T> { wert: T; gueltig: boolean; geschrieben: string }   // geschrieben = ISO
  export interface SuchCache {
    lies<T>(schluessel: string): Promise<CacheTreffer<T> | null>;   // liefert auch abgelaufene (≤ 7 Tage)
    schreibe<T>(schluessel: string, wert: T): Promise<void>;        // gültig 6 h
  }
  export function cacheSchluessel(teile: unknown): string           // sha256-Hex über JSON mit sortierten Schlüsseln
  export class SpeicherCache implements SuchCache { constructor(jetzt?: () => Date) }
  export class SupabaseCache implements SuchCache { constructor(client: SupabaseClient, jetzt?: () => Date) }
  export function erstelleSuchCache(u: Umgebung): SuchCache
  ```
- Migration:
  ```sql
  create table public.such_cache (
    schluessel text primary key,
    ergebnis jsonb not null,
    geschrieben timestamptz not null default now(),
    ablauf timestamptz not null
  );
  create index such_cache_ablauf_idx on public.such_cache (ablauf);
  alter table public.such_cache enable row level security;  -- bewusst keine Policies: Zugriff nur mit Secret Key
  ```

- [ ] **Step 1: Failing tests schreiben**
  ```ts
  test('cacheSchluessel ist unabhängig von der Schlüsselreihenfolge', () =>
    expect(cacheSchluessel({ a: 1, b: [2] })).toBe(cacheSchluessel({ b: [2], a: 1 })));
  test('SpeicherCache: gültig 6 h, danach abgelaufen, nach 7 Tagen weg', async () => {
    let t = new Date('2026-11-02T08:00:00Z'); const c = new SpeicherCache(() => t);
    await c.schreibe('k', { x: 1 });
    expect((await c.lies('k'))!.gueltig).toBe(true);
    t = new Date('2026-11-02T14:00:01Z'); expect((await c.lies('k'))!.gueltig).toBe(false);
    t = new Date('2026-11-09T14:00:01Z'); expect(await c.lies('k')).toBeNull();
  });
  test('SupabaseCache: Datenbankfehler brechen die Suche nicht ab', async () => {
    const kaputt = fakeClient({ fehler: new Error('offline') });
    await expect(new SupabaseCache(kaputt).lies('k')).resolves.toBeNull();
    await expect(new SupabaseCache(kaputt).schreibe('k', 1)).resolves.toBeUndefined();
  });
  ```
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implementieren**
  - `SupabaseCache.schreibe` macht ein Upsert mit `ablauf = jetzt + 6 h`.
  - Höchstens alle 10 Minuten je Instanz zusätzlich: `delete … where ablauf < now() - interval '7 days'`.
  - `lies` liefert `null` für Einträge, deren `ablauf` mehr als 7 Tage zurückliegt.
  - Fehler werden geloggt und ergeben `null` bzw. werden ignoriert.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** – `git commit -m "feat: Such-Cache mit 6-h-Gültigkeit und 7-Tage-Notreserve"`

### Task 10: Such-Planer, Ausführung und API

**Files:**
- Create: `src/suche/planer.ts`, `src/suche/anfrage.ts`, `src/app/api/suche/route.ts`
- Modify: `tests/vertrag/ba.vertrag.test.ts`
- Test: `src/suche/planer.test.ts`, `src/suche/anfrage.test.ts`

**Interfaces:**
- Consumes: Tasks 4–9.
- Produces:
  ```ts
  export interface GeplanteAbfrage { adapter: Angebot['quelle']; abfrage: Omit<AdapterAbfrage, 'seite'>;
    filterBundeslaender?: Bundesland[]; filterKreis?: Kreis }
  export function planeAbfragen(p: { was: string; arten: Angebotsart[]; kreise: Kreis[]; bundeslaender: Bundesland[];
    bundesweit: boolean }, adapter: QuellenAdapter[], kreiseFuer: (bl: Bundesland) => Kreis[]): GeplanteAbfrage[]
  export interface SuchDeps { adapter: QuellenAdapter[]; cache: SuchCache; kreiseFuer: (bl: Bundesland) => Kreis[];
    geokodiere: (ort: string, signal: AbortSignal) => Promise<GeoTreffer | null>; timeoutMs?: number /* 8000 */;
    parallel?: number /* 6 */; heute?: () => Date }
  export function sucheAusfuehren(anfrage: SuchAnfrage, deps: SuchDeps): Promise<SuchErgebnis>
  // anfrage.ts
  export const SuchAnfrageSchema: z.ZodType<SuchAnfrage>
  export function verarbeiteSuchAnfrage(body: unknown, deps: SuchDeps):
    Promise<{ status: 200; body: SuchErgebnis } | { status: 400; body: { fehler: 'ungueltige_anfrage'; felder: Record<string, string> } }>
  ```

- [ ] **Step 1: Failing tests für `planeAbfragen` schreiben** (Fake-Adapter mit den Fähigkeiten aus Task 5/6)
  - **Bundesland bei ba-jobs:** `['HE']` → je Hessen-Kreis eine Abfrage mit `kreis` und `filterBundeslaender: ['HE']`.
  - **Bundesland bei ba-studium:** `['HE','NW']` → genau eine Abfrage mit `bundeslaender: ['HE','NW']` und `filterBundeslaender` dazu.
  - **Ort bei ba-studium:** Abfrage ohne Ort, mit `filterKreis`.
  - **`bundesweit: true`:** je Adapter und Art eine Abfrage ohne Kreis und ohne Bundesländer.
  - **Art-Zuordnung:** `arten: ['studium','job']` → ba-studium bekommt nur `studium`, ba-jobs nur `job`.
- [ ] **Step 2: Failing tests für `sucheAusfuehren` schreiben** (Fake-Adapter, `SpeicherCache`, `timeoutMs: 50`)
  - **Blättern:** Es wird bis `min(maxSeiten, ceil(gesamt/seitenGroesse))` geblättert. Ist `gesamt > maxSeiten × seitenGroesse`, kommt der Hinweis `zu_viele_treffer`.
  - **Hängender Adapter:** Nach dem Timeout erscheint der Hinweis `quelle_nicht_erreichbar` (genau einmal je Quelle), die Treffer des anderen Adapters sind vorhanden.
  - **Notreserve:** Ein abgelaufener Cache-Eintrag plus ein fehlschlagender Adapter ergibt die Treffer aus dem Cache + den Hinweis `veralteter_stand` mit `stand`.
  - **Cache-Treffer:** Ein zweiter identischer Aufruf ruft den Adapter nicht erneut auf.
  - **Überlappung:** Überlappende Kreise (Hessen + NRW) und dieselbe `id` aus Ort- und Bundeslandsuche → genau einmal.
  - **Bundeslandfilter:** Angebote außerhalb der gewählten Länder oder ohne `bundesland` fallen weg, aber nur bei Abfragen mit `filterBundeslaender`.
  - **Kreisfilter:** Er setzt `entfernungKm` und entfernt alles außerhalb des Umkreises sowie Angebote ohne Koordinaten.
  - **Unbekannter Ort:**
    - `geokodiere` → `null` ergibt den Hinweis `ort_unbekannt`.
    - Ist das der einzige Ort und es gibt keine Bundesländer, ist das Ergebnis leer und **kein** Adapter wird aufgerufen.
  - **Korrigierter Ort:** `ort_bereinigt` erscheint, wenn `bereinigt.toLowerCase() !== eingabe.trim().toLowerCase()`.
  - **Seiten:** 75 Treffer, `seite: 2` → Treffer 31–60, `seiten: 3`, `gesamt: 75`.
- [ ] **Step 3: Failing tests für `verarbeiteSuchAnfrage` schreiben**
  - `was` mit 1 Zeichen → 400, `felder.was = 'Bitte gib mindestens 2 Zeichen ein.'`
  - `was` mit 101 Zeichen → 400, `'Höchstens 100 Zeichen.'`
  - `arten: []` → 400, `felder.arten = 'Wähle mindestens eine Angebotsart.'`
  - `umkreisKm: 5` → 400, `felder['orte.0.umkreisKm'] = 'Umkreis zwischen 10 und 200 km.'`
  - mehr als 5 Orte → 400
  - gültiger Body → 200 mit `SuchErgebnis`
  - `sortierung` fehlt → Standard `relevanz`; `seite` fehlt → 1
- [ ] **Step 4:** Run `npx vitest run src/suche` → FAIL.
- [ ] **Step 5: Implementieren** – Ablauf von `sucheAusfuehren`:
  1. Orte parallel geokodieren → `Kreis` (`name = bereinigterOrt`, `wo = Eingabe`) und Hinweise.
  2. `bundesweit = orte.length === 0 && bundeslaender.length === 0`.
  3. Planen.
  4. Je Abfrage Seite 1, dann die restlichen Seiten über `p-limit(parallel)`. Jede Seite: `cacheSchluessel({ adapter, ...abfrage, seite })` → gültiger Treffer oder Abruf mit `AbortSignal.timeout(timeoutMs)` → bei Fehler abgelaufener Treffer oder Hinweis.
  5. Je Abfrage filtern.
  6. `reissverschluss` über die Teilergebnisse in Planungsreihenfolge.
  7. `zusammenfuehren`, dann `filtere`, dann `sortiere`.
  8. Ausschnitt mit 30 Treffern pro Seite.
  - `route.ts` baut die `SuchDeps` aus `leseUmgebung`, ruft `verarbeiteSuchAnfrage` und gibt `Response.json(body, { status })` zurück.
- [ ] **Step 6:** Run `npx vitest run src/suche` → PASS.
- [ ] **Step 7:** Vertragstest ergänzen: Die echte Suche „Mechatroniker, Ausbildung, Hessen + NRW“ über `sucheAusfuehren` mit Live-Adaptern dauert < 5000 ms, liefert ≥ 1 Treffer, und alle Treffer haben `bundesland ∈ {HE, NW}`. Run `npm run test:vertrag` → PASS.
- [ ] **Step 8: Commit** – `git commit -m "feat: Such-Planer, Ausführung und Such-API"`

### Task 11: Such-Oberfläche

**Files:**
- Create: `src/suche/ui/SuchSeite.tsx`, `SuchFormular.tsx`, `WoEingabe.tsx`, `ArtAuswahl.tsx`, `WeitereFilter.tsx`, `ErgebnisListe.tsx`, `ErgebnisKarte.tsx`, `AngebotSheet.tsx` (+ `.module.css`), `src/suche/ui/format.ts`, `e2e/mock-server.ts`, `e2e/suche.spec.ts`
- Modify: `src/app/(app)/suchen/page.tsx`, `playwright.config.ts` (startet `e2e/mock-server.ts` auf Port 4010), `.github/workflows/ci.yml` (E2E-Job mit `npx playwright install --with-deps chromium`)
- Test: `src/suche/ui/format.test.ts`, `e2e/suche.spec.ts`

**Interfaces:**
- Consumes:
  - `POST /api/suche` (Task 10) mit `SuchAnfrage` → `SuchErgebnis`
  - Komponenten aus Task 2, `erkenneBundesland`, `BUNDESLAENDER` (Task 4)
- Produces: `formatBeginn(beginn?: string): string`, `formatVerguetung(v?: Angebot['verguetung']): string | null`, `formatOrt(a: Angebot): string`

**Verhalten (exakte Texte):**
- **Formular, von oben nach unten:**
  - Feld „Was?“ (Platzhalter „Beruf, Studienfach oder Stichwort“)
  - „Angebotsart“-Chips: Ausbildung · Duales Studium · Studium · Job. Standard ist Ausbildung, mindestens eine bleibt immer aktiv.
  - „Wo?“-Feld (Platzhalter „Ort, PLZ oder Bundesland“) mit Knopf „Hinzufügen“:
    - Eingabe + Enter oder „Hinzufügen“ → `erkenneBundesland` → Bundesland-Chip („Hessen“), sonst Orts-Chip („Frankfurt · 25 km“).
    - Ein Tippen auf den Orts-Chip zeigt den Umkreis-Regler (10–200 km, Schritt 5).
    - Höchstens 5 Orte. Ohne Chip wird bundesweit gesucht, der Hinweistext darunter lautet „Ohne Ort: ganz Deutschland“.
  - Eingeklapptes `<details>` „Weitere Filter“: Beginn ab (Datum) · Nur mit Vergütungsangabe · Veröffentlicht: egal / letzte 7 Tage / letzte 30 Tage.
  - Sortierung (Relevanz, Entfernung, Beginn, Neueste).
  - Primärknopf „Suchen“.
- **Ergebnisbereich:**
  - Zeile „128 Treffer“, darüber Hinweise:
    - „BA-Jobsuche ist gerade nicht erreichbar – du siehst die übrigen Treffer.“
    - „Stand vom 01.11.2026, 14:05 – die Quelle ist gerade nicht erreichbar.“
    - „Mehr als 1.000 Treffer – grenze die Suche ein, um alle zu sehen.“
    - „Gesucht um: Frankfurt am Main“
    - „Ort nicht gefunden: Frankfrt“
  - Alle Quellen nicht erreichbar und keine Treffer → `Hinweis` (Ton warnung) „Die Suche ist gerade nicht möglich.“ mit Aktion „Erneut versuchen“.
  - 0 Treffer → `LeererZustand` „Keine Treffer“ / „Versuch einen größeren Umkreis oder einen allgemeineren Begriff.“
  - Während der Suche: `aria-busy="true"` und 3 Platzhalterkarten.
  - Am Ende der Liste der Knopf „Mehr laden“, solange `seite < seiten`.
- **Ergebniskarte:**
  - Titel (h3), Anbieter, `formatOrt` („Gießen · 12 km“ bzw. „Gießen“), „Beginn: 01.08.2027“ bzw. „Beginn: nicht angegeben“ bzw. Freitext („Beginn: Auf Anfrage“).
  - Optional der Chip `formatVerguetung` („1.050 € / Monat“).
- **Sheet** (Titel = Angebotstitel):
  - Anbieter, Ort, Beginn, Vergütung („nicht angegeben“ in Text-2), Veröffentlicht, Quelle(n) („Bundesagentur für Arbeit – Jobsuche“ / „… – Studiensuche“).
  - Primärknopf im Fuß „Originalanzeige öffnen“ (`target="_blank" rel="noopener noreferrer"`), weitere Quellen als Textlinks.

- [ ] **Step 1: Failing Unit-Tests für `format.ts` schreiben**
  - `formatBeginn('2027-08-01') === 'Beginn: 01.08.2027'`
  - `formatBeginn(undefined) === 'Beginn: nicht angegeben'`
  - `formatBeginn('Auf Anfrage') === 'Beginn: Auf Anfrage'`
  - `formatVerguetung({ betrag: 1050, einheit: 'monat', herkunft: 'feld' }) === '1.050 € / Monat'`
  - `formatOrt` mit und ohne Entfernung
- [ ] **Step 2: Mock-Server anlegen** – `e2e/mock-server.ts` beantwortet:
  - `/ba-jobs/pc/v6/jobs`:
    - `was=xqzvwk` → `leer.json`
    - `wo=Frankfrt` → Antwort ohne `woOutput`
    - `angebotsart=1` → Job-Fixture
    - sonst `mechatroniker-frankfurt-25.json`
  - `/ba-studium/pc/v1/studienangebote` → `informatik-he-nw.json` bzw. `leer.json`
- [ ] **Step 3: Failing E2E schreiben** – `e2e/suche.spec.ts`
  ```ts
  test('Bundesland eintippen ergibt Bundesland-Chip und filtert', async ({ page }) => {
    await page.goto('/suchen');
    await page.getByLabel('Was?').fill('Mechatroniker');
    await page.getByLabel('Wo?').fill('nrw'); await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Nordrhein-Westfalen entfernen' })).toBeVisible();
    await page.getByLabel('Wo?').fill('Hessen'); await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Suchen' }).click();
    await expect(page.getByText(/^\d+ Treffer$/)).toHaveText(`${erwartetHeNw} Treffer`);  // aus Fixture berechnet, ohne Duplikate
  });
  test('unbekannter Ort zeigt Hinweis statt bundesweiter Suche', /* 'Frankfrt' → 'Ort nicht gefunden: Frankfrt' + 'Keine Treffer' */);
  test('Karte öffnet Sheet; ESC schließt; Fokus kehrt zurück', async ({ page }) => {
    /* Suche → erste Karte klicken → Dialog mit Titel sichtbar, Link 'Originalanzeige öffnen' hat href der Fixture
       → Escape → Dialog weg, erste Karte hat Fokus */
  });
  test('Mehr laden hängt die nächsten 30 an', /* 30 Karten → klicken → 60 (bzw. Rest) */);
  test('Keine Treffer', /* was 'xqzvwk' → 'Keine Treffer' */);
  test('fehlende Felder: Beginn nicht angegeben', /* Fixture-Eintrag ohne eintrittszeitraum → Karte zeigt 'Beginn: nicht angegeben' */);
  test('Barrierefreiheit mit Ergebnissen und offenem Sheet (hell/dunkel)', /* axe violations [] */);
  test('reduzierte Bewegung: Sheet ohne transform-Übergang', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' }); /* Sheet öffnen → getComputedStyle(dialog).transitionProperty enthält kein 'transform' */
  });
  ```
- [ ] **Step 4:** Run `npx vitest run src/suche/ui && npm run test:e2e -- e2e/suche.spec.ts` → FAIL.
- [ ] **Step 5: Komponenten umsetzen** – Der Client-Zustand liegt in `SuchSeite`. „Mehr laden“ ruft dieselbe Anfrage mit `seite + 1` auf und hängt an. Ein neues „Suchen“ ersetzt die Liste.
- [ ] **Step 6:** Run `npm test && npm run test:e2e` → PASS (iPhone und Desktop).
- [ ] **Step 7: Commit** – `git commit -m "feat: Such-Oberfläche mit Ergebnissen und Angebots-Sheet"`

### Task 12: Übergabe – Einrichtungsanleitung, Vertragstest-Workflow, Abschlussprüfung

**Files:**
- Create: `docs/einrichtung.md`, `.github/workflows/vertragstest.yml`
- Modify: `README.md`

**Interfaces:**
- Consumes: alle vorherigen Tasks.

- [ ] **Step 1: `docs/einrichtung.md` schreiben** (einfaches Deutsch, nummerierte Schritte, je Schritt „So sieht es aus, wenn es geklappt hat“)
  1. **Supabase:**
     - Neues Projekt anlegen, Region „Central EU (Frankfurt)“.
     - Im SQL-Editor den Inhalt von `supabase/migrations/0001_such_cache.sql` ausführen.
     - Unter Authentication → URL Configuration die Site URL `https://<vercel-domain>` und die Redirect-URL `https://<vercel-domain>/auth/callback` eintragen.
     - Unter Project Settings → API Keys den Publishable Key und den Secret Key kopieren.
  2. **Vercel:**
     - Mit GitHub anmelden, „Add New → Project“, `Ausbildungsapp` importieren.
     - Die Umgebungsvariablen aus `.env.example` eintragen: `ERLAUBTE_EMAILS` = eigene Adresse. **`E2E_OHNE_LOGIN` nicht setzen.**
     - „Deploy“ drücken.
  3. **Erster Login:** Adresse eingeben und den Link in der Mail öffnen.
  4. **iPhone:** Safari → Teilen → „Zum Home-Bildschirm“.
  5. **Fehlerhilfe:**
     - „Fehlende oder ungültige Einstellung: …“ → die genannte Variable in Vercel prüfen.
     - Keine Mail → Spam-Ordner prüfen; Supabase verschickt im Gratis-Tarif nur wenige Mails pro Stunde.
- [ ] **Step 2: `vertragstest.yml` anlegen** – `schedule: cron '30 5 * * *'` + `workflow_dispatch`, führt `npm ci && npm run test:vertrag` aus. README: Kurzbeschreibung, Befehle, Verweis auf `docs/einrichtung.md`.
- [ ] **Step 3: Abschlussprüfung**
  - Run `npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e && npm run test:vertrag` → alles grün.
  - Ausgabe festhalten.
- [ ] **Step 4: Commit und Push** – `git commit -m "docs: Einrichtungsanleitung und täglicher Vertragstest"` + `git push -u origin main`.
- [ ] **Step 5: Gemeinsam mit der Nutzerin/dem Nutzer** (nach deren Einrichtung)
  - Die Live-URL öffnen.
  - Eine nicht freigegebene Adresse bekommt keinen Zugang (neutraler Text, keine Mail).
  - Nach dem eigenen Login liefert „Mechatroniker, Ausbildung, Hessen + NRW“ Treffer in < 5 s.
  - Auf dem iPhone sitzt die Tab-Leiste unten und das Sheet gleitet von unten herein.
