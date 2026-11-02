import { ImageResponse } from 'next/og';
import { IconMotiv } from '../../icon-motiv';

const ERLAUBT = new Set([192, 512]);

export async function GET(_req: Request, { params }: { params: Promise<{ groesse: string }> }) {
  const groesse = Number((await params).groesse);
  if (!ERLAUBT.has(groesse)) return new Response('Nicht gefunden', { status: 404 });
  return new ImageResponse(<IconMotiv groesse={groesse} />, { width: groesse, height: groesse });
}
