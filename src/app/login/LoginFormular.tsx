'use client';

import { useSearchParams } from 'next/navigation';
import { useActionState, useState } from 'react';
import { Knopf } from '@/design/komponenten/Knopf';
import type { AnmeldeZustand } from '@/lib/auth/anmeldung';
import { anfordern, bestaetigen } from './aktionen';
import styles from './login.module.css';

const LINK_FEHLER: Record<string, string> = {
  link_ungueltig: 'Der Link ist abgelaufen oder wurde in einem anderen Browser geöffnet. Fordere einen neuen Code an und gib ihn hier ein.',
  nicht_freigegeben: 'Diese Adresse ist nicht freigegeben.',
};

const START: AnmeldeZustand = { status: 'start' };

export function LoginFormular() {
  const fehlerAusLink = LINK_FEHLER[useSearchParams().get('fehler') ?? ''];
  const [angefordert, anfordernAktion, sendetMail] = useActionState(anfordern, START);
  const [geprueft, pruefenAktion, prueft] = useActionState(bestaetigen, START);
  const [neuStarten, setNeuStarten] = useState(0);

  const email = angefordert.status === 'gesendet' && neuStarten === 0 ? angefordert.email : null;

  if (!email) {
    return (
      <form action={(daten) => { setNeuStarten(0); anfordernAktion(daten); }} className={styles.formular}>
        {fehlerAusLink && <p className={styles.fehler} role="alert">{fehlerAusLink}</p>}
        <label htmlFor="email" className={styles.label}>E-Mail</label>
        <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required className={styles.feld} />
        {angefordert.status === 'fehler' && <p className={styles.fehler} role="alert">{angefordert.meldung}</p>}
        <Knopf type="submit" disabled={sendetMail}>Code anfordern</Knopf>
      </form>
    );
  }

  return (
    <form action={pruefenAktion} className={styles.formular}>
      <p className={styles.meldung} role="status">{meldungVon(angefordert)}</p>
      <input type="hidden" name="email" value={email} />
      <label htmlFor="code" className={styles.label}>Code aus der E-Mail</label>
      <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required className={`${styles.feld} ${styles.code}`} />
      {geprueft.status === 'fehler' && <p className={styles.fehler} role="alert">{geprueft.meldung}</p>}
      <Knopf type="submit" disabled={prueft}>Anmelden</Knopf>
      <Knopf variante="text" onClick={() => setNeuStarten((n) => n + 1)}>Andere Adresse</Knopf>
    </form>
  );
}

function meldungVon(z: AnmeldeZustand) {
  return z.status === 'gesendet' ? z.meldung : '';
}
