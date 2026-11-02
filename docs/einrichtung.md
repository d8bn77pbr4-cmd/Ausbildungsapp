# Bewerbungsradar einrichten

Diese Anleitung bringt deine App ins Internet. Danach hast du einen Link, den du auf dem Handy als App speichern kannst. Du brauchst etwa 15 Minuten. Alle Dienste sind kostenlos.

Du brauchst: dein GitHub-Konto (hast du schon) und eine E-Mail-Adresse.

> Vercel baut automatisch den Branch `main` deines Repositorys `Ausbildungsapp`. Jede Änderung, die dort landet, ist ein bis zwei Minuten später live – du musst nichts weiter tun.

---

## 1. Supabase: Datenbank und Login

1. Gehe auf [supabase.com](https://supabase.com) → **Start your project** → mit GitHub anmelden.
2. **New project**:
   - Name: `bewerbungsradar`
   - Database Password: auf **Generate a password** klicken (du brauchst es später nicht)
   - Region: **Central EU (Frankfurt)** ← wichtig für den Datenschutz
   - **Create new project** und ca. 1 Minute warten.
3. Links im Menü **SQL Editor** → **New query**. Den kompletten Inhalt der Datei [`supabase/migrations/0001_such_cache.sql`](../supabase/migrations/0001_such_cache.sql) hineinkopieren → **Run**.
   - ✅ Geklappt, wenn unten „Success. No rows returned“ steht.
4. Links **Project Settings** (Zahnrad) → **API Keys**. Notiere dir drei Werte:
   - **Project URL** (steht unter *Data API* bzw. oben, beginnt mit `https://` und endet auf `.supabase.co`)
   - **Publishable key** (beginnt mit `sb_publishable_`)
   - **Secret key** (beginnt mit `sb_secret_`, auf „Reveal“ klicken) – **geheim halten, nirgends posten**
5. Links **Authentication** → **Emails** (bzw. *Email Templates*). Öffne nacheinander die Vorlagen **Magic Link** und **Confirm signup** und füge in beide ganz oben diese Zeile ein:
   ```html
   <h2>Dein Code: {{ .Token }}</h2>
   ```
   → **Save**. Warum? Auf dem iPhone teilt die App vom Home-Bildschirm keine Anmeldung mit Safari. Mit dem Code meldest du dich direkt in der App an.

## 2. Vercel: die App online stellen

1. Gehe auf [vercel.com](https://vercel.com) → **Sign Up** → **Continue with GitHub**.
2. **Add New…** → **Project** → bei `Ausbildungsapp` auf **Import**.
3. Klappe **Environment Variables** auf und trage diese vier Werte ein (Name links, Wert rechts):

   | Name | Wert |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | deine Project URL aus Schritt 1.4 |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | dein Publishable key |
   | `SUPABASE_SECRET_KEY` | dein Secret key |
   | `ERLAUBTE_EMAILS` | deine E-Mail-Adresse (mehrere mit Komma trennen) |

   ⚠️ **`E2E_OHNE_LOGIN` niemals eintragen** – das ist nur für automatische Tests.
4. **Deploy** und ca. 1–2 Minuten warten.
   - ✅ Geklappt, wenn Konfetti erscheint. Klicke auf das Vorschaubild – du landest auf der Anmeldeseite. Die Adresse oben (z. B. `https://ausbildungsapp.vercel.app`) ist **dein Link**.

## 3. Supabase den Link mitteilen

1. In Supabase: **Authentication** → **URL Configuration**.
2. **Site URL**: dein Link aus Schritt 2.4, z. B. `https://ausbildungsapp.vercel.app`
3. **Redirect URLs** → **Add URL**: dein Link + `/auth/callback`, z. B. `https://ausbildungsapp.vercel.app/auth/callback` → **Save**.

## 4. Link aufs Handy speichern und anmelden

**iPhone (Safari):**
1. Deinen Link in **Safari** öffnen.
2. Unten auf **Teilen** (Quadrat mit Pfeil) → **Zum Home-Bildschirm** → **Hinzufügen**.
3. Die App **vom Home-Bildschirm aus** öffnen, E-Mail eingeben → **Code anfordern**.
4. Den Code aus der Mail eintippen → **Anmelden**. Fertig.

**Android (Chrome):**
1. Deinen Link in **Chrome** öffnen.
2. Oben rechts **⋮** → **App installieren** (oder „Zum Startbildschirm hinzufügen“).
3. App öffnen, E-Mail eingeben, Code aus der Mail eintippen.

## Wenn etwas nicht klappt

| Problem | Lösung |
|---|---|
| Seite zeigt einen Fehler mit „Fehlende oder ungültige Einstellung: …“ | Die genannte Variable in Vercel prüfen (Project → Settings → Environment Variables), dann **Deployments → Redeploy**. |
| Keine Mail angekommen | Spam-Ordner prüfen. Supabase verschickt im Gratis-Tarif nur wenige Mails pro Stunde – kurz warten. Hast du deine Adresse in `ERLAUBTE_EMAILS` richtig geschrieben? |
| Mail enthält keinen Code | Schritt 1.5 wiederholen (beide Vorlagen). |
| „Der Link ist abgelaufen …“ | Einfach den Code aus derselben Mail in der App eingeben. |
