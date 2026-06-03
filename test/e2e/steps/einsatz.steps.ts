import path from 'node:path';
import { expect } from '@playwright/test';
import { Given, When, Then } from './fixtures';

// ─── Hintergrund ──────────────────────────────────────────────────────────────

Given('die App ist gestartet und ich bin als admin eingeloggt', async ({ page }) => {
  // Auto-Login (admin/admin) läuft automatisch. Warte auf Entry-Screen.
  await page.waitForSelector(
    'button:has-text("Neuen Einsatz anlegen"), button:has-text("Einsatz öffnen")',
    { timeout: 15_000 },
  );
});

// ─── Einsatz anlegen ──────────────────────────────────────────────────────────

When(
  'ich einen neuen Einsatz {string} mit FüSt {string} anlege',
  async ({ app, page, dataDir }, einsatzName: string, fuestName: string) => {
    const einsatzFile = path.join(
      dataDir,
      `${einsatzName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.s1control`,
    );

    // Dialog im Main-Prozess mocken → kein nativer Save-Dialog erscheint
    await app.evaluate(async ({ dialog }, filePath: string) => {
      const orig = dialog.showSaveDialog.bind(dialog);
      // @ts-expect-error temporary test mock
      dialog.showSaveDialog = async () => ({ canceled: false, filePath });
      setTimeout(() => { dialog.showSaveDialog = orig as typeof dialog.showSaveDialog; }, 10_000);
    }, einsatzFile);

    // "Neuen Einsatz anlegen" klicken → zeigt das Anlegen-Formular
    await page.locator('button:has-text("Neuen Einsatz anlegen")').first().click();
    await page.waitForTimeout(300);

    // Einsatzname eingeben
    const nameInput = page
      .locator('input[placeholder*="Hochwasser"], input[placeholder*="Einsatz"], input[placeholder*="einsatz"]')
      .first();
    await nameInput.waitFor({ state: 'visible', timeout: 5_000 });
    await nameInput.clear();
    await nameInput.fill(einsatzName);

    // FüSt-Name (zweites sichtbares Textfeld)
    const allInputs = page.locator('input[type="text"], input:not([type])');
    const inputCount = await allInputs.count();
    if (inputCount >= 2) {
      await allInputs.nth(1).clear();
      await allInputs.nth(1).fill(fuestName);
    }

    // Anlegen-Button → löst gemockten Dialog aus
    await page.locator('button:has-text("Anlegen")').first().click();

    // Workspace muss erscheinen
    await page.locator('text=Abschnitte').first().waitFor({ state: 'visible', timeout: 15_000 });
    await page.waitForTimeout(600);
  },
);

// ─── Abschnitt ────────────────────────────────────────────────────────────────

When('ich den Abschnitt {string} anlege', async ({ page }, abschnittName: string) => {
  await page.locator('button:has-text("Abschnitt anlegen")').first().click();
  await page.waitForTimeout(300);

  const nameInput = page.locator('input[placeholder*="Name"], input[name="name"]').first();
  await nameInput.waitFor({ state: 'visible', timeout: 5_000 });
  await nameInput.clear();
  await nameInput.fill(abschnittName);

  await page.locator('button:has-text("Anlegen")').first().click();
  await page.waitForTimeout(400);
  // Abschnitt muss in der Sidebar erscheinen
  await page.locator(`.tree-item:has-text("${abschnittName}")`).first()
    .waitFor({ state: 'visible', timeout: 5_000 });
});

When('ich den Abschnitt {string} auswähle', async ({ page }, abschnittName: string) => {
  await page.locator(`.tree-item:has-text("${abschnittName}")`).first().click();
  await page.waitForTimeout(400);
});

// ─── Einheit ──────────────────────────────────────────────────────────────────

