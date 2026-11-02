import { leseUmgebung } from '@/lib/umgebung';
import { erstelleSuchDeps } from '@/suche/abhaengigkeiten';
import { verarbeiteSuchAnfrage } from '@/suche/anfrage';

export async function POST(request: Request) {
  const u = leseUmgebung(process.env);
  const body: unknown = await request.json().catch(() => null);
  // Bricht der Browser die Anfrage ab, werden auch die Abrufe bei den Quellen beendet.
  const antwort = await verarbeiteSuchAnfrage(body, { ...erstelleSuchDeps(u), abbruch: request.signal });
  return Response.json(antwort.body, { status: antwort.status });
}
