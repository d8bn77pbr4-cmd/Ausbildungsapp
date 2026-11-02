import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

const GUELTIG_MS = 6 * 60 * 60 * 1000; // 6 Stunden
const RESERVE_MS = 7 * 24 * 60 * 60 * 1000; // abgelaufene Einträge 7 Tage als Notreserve
const AUFRAEUMEN_MS = 10 * 60 * 1000;

export interface CacheTreffer<T> {
  wert: T;
  gueltig: boolean;
  geschrieben: string; // ISO-Zeitpunkt
}

export interface SuchCache {
  /** Liefert auch abgelaufene Einträge (≤ 7 Tage), damit bei Ausfällen ein älterer Stand gezeigt werden kann. */
  lies<T>(schluessel: string): Promise<CacheTreffer<T> | null>;
  /** Speichert für 6 Stunden. */
  schreibe<T>(schluessel: string, wert: T): Promise<void>;
}

function stabil(wert: unknown): unknown {
  if (Array.isArray(wert)) return wert.map(stabil);
  if (wert && typeof wert === 'object') {
    return Object.fromEntries(
      Object.entries(wert as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([k, v]) => [k, stabil(v)]),
    );
  }
  return wert;
}

/** sha256 über JSON mit sortierten Schlüsseln – gleiche Abfrage, gleicher Schlüssel. */
export function cacheSchluessel(teile: unknown): string {
  return createHash('sha256').update(JSON.stringify(stabil(teile))).digest('hex');
}

function bewerte<T>(wert: T, geschrieben: Date, ablauf: Date, jetzt: Date): CacheTreffer<T> | null {
  if (jetzt.getTime() > ablauf.getTime() + RESERVE_MS) return null;
  return { wert, gueltig: jetzt.getTime() <= ablauf.getTime(), geschrieben: geschrieben.toISOString() };
}

/** Cache im Arbeitsspeicher – für Tests und lokale Entwicklung. */
export class SpeicherCache implements SuchCache {
  private eintraege = new Map<string, { wert: unknown; geschrieben: Date; ablauf: Date }>();

  constructor(private jetzt: () => Date = () => new Date()) {}

  async lies<T>(schluessel: string): Promise<CacheTreffer<T> | null> {
    const e = this.eintraege.get(schluessel);
    if (!e) return null;
    const treffer = bewerte(e.wert as T, e.geschrieben, e.ablauf, this.jetzt());
    if (!treffer) this.eintraege.delete(schluessel);
    return treffer;
  }

  async schreibe<T>(schluessel: string, wert: T): Promise<void> {
    const jetzt = this.jetzt();
    this.eintraege.set(schluessel, { wert, geschrieben: jetzt, ablauf: new Date(jetzt.getTime() + GUELTIG_MS) });
  }
}

/** Cache in der Supabase-Tabelle such_cache. Fehler werden geloggt und brechen die Suche nie ab. */
export class SupabaseCache implements SuchCache {
  private letztesAufraeumen = 0;

  constructor(
    private client: SupabaseClient,
    private jetzt: () => Date = () => new Date(),
  ) {}

  async lies<T>(schluessel: string): Promise<CacheTreffer<T> | null> {
    try {
      const { data, error } = await this.client
        .from('such_cache')
        .select('ergebnis, geschrieben, ablauf')
        .eq('schluessel', schluessel)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return bewerte(data.ergebnis as T, new Date(data.geschrieben), new Date(data.ablauf), this.jetzt());
    } catch (fehler) {
      console.error('Such-Cache: Lesen fehlgeschlagen', fehler);
      return null;
    }
  }

  async schreibe<T>(schluessel: string, wert: T): Promise<void> {
    const jetzt = this.jetzt();
    try {
      const { error } = await this.client.from('such_cache').upsert({
        schluessel,
        ergebnis: wert,
        geschrieben: jetzt.toISOString(),
        ablauf: new Date(jetzt.getTime() + GUELTIG_MS).toISOString(),
      });
      if (error) throw error;
      if (jetzt.getTime() - this.letztesAufraeumen >= AUFRAEUMEN_MS) {
        this.letztesAufraeumen = jetzt.getTime();
        await this.client
          .from('such_cache')
          .delete()
          .lt('ablauf', new Date(jetzt.getTime() - RESERVE_MS).toISOString());
      }
    } catch (fehler) {
      console.error('Such-Cache: Schreiben fehlgeschlagen', fehler);
    }
  }
}
