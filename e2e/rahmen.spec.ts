import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('Tabs navigieren und markieren die aktive Seite', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/heute$/);
  const tabs: [string, string][] = [
    ['Suchen', '/suchen'], ['Bewerbungen', '/bewerbungen'], ['Postfach', '/postfach'], ['Profil', '/profil'], ['Heute', '/heute'],
  ];
  const nav = page.getByRole('navigation', { name: 'Hauptnavigation' });
  for (const [name, pfad] of tabs) {
    await nav.getByRole('link', { name }).click();
    await expect(page).toHaveURL(new RegExp(pfad + '$'));
    await expect(nav.getByRole('link', { name })).toHaveAttribute('aria-current', 'page');
  }
});

test('leerer Zustand auf Heute führt zur Suche', async ({ page }) => {
  await page.goto('/heute');
  await expect(page.getByRole('heading', { name: 'Noch nichts zu tun' })).toBeVisible();
  await page.getByRole('main').getByRole('link', { name: 'Erste Suche starten' }).click();
  await expect(page).toHaveURL(/\/suchen$/);
});

test('Tab-Leiste: unten auf dem iPhone, links auf dem Desktop', async ({ page }, info) => {
  await page.goto('/heute');
  const box = (await page.getByRole('navigation', { name: 'Hauptnavigation' }).boundingBox())!;
  if (info.project.name === 'iphone') expect(box.y + box.height).toBeGreaterThan(800);
  else expect(box.x).toBe(0);
});

test('Manifest macht die App installierbar', async ({ page, request }) => {
  await page.goto('/heute');
  const res = await request.get('/manifest.webmanifest');
  expect(res.ok()).toBe(true);
  const m = await res.json();
  expect(m.display).toBe('standalone');
  expect(m.name).toBe('Bewerbungsradar');
  const groessen = m.icons.map((i: { sizes: string }) => i.sizes);
  expect(groessen).toEqual(expect.arrayContaining(['192x192', '512x512']));
  for (const icon of m.icons) {
    const r = await request.get(icon.src);
    expect(r.status()).toBe(200);
    expect(r.headers()['content-type']).toContain('image/png');
  }
  const apple = await request.get((await page.locator('link[rel="apple-touch-icon"]').getAttribute('href'))!);
  expect(apple.status()).toBe(200);
});

test('Profil erklärt, wie man die App aufs Handy holt', async ({ page }) => {
  await page.goto('/profil');
  await expect(page.getByRole('heading', { name: 'Als App aufs Handy' })).toBeVisible();
  await expect(page.getByText('Zum Home-Bildschirm')).toBeVisible();
});

for (const schema of ['light', 'dark'] as const) {
  test(`keine Barrierefreiheitsverstöße (${schema})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: schema });
    for (const pfad of ['/heute', '/suchen', '/bewerbungen', '/postfach', '/profil']) {
      await page.goto(pfad);
      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(violations.map((v) => `${pfad}: ${v.id} – ${v.nodes[0]?.target}`)).toEqual([]);
    }
  });
}
