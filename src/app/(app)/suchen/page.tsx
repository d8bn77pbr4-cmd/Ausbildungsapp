import { Seitentitel } from '@/design/komponenten/Seitentitel';
import { SuchSeite } from '@/suche/ui/SuchSeite';

export const metadata = { title: 'Suchen · Bewerbungsradar' };

export default function Suchen() {
  return (
    <>
      <Seitentitel>Suchen</Seitentitel>
      <SuchSeite />
    </>
  );
}
