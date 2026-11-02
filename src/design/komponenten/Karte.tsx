import type { ReactNode } from 'react';
import styles from './Karte.module.css';

export function Karte({ children }: { children: ReactNode }) {
  return <article className={styles.karte}>{children}</article>;
}
