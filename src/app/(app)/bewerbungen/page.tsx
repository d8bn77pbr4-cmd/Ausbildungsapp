import { LeererZustand } from '@/design/komponenten/LeererZustand';
import { Seitentitel } from '@/design/komponenten/Seitentitel';

export const metadata = { title: 'Bewerbungen · Bewerbungsradar' };

export default function Bewerbungen() {
  return (
    <>
      <Seitentitel>Bewerbungen</Seitentitel>
      <LeererZustand
        titel="Noch keine Bewerbungen"
        text="Merke dir Angebote oder trage eine Bewerbung ein – hier behältst du den Überblick."
        aktion={{ label: 'Angebote suchen', href: '/suchen' }}
      />
    </>
  );
}
