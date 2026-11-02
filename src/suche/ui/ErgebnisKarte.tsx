import { Karte } from '@/design/komponenten/Karte';
import type { Angebot } from '../typen';
import { formatBeginn, formatOrt, formatVerguetung } from './format';
import styles from './suche.module.css';

/** Höchstens 4 Fakten (Titel, Anbieter, Ort + Entfernung, Beginn) + 1 Chip (Vergütung). */
export function ErgebnisKarte({ angebot, onOeffnen }: { angebot: Angebot; onOeffnen: () => void }) {
  const verguetung = formatVerguetung(angebot.verguetung);
  const anbieter = angebot.anbieter || 'unbekanntem Anbieter';
  return (
    <Karte>
      <h3 className={styles.kartenTitel}>
        <button type="button" className={styles.titelKnopf} onClick={onOeffnen}>
          {angebot.titel}
        </button>
      </h3>
      <p className={styles.anbieter}>{angebot.anbieter || 'Anbieter nicht angegeben'}</p>
      <p className={styles.fakt}>{formatOrt(angebot)}</p>
      <p className={styles.fakt}>{formatBeginn(angebot.beginn)}</p>
      <div className={styles.kartenFuss}>
        {verguetung && <span className={styles.verguetung}>{verguetung}</span>}
        <a
          href={angebot.url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.anzeigeLink}
        >
          Zur Anzeige<span className="nur-screenreader"> „{angebot.titel}“ bei {anbieter}</span>&nbsp;↗
        </a>
      </div>
    </Karte>
  );
}
