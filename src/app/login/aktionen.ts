'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { anmeldungAnfordern, codeBestaetigen, type AnmeldeZustand } from '@/lib/auth/anmeldung';
import { erstelleServerClient } from '@/lib/supabase/server';
import { leseUmgebung } from '@/lib/umgebung';

export async function anfordern(_vorher: AnmeldeZustand, formular: FormData): Promise<AnmeldeZustand> {
  const u = leseUmgebung(process.env);
  const h = await headers();
  const herkunft = h.get('origin') ?? `https://${h.get('x-forwarded-host') ?? h.get('host')}`;
  return anmeldungAnfordern(String(formular.get('email') ?? ''), {
    erlaubteEmails: u.erlaubteEmails,
    sende: async (email) => {
      const supabase = await erstelleServerClient();
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${herkunft}/auth/callback` } });
      if (error) throw error;
    },
  });
}

export async function bestaetigen(_vorher: AnmeldeZustand, formular: FormData): Promise<AnmeldeZustand> {
  const u = leseUmgebung(process.env);
  const ergebnis = await codeBestaetigen(String(formular.get('email') ?? ''), String(formular.get('code') ?? ''), {
    erlaubteEmails: u.erlaubteEmails,
    pruefe: async (email, token) => {
      const supabase = await erstelleServerClient();
      const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
      return !error;
    },
  });
  if (ergebnis.status === 'angemeldet') redirect('/heute');
  return ergebnis;
}

export async function abmelden() {
  const u = leseUmgebung(process.env);
  if (!u.e2eOhneLogin) {
    const supabase = await erstelleServerClient();
    await supabase.auth.signOut();
  }
  redirect('/login');
}
