-- Zwischenspeicher für Suchergebnisse (6 Stunden gültig, 7 Tage Notreserve).
create table if not exists public.such_cache (
  schluessel text primary key,
  ergebnis jsonb not null,
  geschrieben timestamptz not null default now(),
  ablauf timestamptz not null
);

create index if not exists such_cache_ablauf_idx on public.such_cache (ablauf);

-- Bewusst keine Policies: Zugriff nur serverseitig mit dem Secret Key.
alter table public.such_cache enable row level security;
