import { Suspense } from 'react';
import { LoginFormular } from './LoginFormular';
import styles from './login.module.css';

export const metadata = { title: 'Anmelden · Bewerbungsradar' };

export default function Login() {
  return (
    <main className={styles.seite}>
      <div className={styles.karte}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" className={styles.icon} />
        <h1 className={styles.titel}>Bewerbungsradar</h1>
        <p className={styles.untertitel}>Melde dich mit deiner E-Mail-Adresse an.</p>
        <Suspense>
          <LoginFormular />
        </Suspense>
      </div>
    </main>
  );
}
