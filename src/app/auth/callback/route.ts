import { NextResponse, type NextRequest } from 'next/server';
import { erstelleServerClient } from '@/lib/supabase/server';

/** Ziel des Anmeldelinks aus der E-Mail. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (code) {
    const supabase = await erstelleServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL('/heute', request.url));
  }
  return NextResponse.redirect(new URL('/login?fehler=link_ungueltig', request.url));
}
