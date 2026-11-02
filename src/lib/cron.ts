import { timingSafeEqual } from 'node:crypto';

/** Vercel Cron sendet „Authorization: Bearer <CRON_SECRET>“. Ohne (ausreichend langes) Geheimnis bleibt alles gesperrt. */
export function cronErlaubt(authorization: string | null, geheimnis: string | undefined): boolean {
  if (!geheimnis || geheimnis.length < 16 || !authorization) return false;
  const erwartet = Buffer.from(`Bearer ${geheimnis}`);
  const erhalten = Buffer.from(authorization);
  return erwartet.length === erhalten.length && timingSafeEqual(erwartet, erhalten);
}
