import { Knopf } from './Knopf';
import styles from './LeererZustand.module.css';

interface LeererZustandProps {
  titel: string;
  text: string;
  aktion?: { label: string; href: string };
}

/** Erklärt in einem Satz, was hier erscheinen wird, und führt zum Startpunkt. */
export function LeererZustand({ titel, text, aktion }: LeererZustandProps) {
  return (
    <section className={styles.leer}>
      <h2 className={styles.titel}>{titel}</h2>
      <p className={styles.text}>{text}</p>
      {aktion && <Knopf href={aktion.href}>{aktion.label}</Knopf>}
    </section>
  );
}
