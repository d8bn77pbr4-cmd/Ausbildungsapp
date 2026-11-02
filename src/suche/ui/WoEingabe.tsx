'use client';

import { useState } from 'react';
import { Chip } from '@/design/komponenten/Chip';
import { Knopf } from '@/design/komponenten/Knopf';
import { BUNDESLAENDER } from '../bundeslaender';
import type { Bundesland } from '../typen';
import styles from './suche.module.css';

export const MAX_ORTE = 5;

interface WoEingabeProps {
  text: string;
  onText: (text: string) => void;
  onHinzufuegen: () => void;
  orte: { ort: string; umkreisKm: number }[];
  bundeslaender: Bundesland[];
  onOrtEntfernen: (index: number) => void;
  onBundeslandEntfernen: (bl: Bundesland) => void;
  onUmkreis: (index: number, km: number) => void;
}

/** „Wo?“: Orte (mit Umkreis) und Bundesländer als Chips. Ein Bundesland-Name wird automatisch erkannt. */
export function WoEingabe(p: WoEingabeProps) {
  const [offenerOrt, setOffenerOrt] = useState<number | null>(null);
  const voll = p.orte.length >= MAX_ORTE;
  const leer = p.orte.length === 0 && p.bundeslaender.length === 0;

  return (
    <div className={styles.gruppe}>
      <label htmlFor="wo" className={styles.label}>
        Wo?
      </label>
      <div className={styles.zeile}>
        <input
          id="wo"
          className={styles.feld}
          value={p.text}
          placeholder="Ort, PLZ oder Bundesland"
          autoComplete="address-level2"
          enterKeyHint="done"
          onChange={(e) => p.onText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              p.onHinzufuegen();
            }
          }}
        />
        <Knopf variante="sekundaer" onClick={p.onHinzufuegen} disabled={!p.text.trim()}>
          Hinzufügen
        </Knopf>
      </div>
      {(p.orte.length > 0 || p.bundeslaender.length > 0) && (
        <div className={styles.chips}>
          {p.bundeslaender.map((bl) => (
            <Chip key={bl} onEntfernen={() => p.onBundeslandEntfernen(bl)} entfernenLabel={`${BUNDESLAENDER[bl]} entfernen`}>
              {BUNDESLAENDER[bl]}
            </Chip>
          ))}
          {p.orte.map((o, i) => (
            <Chip
              key={`${o.ort}-${i}`}
              onClick={() => setOffenerOrt(offenerOrt === i ? null : i)}
              ausgeklappt={offenerOrt === i}
              onEntfernen={() => {
                setOffenerOrt(null);
                p.onOrtEntfernen(i);
              }}
              entfernenLabel={`${o.ort} entfernen`}
            >
              {o.ort} · {o.umkreisKm} km
            </Chip>
          ))}
        </div>
      )}
      {offenerOrt !== null && p.orte[offenerOrt] && (
        <div className={styles.regler}>
          <label htmlFor="umkreis">Umkreis um {p.orte[offenerOrt].ort}</label>
          <input
            id="umkreis"
            type="range"
            min={10}
            max={200}
            step={5}
            value={p.orte[offenerOrt].umkreisKm}
            onChange={(e) => p.onUmkreis(offenerOrt, Number(e.target.value))}
          />
          <output htmlFor="umkreis">{p.orte[offenerOrt].umkreisKm} km</output>
        </div>
      )}
      {leer && <p className={styles.fussnote}>Ohne Ort: ganz Deutschland</p>}
      {voll && <p className={styles.fussnote}>Höchstens {MAX_ORTE} Orte.</p>}
    </div>
  );
}
