import { erstelleDienstClient } from '@/lib/supabase/server';
import type { Umgebung } from '@/lib/umgebung';
import { SpeicherCache, SupabaseCache, type SuchCache } from './cache';

let speicher: SpeicherCache | undefined;
let datenbank: SupabaseCache | undefined;

/** Wählt den Cache laut Einstellung SUCH_CACHE; eine Instanz pro Server-Prozess. */
export function erstelleSuchCache(u: Umgebung): SuchCache {
  if (u.suchCache === 'speicher') return (speicher ??= new SpeicherCache());
  return (datenbank ??= new SupabaseCache(erstelleDienstClient()));
}
