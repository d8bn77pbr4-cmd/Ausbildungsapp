import type { ReactNode } from 'react';
import styles from './Chip.module.css';

interface ChipProps {
  ausgewaehlt?: boolean;
  onClick?: () => void;
  onEntfernen?: () => void;
  entfernenLabel?: string;
  /** Für Chips mit aufklappbarem Bereich (z. B. Umkreis-Regler). */
  ausgeklappt?: boolean;
  children: ReactNode;
}

/** Auswahl-Chip (aria-pressed) oder Eingabe-Chip mit ×-Knopf. */
export function Chip({ ausgewaehlt, onClick, onEntfernen, entfernenLabel, ausgeklappt, children }: ChipProps) {
  if (onEntfernen) {
    return (
      <span className={styles.chip}>
        {onClick ? (
          <button type="button" className={styles.knopf} onClick={onClick} aria-expanded={ausgeklappt}>
            {children}
          </button>
        ) : (
          <span className={styles.knopf} style={{ display: 'inline-flex', alignItems: 'center' }}>
            {children}
          </span>
        )}
        <button type="button" className={styles.entfernen} onClick={onEntfernen} aria-label={entfernenLabel}>
          ×
        </button>
      </span>
    );
  }
  return (
    <button type="button" className={styles.chip} aria-pressed={ausgewaehlt} onClick={onClick}>
      {children}
    </button>
  );
}
