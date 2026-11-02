import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { zugriffsEntscheidung } from '@/lib/auth/zugriff';
import { leseUmgebung } from '@/lib/umgebung';

/** Läuft vor jeder Anfrage: frischt die Sitzung auf und lässt nur freigegebene Adressen hinein. */
export async function proxy(request: NextRequest) {
  const u = leseUmgebung(process.env);
  const pfad = request.nextUrl.pathname;
  const basis = { pfad, erlaubteEmails: u.erlaubteEmails, ohneLogin: u.e2eOhneLogin };
  if (zugriffsEntscheidung({ ...basis, email: null }) === 'weiter') return NextResponse.next();

  let antwort = NextResponse.next({ request });
  const supabase = createServerClient(u.supabaseUrl, u.supabasePublishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (liste) => {
        liste.forEach(({ name, value }) => request.cookies.set(name, value));
        antwort = NextResponse.next({ request });
        liste.forEach(({ name, value, options }) => antwort.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  const entscheidung = zugriffsEntscheidung({ ...basis, email: data.user?.email ?? null });

  if (entscheidung === 'weiter') return antwort;
  if (entscheidung === 'api_nicht_angemeldet') return NextResponse.json({ fehler: 'nicht_angemeldet' }, { status: 401 });

  if (entscheidung === 'nicht_freigegeben') await supabase.auth.signOut();
  const ziel = new URL(entscheidung === 'nicht_freigegeben' ? '/login?fehler=nicht_freigegeben' : '/login', request.url);
  const umleitung = NextResponse.redirect(ziel);
  antwort.cookies.getAll().forEach((c) => umleitung.cookies.set(c));
  return umleitung;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
