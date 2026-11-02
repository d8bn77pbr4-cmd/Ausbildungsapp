'use client';

import { Hinweis } from '@/design/komponenten/Hinweis';
import { Knopf } from '@/design/komponenten/Knopf';
import { LeererZustand } from '@/design/komponenten/LeererZustand';
import { direktLinks } from '../direktlinks';
import type { Angebot, Sortierung, SuchAnfrage, SuchErgebnis } from '../typen';
import { ErgebnisKarte } from './ErgebnisKarte';
import { hinweisText } from './format';
import styles from './suche.module.css';

const SORTIERUNGEN: { wert: Sortierung; name: string }[] = [
  { wert: 'relevanz', name: 'Relevanz' },
  { wert: 'entfernung', name: 'Entfernung' },
  { wert: 'beginn', name: 'Beginn' },
  { wert: 'neueste', name: 'Neueste' },
];

interface ErgebnisListeProps {
  anfrage: SuchAnfrage;
  ergebnis: SuchErgebnis;
  angebote: Angebot[];
  mehrLaedt: boolean;
  onMehr: () => void;
  onOeffnen: (a: Angebot) => void;
  onSortierung: (s: Sortierung) => void;
  onErneut: () => void;
}

export function ErgebnisListe(p: ErgebnisListeProps) {
  const quelleWeg = p.ergebnis.hinweise.some((h) => h.typ === 'quelle_nicht_erreichbar');
  const leer = p.ergebnis.gesamt === 0;

  return (
    <section className={styles.ergebnisse} aria-label="Ergebnisse">
      {p.ergebnis.hinweise.map((h, i) => (
        <Hinweis key={i} ton={h.typ === 'ort_bereinigt' ? 'info' : 'warnung'}>
          {hinweisText(h)}
        </Hinweis>
      ))}

      {leer && quelleWeg && (
        <Hinweis ton="warnung" aktion={{ label: 'Erneut versuchen', onClick: p.onErneut }}>
          Die Suche ist gerade nicht möglich.
        </Hinweis>
      )}
      {leer && !quelleWeg && <LeererZustand titel="Keine Treffer" text="Versuch einen größeren Umkreis oder einen allgemeineren Begriff." />}

      {!leer && (
        <>
          <div className={styles.kopf}>
            <h2 className={styles.anzahl}>{p.ergebnis.gesamt.toLocaleString('de-DE')} Treffer</h2>
            <label className={styles.sortierung}>
              Sortierung
              <select value={p.anfrage.sortierung} onChange={(e) => p.onSortierung(e.target.value as Sortierung)}>
                {SORTIERUNGEN.map((s) => (
                  <option key={s.wert} value={s.wert}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className={styles.liste}>
            {p.angebote.map((a) => (
              <ErgebnisKarte key={a.id} angebot={a} onOeffnen={() => p.onOeffnen(a)} />
            ))}
          </div>
          {p.ergebnis.seite < p.ergebnis.seiten && (
            <div className={styles.mehr}>
              <Knopf variante="sekundaer" onClick={p.onMehr} disabled={p.mehrLaedt}>
                Mehr laden
              </Knopf>
            </div>
          )}
        </>
      )}

      <nav className={styles.portale} aria-labelledby="portale-titel">
        <h2 id="portale-titel">Auch auf anderen Portalen suchen</h2>
        <ul className={styles.portalListe}>
          {direktLinks(p.anfrage).map((l) => (
            <li key={l.name}>
              <a href={l.url} target="_blank" rel="noopener noreferrer" aria-label={`Auf ${l.name} suchen`}>
                {l.name} ↗
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
