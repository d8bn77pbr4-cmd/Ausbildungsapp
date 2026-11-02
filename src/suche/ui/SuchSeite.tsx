'use client';

import { useState } from 'react';
import { Hinweis } from '@/design/komponenten/Hinweis';
import { zerlegeWoEingabe } from '../bundeslaender';
import type { Angebot, Angebotsart, Bundesland, Sortierung, SuchAnfrage, SuchErgebnis, SuchFilter } from '../typen';
import { AngebotSheet } from './AngebotSheet';
import { ErgebnisListe } from './ErgebnisListe';
import { SuchFormular } from './SuchFormular';
import styles from './suche.module.css';
import { MAX_ORTE } from './WoEingabe';

type Zustand =
  | { status: 'start' }
  | { status: 'laedt'; anfrage: SuchAnfrage }
  | { status: 'fertig'; anfrage: SuchAnfrage; ergebnis: SuchErgebnis; angebote: Angebot[] }
  | { status: 'fehler'; anfrage: SuchAnfrage };

async function rufeSucheAuf(anfrage: SuchAnfrage): Promise<{ ok: true; ergebnis: SuchErgebnis } | { ok: false; felder?: Record<string, string> }> {
  try {
    const antwort = await fetch('/api/suche', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(anfrage) });
    if (antwort.status === 400) return { ok: false, felder: (await antwort.json()).felder };
    if (!antwort.ok) return { ok: false };
    return { ok: true, ergebnis: await antwort.json() };
  } catch {
    return { ok: false };
  }
}

export function SuchSeite() {
  const [was, setWas] = useState('');
  const [wasFehler, setWasFehler] = useState<string>();
  const [arten, setArten] = useState<Angebotsart[]>(['ausbildung']);
  const [woText, setWoText] = useState('');
  const [orte, setOrte] = useState<{ ort: string; umkreisKm: number }[]>([]);
  const [bundeslaender, setBundeslaender] = useState<Bundesland[]>([]);
  const [filter, setFilter] = useState<SuchFilter>({});
  const [zustand, setZustand] = useState<Zustand>({ status: 'start' });
  const [mehrLaedt, setMehrLaedt] = useState(false);
  const [ausgewaehlt, setAusgewaehlt] = useState<Angebot | null>(null);

  /** Übernimmt den Text im Wo-Feld als Chip und liefert die neuen Listen (für sofortiges Suchen). */
  function uebernehmeWo() {
    const text = woText.trim();
    let neueOrte = orte;
    let neueLaender = bundeslaender;
    if (text) {
      const teile = zerlegeWoEingabe(text);
      neueLaender = [...bundeslaender, ...teile.bundeslaender.filter((bl) => !bundeslaender.includes(bl))];
      for (const ort of teile.orte) {
        if (neueOrte.length < MAX_ORTE && !neueOrte.some((o) => o.ort.toLowerCase() === ort.toLowerCase())) {
          neueOrte = [...neueOrte, { ort, umkreisKm: 25 }];
        }
      }
      setOrte(neueOrte);
      setBundeslaender(neueLaender);
      setWoText('');
    }
    return { neueOrte, neueLaender };
  }

  async function fuehreAus(anfrage: SuchAnfrage) {
    setZustand({ status: 'laedt', anfrage });
    const r = await rufeSucheAuf(anfrage);
    if (r.ok) setZustand({ status: 'fertig', anfrage, ergebnis: r.ergebnis, angebote: r.ergebnis.angebote });
    else if (r.felder?.was) {
      setWasFehler(r.felder.was);
      setZustand({ status: 'start' });
    } else setZustand({ status: 'fehler', anfrage });
  }

  function suchen(sortierung: Sortierung = zustand.status === 'start' ? 'relevanz' : zustand.anfrage.sortierung) {
    const { neueOrte, neueLaender } = uebernehmeWo();
    if (was.trim().length < 2) {
      setWasFehler('Bitte gib mindestens 2 Zeichen ein.');
      return;
    }
    setWasFehler(undefined);
    const hatFilter = Object.values(filter).some((v) => v !== undefined);
    fuehreAus({ was: was.trim(), arten, orte: neueOrte, bundeslaender: neueLaender, filter: hatFilter ? filter : undefined, sortierung, seite: 1 });
  }

  async function mehrLaden() {
    if (zustand.status !== 'fertig') return;
    setMehrLaedt(true);
    const anfrage = { ...zustand.anfrage, seite: zustand.ergebnis.seite + 1 };
    const r = await rufeSucheAuf(anfrage);
    setMehrLaedt(false);
    if (r.ok) setZustand({ status: 'fertig', anfrage, ergebnis: r.ergebnis, angebote: [...zustand.angebote, ...r.ergebnis.angebote] });
  }

  return (
    <>
      <SuchFormular
        was={was}
        onWas={(w) => {
          setWas(w);
          if (wasFehler) setWasFehler(undefined);
        }}
        wasFehler={wasFehler}
        arten={arten}
        onArten={setArten}
        filter={filter}
        onFilter={setFilter}
        laedt={zustand.status === 'laedt'}
        onSuchen={() => suchen()}
        wo={{
          text: woText,
          onText: setWoText,
          onHinzufuegen: uebernehmeWo,
          orte,
          bundeslaender,
          onOrtEntfernen: (i) => setOrte(orte.filter((_, j) => j !== i)),
          onBundeslandEntfernen: (bl) => setBundeslaender(bundeslaender.filter((b) => b !== bl)),
          onUmkreis: (i, km) => setOrte(orte.map((o, j) => (j === i ? { ...o, umkreisKm: km } : o))),
        }}
      />

      {zustand.status === 'laedt' && (
        <div className={`${styles.ergebnisse} ${styles.liste}`} aria-busy="true" aria-label="Suche läuft">
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.platzhalter} aria-hidden="true" />
          ))}
        </div>
      )}

      {zustand.status === 'fehler' && (
        <div className={styles.ergebnisse}>
          <Hinweis ton="warnung" aktion={{ label: 'Erneut versuchen', onClick: () => fuehreAus(zustand.anfrage) }}>
            Die Suche ist gerade nicht möglich.
          </Hinweis>
        </div>
      )}

      {zustand.status === 'fertig' && (
        <ErgebnisListe
          anfrage={zustand.anfrage}
          ergebnis={zustand.ergebnis}
          angebote={zustand.angebote}
          mehrLaedt={mehrLaedt}
          onMehr={mehrLaden}
          onOeffnen={setAusgewaehlt}
          onSortierung={(s) => fuehreAus({ ...zustand.anfrage, sortierung: s, seite: 1 })}
          onErneut={() => fuehreAus(zustand.anfrage)}
        />
      )}

      <AngebotSheet angebot={ausgewaehlt} onSchliessen={() => setAusgewaehlt(null)} />
    </>
  );
}