When(
  'ich die Einheit {string} mit Organisation {string} und Stärke {int} anlege',
  async ({ page }, einheitName: string, organisation: string, staerke: number) => {
    await page.locator('button:has-text("Einheit anlegen")').first().click();
    await page.waitForTimeout(400);

    // Name
    const nameInput = page
      .locator('input[placeholder*="Name"], input[name="nameImEinsatz"], input[placeholder*="Einheit"]')
      .first();
    await nameInput.waitFor({ state: 'visible', timeout: 5_000 });
    await nameInput.clear();
    await nameInput.fill(einheitName);

    // Stärke-Felder: Mannschaft auf Stärke setzen (Rest auf 0)
    const mannschaftInput = page
      .locator('input[placeholder*="Mannschaft"], input[name="mannschaft"]')
      .first();
    if (await mannschaftInput.isVisible({ timeout: 1_500 }).catch(() => false)) {
      await mannschaftInput.clear();
      await mannschaftInput.fill(String(staerke));
    } else {
      // Fallback: erstes Stärke-Feld
      const staerkeInput = page
        .locator('input[placeholder*="Stärke"], input[placeholder*="staerke"]')
        .first();
      if (await staerkeInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await staerkeInput.clear();
        await staerkeInput.fill(String(staerke));
      }
    }

    // Organisation auswählen
    const orgSelect = page.locator('select').first();
    if (await orgSelect.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await orgSelect.selectOption(organisation);
    }

    // Anlegen bestätigen
    await page.locator('button:has-text("Anlegen"), button:has-text("Erstellen"), button[type="submit"]')
      .first()
      .click();
    await page.waitForTimeout(600);
  },
);

// ─── Verschieben ──────────────────────────────────────────────────────────────

When(
  'ich {string} nach {string} verschiebe',
  async ({ page }, einheitName: string, zielAbschnitt: string) => {
    // Verschieben-Button in der Einheitenzeile
    const row = page
      .locator(`tr:has-text("${einheitName}"), .einheit-row:has-text("${einheitName}")`)
      .first();
    const moveBtn = row
      .locator('button[title*="erschieb"], button[title*="Verschieb"], button:nth-child(1)')
      .first();
    await moveBtn.click();
    await page.waitForTimeout(400);

    // Ziel-Abschnitt im Dialog wählen
    const zielEl = page.locator(`text="${zielAbschnitt}", option:has-text("${zielAbschnitt}")`).first();
    await zielEl.waitFor({ state: 'visible', timeout: 5_000 });
    await zielEl.click();

    // Bestätigen
    const confirmBtn = page
      .locator('button:has-text("Verschieben"), button:has-text("OK"), button:has-text("Bestätigen")')
      .first();
    if (await confirmBtn.isVisible({ timeout: 1_500 }).catch(() => false)) {
      await confirmBtn.click();
    }
    await page.waitForTimeout(600);
  },
);

// ─── Assertions ───────────────────────────────────────────────────────────────

Then(
  'sehe ich den Workspace mit dem Abschnitt {string}',
  async ({ page }, abschnittName: string) => {
    await expect(page.locator('text=Abschnitte').first()).toBeVisible({ timeout: 8_000 });
    await expect(
      page.locator(`.tree-item:has-text("${abschnittName}")`).first(),
    ).toBeVisible({ timeout: 5_000 });
  },
);

Then('sehe ich {string} in der Einheitenliste', async ({ page }, einheitName: string) => {
  await expect(page.locator(`text=${einheitName}`).first()).toBeVisible({ timeout: 5_000 });
});

Then('die Gesamtstärke beträgt {int}', async ({ page }, expectedTotal: number) => {
  await page.waitForTimeout(1_000);
  const staerkePattern = new RegExp(`\\d+\\/\\d+\\/\\d+\\/${expectedTotal}`);
  await expect(page.locator(`text=${staerkePattern}`).first()).toBeVisible({ timeout: 6_000 });
});

Then('ist {string} im Abschnitt {string}', async ({ page }, einheitName: string, abschnittName: string) => {
  // Abschnitt auswählen
  await page.locator(`.tree-item:has-text("${abschnittName}")`).first().click();
  await page.waitForTimeout(500);
  await expect(page.locator(`text=${einheitName}`).first()).toBeVisible({ timeout: 5_000 });
});

Then(
  'beträgt die Gesamtstärke über alle Abschnitte {int}',
  async ({ page }, expectedTotal: number) => {
    await page.waitForTimeout(1_500);
    // Abschnitt wechseln → Gesamtstärke im Header muss TROTZDEM Gesamtsumme zeigen
    const staerkePattern = new RegExp(`\\d+\\/\\d+\\/\\d+\\/${expectedTotal}`);
    const el = page.locator(`text=${staerkePattern}`).first();
    await expect(el).toBeVisible({ timeout: 6_000 });
  },
);
