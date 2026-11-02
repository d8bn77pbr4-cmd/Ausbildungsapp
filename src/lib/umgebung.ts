import { z } from 'zod';

export interface Umgebung {
  supabaseUrl: string;
  supabasePublishableKey: string;
  supabaseSecretKey: string;
  erlaubteEmails: string[];
  e2eOhneLogin: boolean;
  suchCache: 'supabase' | 'speicher';
  baJobsUrl: string;
  baStudiumUrl: string;
  cronGeheimnis?: string;
}

const emailListe = z
  .string()
  .transform((s) =>
    s
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  )
  .pipe(z.array(z.email()).min(1));

const Schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  SUPABASE_SECRET_KEY: z.string().min(20),
  ERLAUBTE_EMAILS: emailListe,
  E2E_OHNE_LOGIN: z.string().optional(),
  NODE_ENV: z.string().optional(),
  SUCH_CACHE: z.enum(['supabase', 'speicher']).default('supabase'),
  BA_JOBS_URL: z.url().default('https://rest.arbeitsagentur.de/jobboerse/jobsuche-service'),
  BA_STUDIUM_URL: z.url().default('https://rest.arbeitsagentur.de/infosysbub/studisu'),
  CRON_SECRET: z.string().optional(),
});

/** Liest und prüft alle Einstellungen. Wirft eine verständliche Meldung, wenn etwas fehlt. */
export function leseUmgebung(env: Record<string, string | undefined>): Umgebung {
  const ergebnis = Schema.safeParse(env);
  if (!ergebnis.success) {
    const feld = String(ergebnis.error.issues[0]?.path[0] ?? 'unbekannt');
    throw new Error(`Fehlende oder ungültige Einstellung: ${feld} – siehe docs/einrichtung.md`);
  }
  const e = ergebnis.data;
  return {
    supabaseUrl: e.NEXT_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    supabaseSecretKey: e.SUPABASE_SECRET_KEY,
    erlaubteEmails: e.ERLAUBTE_EMAILS,
    e2eOhneLogin: e.E2E_OHNE_LOGIN === '1' && e.NODE_ENV !== 'production',
    suchCache: e.SUCH_CACHE,
    baJobsUrl: e.BA_JOBS_URL.replace(/\/$/, ''),
    baStudiumUrl: e.BA_STUDIUM_URL.replace(/\/$/, ''),
    cronGeheimnis: e.CRON_SECRET || undefined,
  };
}
