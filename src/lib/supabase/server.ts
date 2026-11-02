import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { leseUmgebung } from '@/lib/umgebung';

/** Supabase mit den Cookies der aktuellen Anfrage (Login-Sitzung). Nur auf dem Server. */
export async function erstelleServerClient() {
  const u = leseUmgebung(process.env);
  const cookieSpeicher = await cookies();
  return createServerClient(u.supabaseUrl, u.supabasePublishableKey, {
    cookies: {
      getAll: () => cookieSpeicher.getAll(),
      setAll: (liste) => {
        try {
          liste.forEach(({ name, value, options }) => cookieSpeicher.set(name, value, options));
        } catch {
          // In Server Components dürfen keine Cookies gesetzt werden; proxy.ts frischt die Sitzung auf.
        }
      },
    },
  });
}

/** Supabase mit dem geheimen Schlüssel – umgeht Row Level Security. Niemals im Browser verwenden. */
export function erstelleDienstClient() {
  const u = leseUmgebung(process.env);
  return createClient(u.supabaseUrl, u.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
