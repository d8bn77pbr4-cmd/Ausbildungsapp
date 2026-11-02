import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './Knopf.module.css';

interface KnopfProps {
  variante?: 'primaer' | 'sekundaer' | 'text';
  href?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  children: ReactNode;
}

/** Knopf mit sofortiger Druck-Rückmeldung. Mit `href` als Link, sonst als <button>. */
export function Knopf({ variante = 'primaer', href, onClick, type = 'button', disabled, children }: KnopfProps) {
  const klasse = `${styles.knopf} ${styles[variante]}`;
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
