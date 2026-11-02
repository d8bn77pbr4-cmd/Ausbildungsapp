'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import styles from './TabLeiste.module.css';

const strich = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const TABS: { name: string; pfad: string; symbol: ReactNode }[] = [
  {
    name: 'Heute',
    pfad: '/heute',
    symbol: (<><rect x="3.5" y="5" width="17" height="15" rx="3" {...strich} /><path d="M3.5 9.5h17M8 3v4M16 3v4" {...strich} /><circle cx="12" cy="14.5" r="1.6" fill="currentColor" /></>),
  },
  {
    name: 'Suchen',
    pfad: '/suchen',
    symbol: (<><circle cx="10.5" cy="10.5" r="6" {...strich} /><path d="m15 15 5 5" {...strich} /></>),
  },
  {
    name: 'Bewerbungen',
    pfad: '/bewerbungen',
    symbol: (<><rect x="3.5" y="7" width="17" height="12.5" rx="2.5" {...strich} /><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3.5 12.5h17" {...strich} /></>),
  },
  {
    name: 'Postfach',
    pfad: '/postfach',
    symbol: (<><rect x="3.5" y="5.5" width="17" height="13" rx="2.5" {...strich} /><path d="m4.5 7 7.5 6 7.5-6" {...strich} /></>),
  },
  {
    name: 'Profil',
    pfad: '/profil',
    symbol: (<><circle cx="12" cy="8.5" r="3.8" {...strich} /><path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" {...strich} /></>),
  },
];

/** Hauptnavigation: auf dem Handy als Glas-Leiste unten, ab 900 px als Seitenleiste links. */
export function TabLeiste() {
  const pfad = usePathname();
  return (
    <nav aria-label="Hauptnavigation" className={styles.leiste}>
      <ul className={styles.liste}>
        {TABS.map((tab) => {
          const aktiv = pfad === tab.pfad || pfad.startsWith(tab.pfad + '/');
          return (
            <li key={tab.pfad} className={styles.eintrag}>
              <Link href={tab.pfad} className={styles.tab} aria-current={aktiv ? 'page' : undefined}>
                <svg viewBox="0 0 24 24" className={styles.symbol} aria-hidden="true">
                  {tab.symbol}
                </svg>
                {tab.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
