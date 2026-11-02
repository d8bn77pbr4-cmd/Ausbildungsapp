import { LeererZustand } from '@/design/komponenten/LeererZustand';
import { Seitentitel } from '@/design/komponenten/Seitentitel';

export const metadata = { title: 'Heute · Bewerbungsradar' };

export default function Heute() {
  return (
    <>
      <Seitentitel>Heute</Seitentitel>
      <LeererZustand
        titel="Noch nichts zu tun"
        text="Hier erscheinen neue Angebote und Aufgaben, sobald du eine Suche speicherst."
        aktion={{ label: 'Erste Suche starten', href: '/suchen' }}
      />
    </>
  );
}
