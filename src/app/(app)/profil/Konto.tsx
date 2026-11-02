import { connection } from 'next/server';
import { Knopf } from '@/design/komponenten/Knopf';
import { erstelleServerClient } from '@/lib/supabase/server';
import { leseUmgebung } from '@/lib/umgebung';
import { abmelden } from '../../login/aktionen';

export async function Konto() {
  await connection();
  const u = leseUmgebung(process.env);
  let email = 'Testmodus';
  if (!u.e2eOhneLogin) {
    const supabase = await erstelleServerClient();
    const { data } = await supabase.auth.getUser();
    email = data.user?.email ?? '';
  }
  return (
    <>
      <p>{email}</p>
      <form action={abmelden} style={{ marginTop: 'var(--abstand-3)' }}>
        <Knopf type="submit" variante="sekundaer">Abmelden</Knopf>
      </form>
    </>
  );
}
