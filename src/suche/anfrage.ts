import { z } from 'zod';
import { BUNDESLAENDER, erkenneBundesland } from './bundeslaender';
import { sucheAusfuehren, type SuchDeps } from './planer';
import type { Bundesland, SuchAnfrage, SuchErgebnis } from './typen';

const eindeutig = <T>(liste: T[]) => [...new Set(liste)];
const UMKREIS = 'Umkreis zwischen 10 und 200 km.';

export const SuchAnfrageSchema = z.object({
  was: z.string().trim().min(2, 'Bitte gib mindestens 2 Zeichen ein.').max(100, 'Höchstens 100 Zeichen.'),
  arten: z
    .array(z.enum(['ausbildung', 'dual', 'studium', 'job']))
    .min(1, 'Wähle mindestens eine Angebotsart.')
    .transform(eindeutig),
  orte: z
    .array(
      z.object({
        ort: z.string().trim().min(2, 'Der Ort braucht mindestens 2 Zeichen.').max(80, 'Höchstens 80 Zeichen.'),
        umkreisKm: z.number().int().min(10, UMKREIS).max(200, UMKREIS),
      }),
    )
    .max(5, 'Höchstens 5 Orte.')
    .default([]),
  bundeslaender: z
    .array(z.enum(Object.keys(BUNDESLAENDER) as [Bundesland, ...Bundesland[]]))
    .default([])
    .transform(eindeutig),
  filter: z
    .object({
      beginnAb: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum im Format JJJJ-MM-TT.').optional(),
      nurMitVerguetung: z.boolean().optional(),
      veroeffentlichtSeitTagen: z.union([z.literal(7), z.literal(30)]).optional(),
    })
    .optional(),
  sortierung: z.enum(['relevanz', 'entfernung', 'beginn', 'neueste']).default('relevanz'),
  seite: z.number().int().min(1).max(100).default(1),
})
  // Bundesland-Namen im Ortsfeld nie als Ort an die Quelle schicken („Hessen“ ≠ „Hessen bei Halberstadt“).
  .transform((a) => {
    const bundeslaender = [...a.bundeslaender];
    const orte = a.orte.filter((o) => {
      const bl = erkenneBundesland(o.ort);
      if (!bl) return true;
      if (!bundeslaender.includes(bl)) bundeslaender.push(bl);
      return false;
    });
    return { ...a, orte, bundeslaender };
  }) satisfies z.ZodType<SuchAnfrage, unknown>;

export type SuchAntwort =
  | { status: 200; body: SuchErgebnis }
  | { status: 400; body: { fehler: 'ungueltige_anfrage'; felder: Record<string, string> } };

/** Prüft den Body der Such-API und führt die Suche aus. Ungültige Eingaben ergeben 400 mit Feldmeldungen. */
export async function verarbeiteSuchAnfrage(body: unknown, deps: SuchDeps): Promise<SuchAntwort> {
  const geprueft = SuchAnfrageSchema.safeParse(body);
  if (!geprueft.success) {
    const felder: Record<string, string> = {};
    for (const fehler of geprueft.error.issues) {
      const pfad = fehler.path.join('.') || 'anfrage';
      felder[pfad] ??= fehler.message;
    }
    return { status: 400, body: { fehler: 'ungueltige_anfrage', felder } };
  }
  return { status: 200, body: await sucheAusfuehren(geprueft.data, deps) };
}
