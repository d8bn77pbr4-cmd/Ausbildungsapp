import type { ReactNode } from 'react';
import { Knopf } from './Knopf';
import styles from './Hinweis.module.css';

interface HinweisProps {
  ton: 'info' | 'warnung';
  children: ReactNode;
  aktion?: { label: string; onClick: () => void };
}

export function Hinweis({ ton, children, aktion }: HinweisProps) {
  return (
    <div role="status" className={`${styles.hinweis} ${styles[ton]}`}>
      <p>{children}</p>
      {aktion && (
        <Knopf variante="text" onClick={aktion.onClick}>
          {aktion.label}
        </Knopf>
      )}
    </div>
  );
}
