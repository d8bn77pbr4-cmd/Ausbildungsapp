import { Suspense } from 'react';
import { Seitentitel } from '@/design/komponenten/Seitentitel';
import { Konto } from './Konto';
import styles from './profil.module.css';

export const metadata = { title: 'Profil · Bewerbungsradar' };

export default function Profil() {
  return (
    <>
      <Seitentitel>Profil</Seitentitel>
      <section className={styles.abschnitt} aria-labelledby="konto">
        <h2 id="konto">Konto</h2>
        <Suspense fallback={<p>…</p>}>
          <Konto />
        </Suspense>
      </section>
      <section className={styles.abschnitt} aria-labelledby="als-app">
        <h2 id="als-app">Als App aufs Handy</h2>
        <ul>
          <li>iPhone: In Safari auf Teilen tippen → „Zum Home-Bildschirm“.</li>
          <li>Android: In Chrome auf ⋮ tippen → „App installieren“.</li>
        </ul>
      </section>
    </>
  );
}
