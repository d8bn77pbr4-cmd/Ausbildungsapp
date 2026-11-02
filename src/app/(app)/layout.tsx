import { TabLeiste } from '@/design/komponenten/TabLeiste';
import styles from './rahmen.module.css';

export default function AppRahmen({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <a href="#inhalt" className="sprung-link">
        Zum Inhalt springen
      </a>
      <TabLeiste />
      <main id="inhalt" className={styles.inhalt}>
        {children}
      </main>
    </>
  );
}
