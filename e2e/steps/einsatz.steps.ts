import path from 'node:path';
import { expect } from '@playwright/test';
import { Given, When, Then } from './fixtures';

// ─── Hintergrund ──────────────────────────────────────────────────────────────

Given('die App ist gestartet und ich bin als admin eingeloggt', async ({ page }) => {
  // Auto-Login (admin/admin) läuft automatisch. Warte auf Entry-Screen (bis zu 30s für Cold-Start).
  await page.waitForSelector(
    'button:has-text("Neuen Einsatz anlegen"), button:has-text("Einsatz öffnen")',
    { timeout: 30_000 },
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

    // "Neuen Einsatz anlegen" klicken → zeigt das Create-Formular
    await page.locator('button:has-text("Neuen Einsatz anlegen")').first().click();
    await page.waitForTimeout(400);

    // Einsatzname (Placeholder: "z.B. Hochwasser Landkreis")
    const nameInput = page.locator('input[placeholder*="Hochwasser"]').first();
    await nameInput.waitFor({ state: 'visible', timeout: 8_000 });
    await nameInput.clear();
    await nameInput.fill(einsatzName);

    // FüSt-Name (zweites Input im Formular, kein Placeholder)
    const fuSt = page.locator('.start-form input').nth(1);
    if (await fuSt.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await fuSt.clear();
      await fuSt.fill(fuestName);
    }

    // Submit: "Einsatz anlegen und öffnen" → löst gemockten Dialog aus
    await page.locator('button:has-text("Einsatz anlegen und öffnen")').first().click();

    // Workspace muss erscheinen (Sidebar mit "Abschnitte")
    await page.locator('text=Abschnitte').first().waitFor({ state: 'visible', timeout: 30_000 });

    // Warten bis ein tree-item sichtbar und busy=false (loadEinsatz fertig)
    await page.locator('.tree-item').first().waitFor({ state: 'visible', timeout: 15_000 });
    await page.waitForTimeout(500);
  },
);

// ─── Abschnitt ────────────────────────────────────────────────────────────────

When('ich den Abschnitt {string} anlege', async ({ page }, abschnittName: string) => {
  // "Abschnitt anlegen" ist in der Führungsstruktur-Ansicht (Rail-Button "G")
  await page.locator('.rail-button[title="Führungsstruktur"]').first().click();
  await page.waitForTimeout(300);

  // Warten bis der Button aktiv ist (busy=false, selectedEinsatzId gesetzt)
  await page.waitForFunction(
    () => {
      const btn = Array.from(document.querySelectorAll('button'))
        .find((b) => b.textContent?.trim() === 'Abschnitt anlegen');
      return btn != null && !(btn as HTMLButtonElement).disabled;
    },
    { timeout: 20_000 },
  );
  await page.locator('button:has-text("Abschnitt anlegen")').first().click();
  await page.waitForTimeout(300);

  // Abschnitt-Name via data-testid im Modal
  const nameInput = page.locator('[data-testid="abschnitt-name"]').first();
  await nameInput.waitFor({ state: 'visible', timeout: 8_000 });
  await nameInput.fill(abschnittName);

  // Submit: dispatchEvent umgeht disabled-State (busy=true während withBusy)
  await page.locator('.modal-backdrop button, .modal button').filter({ hasText: 'Anlegen' }).first()
    .dispatchEvent('click');
  await page.waitForTimeout(1_200);

  // Zurück zur Einsatz-Ansicht (E) wo die Sidebar die Abschnitte zeigt
  await page.locator('.rail-button[title="Einsatz"]').first().click({ force: true });
  await page.waitForTimeout(500);
  await page.locator(`.tree-item:has-text("${abschnittName}")`).first()
    .waitFor({ state: 'visible', timeout: 10_000 });
});

When('ich den Abschnitt {string} auswähle', async ({ page }, abschnittName: string) => {
  await page.locator(`.tree-item:has-text("${abschnittName}")`).first().click();
  await page.waitForTimeout(400);
});

// ─── Einheit ──────────────────────────────────────────────────────────────────

When(
  'ich die Einheit {string} mit Organisation {string} und Stärke {int} anlege',
  async ({ page }, einheitName: string, organisation: string, staerke: number) => {
    // Warten bis mindestens ein Abschnitt in der Sidebar geladen ist.
    // loadEinsatz setzt selectedAbschnittId: ohne das lehnt der Click-Handler die Aktion ab.
    await page.locator('.tree-item').first().waitFor({ state: 'visible', timeout: 15_000 });
    // Kurz warten damit selectedAbschnittId im State gesetzt wird
    await page.waitForTimeout(500);

    const einheitBtn = page.locator('button:has-text("Einheit anlegen")').first();
    await expect(einheitBtn).toBeEnabled({ timeout: 10_000 });
    await einheitBtn.click();
    await page.waitForTimeout(400);

    // Warte auf den Einheit-Dialog
    await page.locator('h3:has-text("Einheit anlegen")').first()
      .waitFor({ state: 'visible', timeout: 8_000 });

    // Inline-Editor Einheit-Name: click → selectAll → type (für React 19 controlled inputs)
    const nameInput = page.getByTestId('einheit-name').first();
    await nameInput.click();
    await page.keyboard.press('Meta+a');
    await page.keyboard.type(einheitName, { delay: 20 });

    // Stärke: Führung=0, Unterführung=0, Mannschaft=staerke → Total=staerke
    const fuInput = page.locator('[data-testid="einheit-fuehrung"]').first();
    await fuInput.click();
    await page.keyboard.press('Meta+a');
    await page.keyboard.type('0');

    const ufInput = page.locator('[data-testid="einheit-unterfuehrung"]').first();
    await ufInput.click();
    await page.keyboard.press('Meta+a');
    await page.keyboard.type('0');

    const mannInput = page.locator('[data-testid="einheit-mannschaft"]').first();
    await mannInput.click();
    await page.keyboard.press('Meta+a');
    await page.keyboard.type(String(staerke));

    // Organisation (Select)
    const orgSelect = page.locator('select').first();
    if (await orgSelect.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await orgSelect.selectOption(organisation);
    }

    // Submit: "Anlegen"-Button im Dialog
    await page.locator('button:has-text("Anlegen")').first().click();
    await page.waitForTimeout(600);
  },
);

// ─── Verschieben ──────────────────────────────────────────────────────────────

When(
  'ich {string} nach {string} verschiebe',
  async ({ page }, einheitName: string, zielAbschnitt: string) => {
    // Verschieben-Button: ActionIconButton mit title="Verschieben"
    const row = page.locator(`tr:has-text("${einheitName}")`).first();
    await row.locator('button[title="Verschieben"]').first().click();
    await page.waitForTimeout(500);

    // MoveDialog: <select> mit Abschnitt-Namen als Optionen
    const dialog = page.locator('.modal-backdrop').last();
    await dialog.waitFor({ state: 'visible', timeout: 5_000 });
    await page.selectOption('.modal-backdrop select', { label: zielAbschnitt });
    await page.waitForTimeout(300);

    // "Bestätigen" via dispatchEvent (Button kann disabled sein während withBusy)
    await dialog.locator('button:has-text("Bestätigen")').first().dispatchEvent('click');
    await page.waitForTimeout(800);
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
    const staerkePattern = new RegExp(`\\d+\\/\\d+\\/\\d+\\/${expectedTotal}`);
    await expect(page.locator(`text=${staerkePattern}`).first()).toBeVisible({ timeout: 6_000 });
  },
);

Then('sehe ich {string} in der Abschnitt-Liste', async ({ page }, abschnittName: string) => {
  await expect(page.locator(`.tree-item:has-text("${abschnittName}")`).first()).toBeVisible({ timeout: 5_000 });
});

Then(
  'ist {string} nicht mehr im Abschnitt {string}',
  async ({ page }, einheitName: string, abschnittName: string) => {
    await page.locator(`.tree-item:has-text("${abschnittName}")`).first().click();
    await page.waitForTimeout(400);
    await expect(page.locator(`text=${einheitName}`).first()).not.toBeVisible({ timeout: 3_000 });
  },
);

// ─── Undo ──────────────────────────────────────────────────────────────────────

When('ich die letzte Aktion rückgängig mache', async ({ page }) => {
  // Kein UI-Button für Undo vorhanden → IPC direkt aufrufen
  // Einsatz-ID aus dem Titel extrahieren oder über getDbContext ermitteln
  await page.evaluate(async () => {
    const allEinsaetze = await (window as unknown as { api: { listEinsaetze(): Promise<Array<{ id: string; name: string }>> } }).api.listEinsaetze();
    const current = allEinsaetze[0];
    if (current) {
      await (window as unknown as { api: { undoLastCommand(id: string): Promise<boolean> } }).api.undoLastCommand(current.id);
    }
  });
  await page.waitForTimeout(800);
});

// ─── Fahrzeuge ─────────────────────────────────────────────────────────────────

When(
  'ich das Fahrzeug {string} der Einheit {string} zuordne',
  async ({ page }, fahrzeugName: string, einheitName: string) => {
    // Zur Fahrzeuge-Ansicht wechseln (F-Button in Rail)
    await page.locator('.rail-button[title="Fahrzeuge"]').first().click();
    await page.waitForTimeout(300);

    // Auf enabled button warten (busy=false)
    await page.waitForFunction(
      () => {
        const btn = Array.from(document.querySelectorAll('button'))
          .find((b) => b.textContent?.trim() === 'Fahrzeug anlegen');
        return btn != null && !(btn as HTMLButtonElement).disabled;
      },
      { timeout: 15_000 },
    );
    await page.locator('button:has-text("Fahrzeug anlegen")').first().click();
    await page.waitForTimeout(400);

    // Fahrzeug-Inline-Dialog öffnet sich
    await page.locator('h3:has-text("Fahrzeug anlegen"), h3:has-text("Fahrzeug")').first()
      .waitFor({ state: 'visible', timeout: 8_000 });

    // Fahrzeugname über data-testid (wie Einheit)
    const nameInput = page.locator('[data-testid="fahrzeug-name"], input[placeholder*="MTW"]').first();
    if (await nameInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await nameInput.fill(fahrzeugName);
    } else {
      // Fallback: erstes Text-Input im Dialog
      await page.getByTestId('einheit-name').fill(fahrzeugName).catch(async () => {
        const firstInput = page.locator('h3:has-text("Fahrzeug") ~ * input, .modal input').first();
        await firstInput.fill(fahrzeugName);
      });
    }

    // Einheit zuordnen via Select
    const einheitSelect = page.locator('select').first();
    if (await einheitSelect.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await einheitSelect.selectOption({ label: einheitName }).catch(() => {});
    }

    // Submit via dispatchEvent
    await page.locator('h3:has-text("Fahrzeug")').first().locator('..')
      .locator('button:has-text("Anlegen")').first()
      .dispatchEvent('click').catch(async () => {
        await page.locator('.modal-backdrop button:has-text("Anlegen"), .modal button:has-text("Anlegen")')
          .first().dispatchEvent('click');
      });
    await page.waitForTimeout(800);

    // Zurück zur Einsatz-Ansicht
    await page.locator('.rail-button[title="Einsatz"]').first().click({ force: true });
    await page.waitForTimeout(300);
  },
);

Then('sehe ich {string} in der Fahrzeugliste', async ({ page }, fahrzeugName: string) => {
  await expect(page.locator(`text=${fahrzeugName}`).first()).toBeVisible({ timeout: 5_000 });
});

// ─── Persistenz ────────────────────────────────────────────────────────────────

When('ich den Einsatz schließe', async ({ page }) => {
  // Einstellungen-Tab (Gear-Icon in Rail) → "Verzeichnis speichern" ruft clearSelectedEinsatz auf
  await page.locator('.rail-button[title="Einstellungen"]').first().click();
  await page.waitForTimeout(300);

  // "Verzeichnis speichern" → speichert aktuellen Pfad UND clears selectedEinsatzId
  const saveBtn = page.locator('button:has-text("Verzeichnis speichern")').first();
  await saveBtn.waitFor({ state: 'visible', timeout: 5_000 });
  await saveBtn.click();
  await page.waitForTimeout(1_000);

  // Entry-Screen muss erscheinen
  await page.waitForSelector('button:has-text("Neuen Einsatz anlegen")', { timeout: 10_000 });
});

When('ich den Einsatz {string} erneut öffne', async ({ page }, einsatzName: string) => {
  // Einsatz aus der Recent-Liste öffnen
  const einsatzBtn = page.locator(`button:has-text("${einsatzName}")`).first();
  await einsatzBtn.waitFor({ state: 'visible', timeout: 10_000 });
  // Warten bis Button aktiv ist (busy=false nach saveDbPath/withBusy)
  await expect(einsatzBtn).toBeEnabled({ timeout: 15_000 });
  // Klick mit normaler Playwright-Aktion (wartet automatisch auf enabled)
  await einsatzBtn.click({ timeout: 30_000 });
  await page.waitForTimeout(800);

  // Wechsel zur Einsatz-Ansicht (E), da wir vorher im Einstellungen-Tab waren
  await page.locator('.rail-button[title="Einsatz"]').first().click({ force: true, timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(300);
  await page.waitForSelector('text=Abschnitte', { timeout: 20_000 });
  await page.waitForTimeout(500);
});

// ─── Einheit splitten ──────────────────────────────────────────────────────────

When(
  'ich {string} mit Stärke {int} in {string} aufteile',
  async ({ page }, quellEinheit: string, splitStaerke: number, neuerName: string) => {
    // Warte bis der Inline-Editor geschlossen ist (h3 "Einheit anlegen" verschwindet)
    await page.locator('h3:has-text("Einheit anlegen")').first()
      .waitFor({ state: 'hidden', timeout: 15_000 });
    await page.waitForTimeout(500);

    // Einheit ist sichtbar (Action-Buttons als SVG-Icon-Buttons)
    await page.locator(`text=${quellEinheit}`).first().waitFor({ state: 'visible', timeout: 8_000 });
    await page.waitForTimeout(500);

    // Aufteilen via page.evaluate (Icon-Buttons haben kein textContent,
    // Playwright's waitFor findet sie nicht zuverlässig)
    const clicked = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button'))
        .find(b => b.getAttribute('title') === 'Aufteilen' || b.getAttribute('aria-label') === 'Aufteilen');
      if (btn) { (btn as HTMLElement).click(); return true; }
      return false;
    });
    if (!clicked) {
      // Fallback: 3. Icon-Button im table-icon-button (Verschieben=0, Bearbeiten=1, Aufteilen=2)
      await page.evaluate(() => {
        const btns = document.querySelectorAll('.table-icon-button');
        if (btns.length >= 3) (btns[2] as HTMLElement).click();
      });
    }
    await page.waitForTimeout(400);
    await page.waitForTimeout(400);

    // SplitEinheitDialog öffnet sich: h3 "Einheit splitten"
    await page.locator('h3:has-text("Einheit splitten")').first()
      .waitFor({ state: 'visible', timeout: 8_000 });

    // Name der Teileinheit (EinheitCoreFields → data-testid="einheit-name")
    await page.getByTestId('einheit-name').fill(neuerName);

    // Mannschaft auf splitStaerke setzen
    await page.fill('[data-testid="einheit-fuehrung"]', '0');
    await page.fill('[data-testid="einheit-unterfuehrung"]', '0');
    await page.fill('[data-testid="einheit-mannschaft"]', String(splitStaerke));

    // Submit via dispatchEvent (Button kann busy-disabled sein)
    await page.locator('.modal-backdrop button:has-text("Splitten"), .modal button:has-text("Splitten")')
      .first().dispatchEvent('click');
    await page.waitForTimeout(800);
  },
);
