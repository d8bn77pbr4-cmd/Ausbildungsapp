'use client';

import { Knopf } from '@/design/komponenten/Knopf';
import { Sheet } from '@/design/komponenten/Sheet';
import type { Angebot } from '../typen';
import { formatBeginn, formatDatum, formatOrt, formatVerguetung, quellenName } from './format';
import styles from './suche.module.css';

function Angabe({ name, wert }: { name: string; wert: string | null | undefined }) {
  return (
    <>
      <dt>{name}</dt>
      <dd className={wert ? undefined : styles.unbekannt}>{wert || 'nicht angegeben'}</dd>
    </>
  );
}

export function AngebotSheet({ angebot, onSchliessen }: { angebot: Angebot | null; onSchliessen: () => void }) {
  return (
    <Sheet
      offen={!!angebot}
      onSchliessen={onSchliessen}
      titel={angebot?.titel ?? ''}
      fuss={
        angebot && (
          <>
            <Knopf href={angebot.url} extern>
              Originalanzeige öffnen
            </Knopf>
            {angebot.weitereQuellen?.map((q) => (
              <a key={q.url} href={q.url} target="_blank" rel="noopener noreferrer">
                Auch bei {quellenName(q.quelle)} ansehen ↗
              </a>
            ))}
          </>
        )
      }
    >
      {angebot && (
        <dl className={styles.angaben}>
          <Angabe name="Anbieter" wert={angebot.anbieter} />
          <Angabe name="Ort" wert={angebot.ort.ort ? formatOrt(angebot) : null} />
          <Angabe name="Beginn" wert={angebot.beginn ? formatBeginn(angebot.beginn).replace('Beginn: ', '') : null} />
          <Angabe name="Vergütung" wert={formatVerguetung(angebot.verguetung)} />
          <Angabe name="Veröffentlicht" wert={angebot.veroeffentlicht ? formatDatum(angebot.veroeffentlicht) : null} />
          <Angabe name="Quelle" wert={quellenName(angebot.quelle)} />
        </dl>
      )}
    </Sheet>
  );
}
