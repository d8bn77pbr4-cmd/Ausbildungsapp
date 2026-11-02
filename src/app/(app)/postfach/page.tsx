import { LeererZustand } from '@/design/komponenten/LeererZustand';
import { Seitentitel } from '@/design/komponenten/Seitentitel';

export const metadata = { title: 'Postfach · Bewerbungsradar' };

export default function Postfach() {
  return (
    <>
      <Seitentitel>Postfach</Seitentitel>
      <LeererZustand
        titel="Noch keine Antworten"
        text="Antworten von Firmen erscheinen hier, sobald Gmail verbunden ist."
        aktion={{ label: 'Angebote suchen', href: '/suchen' }}
      />
    </>
  );
}
