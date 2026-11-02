'use client';

import { Chip } from '@/design/komponenten/Chip';
import { Knopf } from '@/design/komponenten/Knopf';
import type { Angebotsart, SuchFilter } from '../typen';
import styles from './suche.module.css';
import { WoEingabe } from './WoEingabe';

const ARTEN: { art: Angebotsart; name: string }[] = [
  { art: 'ausbildung', name: 'Ausbildung' },
  { art: 'dual', name: 'Duales Studium' },
  { art: 'studium', name: 'Studium' },
  { art: 'job', name: 'Job' },
];

interface SuchFormularProps {
  was: string;
  onWas: (was: string) => void;
  wasFehler?: string;
  arten: Angebotsart[];
  onArten: (arten: Angebotsart[]) => void;
  filter: SuchFilter;
  onFilter: (filter: SuchFilter) => void;
  wo: Parameters<typeof WoEingabe>[0];
  laedt: boolean;
  onSuchen: () => void;
}

export function SuchFormular(p: SuchFormularProps) {
  const umschalten = (art: Angebotsart) => {
    if (p.arten.includes(art)) {
      if (p.arten.length > 1) p.onArten(p.arten.filter((a) => a !== art));
    } else p.onArten([...p.arten, art]);
  };

  return (
    <form
      className={styles.formular}
      onSubmit={(e) => {
        e.preventDefault();
        p.onSuchen();
      }}
      noValidate
    >
      <div className={styles.gruppe}>
        <label htmlFor="was" className={styles.label}>
          Was?
        </label>
        <input
          id="was"
          className={styles.feld}
          value={p.was}
          placeholder="Beruf, Studienfach oder Stichwort"
          enterKeyHint="search"
          aria-invalid={!!p.wasFehler}
          aria-describedby={p.wasFehler ? 'was-fehler' : undefined}
          onChange={(e) => p.onWas(e.target.value)}
        />
        {p.wasFehler && (
          <p id="was-fehler" className={styles.fehler} role="alert">
            {p.wasFehler}
          </p>
        )}
      </div>

      <fieldset className={styles.gruppe}>
        <legend className={styles.label}>Angebotsart</legend>
        <div className={styles.chips}>
          {ARTEN.map(({ art, name }) => (
            <Chip key={art} ausgewaehlt={p.arten.includes(art)} onClick={() => umschalten(art)}>
              {name}
            </Chip>
          ))}
        </div>
      </fieldset>

      <WoEingabe {...p.wo} />

      <details className={styles.filter}>
        <summary>Weitere Filter</summary>
        <div className={styles.filterInhalt}>
          <div className={styles.gruppe}>
            <label htmlFor="beginn-ab" className={styles.label}>
              Beginn ab
            </label>
            <input
              id="beginn-ab"
              type="date"
              className={styles.feld}
              value={p.filter.beginnAb ?? ''}
              onChange={(e) => p.onFilter({ ...p.filter, beginnAb: e.target.value || undefined })}
            />
          </div>
          <label className={styles.haken}>
            <input
              type="checkbox"
              checked={!!p.filter.nurMitVerguetung}
              onChange={(e) => p.onFilter({ ...p.filter, nurMitVerguetung: e.target.checked || undefined })}
            />
            Nur mit Vergütungsangabe
          </label>
          <div className={styles.gruppe}>
            <label htmlFor="veroeffentlicht" className={styles.label}>
              Veröffentlicht
            </label>
            <select
              id="veroeffentlicht"
              className={styles.feld}
              value={p.filter.veroeffentlichtSeitTagen ?? ''}
              onChange={(e) => p.onFilter({ ...p.filter, veroeffentlichtSeitTagen: e.target.value ? (Number(e.target.value) as 7 | 30) : undefined })}
            >
              <option value="">egal</option>
              <option value="7">letzte 7 Tage</option>
              <option value="30">letzte 30 Tage</option>
            </select>
          </div>
          <p className={styles.fussnote}>Filter blenden Angebote ohne die jeweilige Angabe aus.</p>
        </div>
      </details>

      <Knopf type="submit" disabled={p.laedt}>
        Suchen
      </Knopf>
    </form>
  );
}
