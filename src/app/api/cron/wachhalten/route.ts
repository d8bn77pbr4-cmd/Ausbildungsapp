import { cronErlaubt } from '@/lib/cron';
import { erstelleDienstClient } from '@/lib/supabase/server';
import { leseUmgebung } from '@/lib/umgebung';

/**
 * Täglicher Weckruf (vercel.json → crons): Ein kostenloses Supabase-Projekt pausiert sonst
 * nach 7 Tagen ohne Nutzung – und dann klappt auch der Login nicht mehr.
 */
export async function GET(request: Request) {
  const u = leseUmgebung(process.env);
  if (!cronErlaubt(request.headers.get('authorization'), u.cronGeheimnis)) {
    return Response.json({ fehler: 'nicht_erlaubt' }, { status: 401 });
  }
  const { error } = await erstelleDienstClient().from('such_cache').select('schluessel').limit(1);
  if (error) return Response.json({ fehler: 'datenbank' }, { status: 502 });
  return Response.json({ ok: true });
}
