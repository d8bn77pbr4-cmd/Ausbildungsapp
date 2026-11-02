import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './Knopf.module.css';

interface KnopfProps {
  variante?: 'primaer' | 'sekundaer' | 'text';
  href?: string;
  /** Externer Link: öffnet in neuem Tab, ohne Zugriff auf diese Seite. */
  extern?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  children: ReactNode;
}

/** Knopf mit sofortiger Druck-Rückmeldung. Mit `href` als Link, sonst als <button>. */
export function Knopf({ variante = 'primaer', href, extern, onClick, type = 'button', disabled, children }: KnopfProps) {
  const klasse = `${styles.knopf} ${styles[variante]}`;
  if (href && extern) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={klasse}>
        {children}
      </a>
    );
  }
  if (href) {
    return (
      <Link href={href} className={klasse}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={klasse} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
