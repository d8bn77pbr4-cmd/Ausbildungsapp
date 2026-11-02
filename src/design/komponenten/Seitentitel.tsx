import type { ReactNode } from 'react';
import styles from './Seitentitel.module.css';

export function Seitentitel({ children }: { children: ReactNode }) {
  return <h1 className={styles.titel}>{children}</h1>;
}
