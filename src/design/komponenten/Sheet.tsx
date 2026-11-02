'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import styles from './Sheet.module.css';

interface SheetProps {
  offen: boolean;
  onSchliessen: () => void;
  titel: string;
  children: ReactNode;
  fuss?: ReactNode;
}

/** Modales Blatt auf Basis von <dialog>: ESC und Tippen daneben schließen, der Fokus kehrt zum Auslöser zurück. */
export function Sheet({ offen, onSchliessen, titel, children, fuss }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titelId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (offen && !dialog.open) dialog.showModal();
    if (!offen && dialog.open) dialog.close();
  }, [offen]);

  return (
    <dialog
      ref={ref}
      className={styles.sheet}
      aria-labelledby={titelId}
      onClose={onSchliessen}
      onClick={(e) => {
        if (e.target === e.currentTarget) onSchliessen();
      }}
    >
      <div className={styles.inhalt}>
        <div className={styles.griff} aria-hidden="true" />
        <div className={styles.kopf}>
          <h2 id={titelId} className={styles.titel}>
            {titel}
          </h2>
          <button type="button" className={styles.schliessen} onClick={onSchliessen} aria-label="Schließen">
            ×
          </button>
        </div>
        <div className={styles.koerper}>{children}</div>
        {fuss && <div className={styles.fuss}>{fuss}</div>}
      </div>
    </dialog>
  );
}
