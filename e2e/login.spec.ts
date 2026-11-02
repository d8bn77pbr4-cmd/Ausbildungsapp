import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('Login: Adresse eingeben führt zum Code-Schritt mit neutraler Meldung', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Bewerbungsradar' })).toBeVisible();
  await page.getByLabel('E-Mail').fill('fremd@example.de');
  await page.getByRole('button', { name: 'Code anfordern' }).click();
  await expect(page.getByText('Wenn die Adresse freigegeben ist, kommt gleich eine E-Mail mit Code und Anmeldelink.')).toBeVisible();
  await expect(page.getByLabel('Code aus der E-Mail')).toBeVisible();
  await page.getByLabel('Code aus der E-Mail').fill('12');
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await expect(page.getByText('Der Code besteht aus 6 bis 10 Ziffern.')).toBeVisible();
  await page.getByRole('button', { name: 'Andere Adresse' }).click();
  await expect(page.getByLabel('E-Mail')).toBeVisible();
});

test('Login: abgelaufener Link erklärt den Code-Weg', async ({ page }) => {
  await page.goto('/login?fehler=link_ungueltig');
  await expect(page.getByText('Der Link ist abgelaufen oder wurde in einem anderen Browser geöffnet. Fordere einen neuen Code an und gib ihn hier ein.')).toBeVisible();
});

test('Login-Seite ohne Barrierefreiheitsverstöße', async ({ page }) => {
  await page.goto('/login');
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.map((v) => `${v.id} – ${v.nodes[0]?.target}`)).toEqual([]);
});

test('Profil zeigt im Testmodus „Testmodus“ und einen Abmelden-Knopf', async ({ page }) => {
  await page.goto('/profil');
  await expect(page.getByText('Testmodus')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Abmelden' })).toBeVisible();
});
