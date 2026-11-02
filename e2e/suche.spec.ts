import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const fixture = JSON.parse(readFileSync('tests/fixtures/ba-jobs/mechatroniker-frankfurt-25.json', 'utf8'));
const hessen = fixture.ergebnisliste.filter((e: { stellenlokationen: { adresse: { region: string } }[] }) => e.stellenlokationen[0].adresse.region === 'HESSEN');
const ersteUrl: string = fixture.ergebnisliste[0].externeURL ?? `https://www.arbeitsagentur.de/jobsuche/jobdetail/${encodeURIComponent(fixture.ergebnisliste[0].referenznummer)}`;

async function suche(page: Page, was: string, orte: string[]) {
  await page.goto('/suchen');
  await page.getByLabel('Was?').fill(was);
  for (const ort of orte) {
    await page.getByLabel('Wo?').fill(ort);
    await page.getByLabel('Wo?').press('Enter');
  }
  await page.getByRole('button', { name: 'Suchen', exact: true }).click();
}

test('Bundesland eintippen ergibt Bundesland-Chip und filtert', async ({ page }) => {
  await suche(page, 'Mechatroniker', ['nrw', 'Hessen']);
  await expect(page.getByRole('button', { name: 'Nordrhein-Westfalen entfernen' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hessen entfernen' })).toBeVisible();
  await expect(page.getByText(/^\d+ Treffer$/)).toHaveText(`${hessen.length} Treffer`);
});

test('„Hessen, NRW“ in einem Rutsch ergibt zwei Bundesland-Chips', async ({ page }) => {
  await page.goto('/suchen');
  await page.getByLabel('Wo?').fill('Hessen, NRW');
  await page.getByLabel('Wo?').press('Enter');
  await expect(page.getByRole('button', { name: 'Hessen entfernen' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nordrhein-Westfalen entfernen' })).toBeVisible();
});

test('unbekannter Ort zeigt Hinweis statt bundesweiter Suche', async ({ page }) => {
  await suche(page, 'Mechatroniker', ['Frankfrt']);
  await expect(page.getByText('Ort nicht gefunden: Frankfrt')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Keine Treffer' })).toBeVisible();
});

test('erkannter Ort wird angezeigt', async ({ page }) => {
  await suche(page, 'Mechatroniker', ['Frankfurt']);
  await expect(page.getByText('Gesucht um: Frankfurt am Main')).toBeVisible();
});

test('Karte öffnet Sheet; ESC schließt; Fokus kehrt zurück', async ({ page }) => {
  await suche(page, 'Mechatroniker', ['Frankfurt']);
  const ersteKarte = page.getByRole('article').first();
  const titel = ersteKarte.getByRole('button').first();
  await titel.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'Originalanzeige öffnen' })).toHaveAttribute('href', ersteUrl);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(titel).toBeFocused();
});

test('Mehr laden hängt die nächsten 30 an', async ({ page }) => {
  await suche(page, 'Mechatroniker', ['Frankfurt']);
  await expect(page.getByRole('article')).toHaveCount(30);
  await page.getByRole('button', { name: 'Mehr laden' }).click();
  await expect(page.getByRole('article')).toHaveCount(60);
});

test('jede Karte verlinkt direkt die Stellenausschreibung', async ({ page }) => {
  await suche(page, 'Mechatroniker', ['Frankfurt']);
  const link = page.getByRole('article').first().getByRole('link', { name: /^Zur Anzeige „.+“ bei .+ ↗$/ });
  await expect(link).toHaveAttribute('href', ersteUrl);
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
});

test('Links zu Indeed, StepStone, Azubiyo enthalten den Suchbegriff', async ({ page }) => {
  await suche(page, 'Mechatroniker', ['Frankfurt']);
  for (const name of ['Indeed', 'StepStone', 'Azubiyo']) {
    await expect(page.getByRole('link', { name: `Auf ${name} suchen` })).toHaveAttribute('href', /mechatroniker/i);
  }
});

test('Keine Treffer', async ({ page }) => {
  await suche(page, 'xqzvwk', []);
  await expect(page.getByRole('heading', { name: 'Keine Treffer' })).toBeVisible();
  await expect(page.getByText('Versuch einen größeren Umkreis oder einen allgemeineren Begriff.')).toBeVisible();
});

test('fehlende Felder: Beginn nicht angegeben', async ({ page }) => {
  await suche(page, 'Mechatroniker', ['Frankfurt']);
  await expect(page.getByRole('article').first().getByText('Beginn: nicht angegeben')).toBeVisible();
});

test('Formular: Pflichtbegriff und Hinweis ohne Ort', async ({ page }) => {
  await page.goto('/suchen');
  await expect(page.getByText('Ohne Ort: ganz Deutschland')).toBeVisible();
  await page.getByLabel('Was?').fill('M');
  await page.getByRole('button', { name: 'Suchen', exact: true }).click();
  await expect(page.getByText('Bitte gib mindestens 2 Zeichen ein.')).toBeVisible();
});

for (const schema of ['light', 'dark'] as const) {
  test(`Barrierefreiheit mit Ergebnissen und offenem Sheet (${schema})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: schema });
    await suche(page, 'Mechatroniker', ['Frankfurt']);
    await expect(page.getByRole('article').first()).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations.map((v) => `${v.id} – ${v.nodes[0]?.target}`)).toEqual([]);
    await page.getByRole('article').first().getByRole('button').first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations.map((v) => `${v.id} – ${v.nodes[0]?.target}`)).toEqual([]);
  });
}

test('reduzierte Bewegung: Sheet ohne transform-Übergang', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await suche(page, 'Mechatroniker', ['Frankfurt']);
  await page.getByRole('article').first().getByRole('button').first().click();
  const uebergang = await page.getByRole('dialog').evaluate((el) => getComputedStyle(el).transitionProperty);
  expect(uebergang).not.toContain('transform');
});
