import { describe, expect, it } from 'vitest';
import { AppError } from '../src/main/services/errors';
import {
  archiveEinsatz,
  createAbschnitt,
  createEinheit,
  createEinheitHelfer,
  createEinsatz,
  createFahrzeug,
  deleteEinheitHelfer,
  ensureNotArchived,
  hasUndoableCommand,
  listAbschnittDetails,
  listAbschnitte,
  listEinheitHelfer,
  listEinsaetze,
  splitEinheit,
  updateAbschnitt,
  updateEinheit,
  updateEinheitHelfer,
  updateFahrzeug,
} from '../src/main/services/einsatz';
import { createTestDb } from './helpers/db';

describe('einsatz service - basics', () => {
  it('creates einsatz and root FüSt abschnitt', () => {
    const ctx = createTestDb('s1-control-einsatz-create-');
    const created = createEinsatz(ctx, { name: 'Hochwasser', fuestName: 'FüSt 1' });
    const einsaetze = listEinsaetze(ctx.einsatz);
    const abschnitte = listAbschnitte(ctx.einsatz, created.id);

    expect(einsaetze.some((e) => e.id === created.id)).toBe(true);
    expect(abschnitte).toHaveLength(1);
    expect(abschnitte[0]?.systemTyp).toBe('FUEST');
    expect(abschnitte[0]?.name).toBe('FüSt 1');
  });

  it('archives einsatz and blocks writes', () => {
    const ctx = createTestDb('s1-control-einsatz-archive-');
    const created = createEinsatz(ctx, { name: 'Sturm', fuestName: 'FüSt Nord' });
    archiveEinsatz(ctx, created.id);

    expect(ctx.einsatz.einsatz.status).toBe('ARCHIVIERT');
    expect(() => createAbschnitt(ctx, { einsatzId: created.id, name: 'EA Süd', systemTyp: 'NORMAL' })).toThrow(AppError);
  });

  it('throws NOT_FOUND for missing einsatz in guard and archive', () => {
    const ctx = createTestDb('s1-control-einsatz-not-found-');
    expect(() => ensureNotArchived(ctx, 'missing')).toThrow('Einsatz nicht gefunden');
    expect(() => archiveEinsatz(ctx, 'missing')).toThrow('Einsatz nicht gefunden');
  });

  it('validates tactical strength on createEinheit', () => {
    const ctx = createTestDb('s1-control-einsatz-einheit-validation-');
    const created = createEinsatz(ctx, { name: 'Übung', fuestName: 'FüSt 1' });
    const root = listAbschnitte(ctx.einsatz, created.id)[0];
    expect(root).toBeTruthy();

    expect(() => createEinheit(ctx, { einsatzId: created.id, nameImEinsatz: 'TZ 1', organisation: 'THW', aktuelleStaerke: 5, aktuelleStaerkeTaktisch: '1/1/1/3', aktuellerAbschnittId: root!.id })).toThrow('inkonsistent');
    expect(() => createEinheit(ctx, { einsatzId: created.id, nameImEinsatz: 'TZ 2', organisation: 'THW', aktuelleStaerke: 1, aktuelleStaerkeTaktisch: 'x/y/z', aktuellerAbschnittId: root!.id })).toThrow('ungültig');
    expect(() => createEinheit(ctx, { einsatzId: created.id, nameImEinsatz: 'TZ 3', organisation: 'THW', aktuelleStaerke: -1, aktuellerAbschnittId: root!.id })).toThrow('Stärke muss');
    expect(() => createEinheit(ctx, { einsatzId: created.id, nameImEinsatz: 'TZ 4', organisation: 'INVALID' as never, aktuelleStaerke: 1, aktuellerAbschnittId: root!.id })).toThrow('Organisation ist');
  });
});

describe('einsatz service - split and command log', () => {
  it('creates fahrzeug linked to unit and abschnitt', () => {
    const ctx = createTestDb('s1-control-einsatz-fahrzeug-');
    const created = createEinsatz(ctx, { name: 'Brand', fuestName: 'FüSt 1' });
    const root = listAbschnitte(ctx.einsatz, created.id)[0]!;

    createEinheit(ctx, { einsatzId: created.id, nameImEinsatz: 'OV Oldenburg', organisation: 'THW', aktuelleStaerke: 9, aktuelleStaerkeTaktisch: '0/1/8/9', aktuellerAbschnittId: root.id });
    const source = ctx.einsatz.einheiten.find((e) => e.nameImEinsatz === 'OV Oldenburg' && e.einsatzId === created.id);
    expect(source).toBeTruthy();

    createFahrzeug(ctx, { einsatzId: created.id, name: 'MTW OV', aktuelleEinsatzEinheitId: source!.id });

    const fahrzeug = ctx.einsatz.fahrzeuge.find((f) => f.einsatzId === created.id);
    expect(fahrzeug?.aktuelleEinsatzEinheitId).toBe(source!.id);
    expect(fahrzeug?.aktuellerAbschnittId).toBe(root.id);
  });

  it('supports splitting unit and exposes details', () => {
    const ctx = createTestDb('s1-control-einsatz-split-');
    const created = createEinsatz(ctx, { name: 'THW Lage', fuestName: 'FüSt 1' });
    const root = listAbschnitte(ctx.einsatz, created.id)[0]!;

    createEinheit(ctx, { einsatzId: created.id, nameImEinsatz: 'TZ Basis', organisation: 'THW', aktuelleStaerke: 12, aktuelleStaerkeTaktisch: '1/2/9/12', aktuellerAbschnittId: root.id });
    const source = ctx.einsatz.einheiten.find((e) => e.nameImEinsatz === 'TZ Basis')!;
    expect(source).toBeTruthy();

    splitEinheit(ctx, { einsatzId: created.id, sourceEinheitId: source.id, nameImEinsatz: 'TZ Basis - Teil 1', fuehrung: 0, unterfuehrung: 1, mannschaft: 3 });

    const updatedSource = ctx.einsatz.einheiten.find((e) => e.id === source.id);
    expect(updatedSource?.aktuelleStaerkeTaktisch).toBe('1/1/6/8');

    const details = listAbschnittDetails(ctx.einsatz, ctx.system, created.id, root.id);
    expect(details.einheiten).toHaveLength(2);
    expect(details.einheiten.some((e) => e.parentEinsatzEinheitId === source.id)).toBe(true);
  });

  it('checks undo availability from command log', () => {
    const ctx = createTestDb('s1-control-einsatz-undo-flag-');
    const created = createEinsatz(ctx, { name: 'Lage', fuestName: 'FüSt' });
    expect(hasUndoableCommand(ctx.einsatz, created.id)).toBe(false);

    ctx.einsatz.commandLog.push({ id: 'c1', einsatzId: created.id, benutzerId: 'u1', commandTyp: 'MOVE_EINHEIT', payloadJson: '{}', timestamp: new Date().toISOString(), undone: false });
    expect(hasUndoableCommand(ctx.einsatz, created.id)).toBe(true);
  });
});

describe('einsatz service - split and vehicle validation', () => {
  it('throws for invalid split requests', () => {
    const ctx = createTestDb('s1-control-einsatz-split-invalid-');
    const created = createEinsatz(ctx, { name: 'Lage', fuestName: 'FüSt' });
    const root = listAbschnitte(ctx.einsatz, created.id)[0]!;

    createEinheit(ctx, { einsatzId: created.id, nameImEinsatz: 'Basis', organisation: 'THW', aktuelleStaerke: 3, aktuelleStaerkeTaktisch: '0/0/3/3', aktuellerAbschnittId: root.id });
    const source = ctx.einsatz.einheiten.find((e) => e.einsatzId === created.id)!;

    expect(() => splitEinheit(ctx, { einsatzId: created.id, sourceEinheitId: source.id, nameImEinsatz: 'Teil', fuehrung: 0, unterfuehrung: 0, mannschaft: 4 })).toThrow('übersteigt');
  });

  it('throws if vehicle is created without existing unit', () => {
    const ctx = createTestDb('s1-control-einsatz-vehicle-validation-');
    const created = createEinsatz(ctx, { name: 'Lage', fuestName: 'FüSt' });
    expect(() => createFahrzeug(ctx, { einsatzId: created.id, name: 'GKW 0', aktuelleEinsatzEinheitId: '' })).toThrow('erforderlich');
    expect(() => createFahrzeug(ctx, { einsatzId: created.id, name: 'GKW 1', aktuelleEinsatzEinheitId: 'missing-unit' })).toThrow('nicht gefunden');
  });

  it('rejects split with empty name and invalid organisation', () => {
    const ctx = createTestDb('s1-control-einsatz-split-validation-');
    const created = createEinsatz(ctx, { name: 'Lage', fuestName: 'FüSt' });
    const root = listAbschnitte(ctx.einsatz, created.id)[0]!;
    createEinheit(ctx, { einsatzId: created.id, nameImEinsatz: 'Basis', organisation: 'THW', aktuelleStaerke: 3, aktuelleStaerkeTaktisch: '0/0/3/3', aktuellerAbschnittId: root.id });
    const source = ctx.einsatz.einheiten.find((e) => e.einsatzId === created.id)!;

    expect(() => splitEinheit(ctx, { einsatzId: created.id, sourceEinheitId: source.id, nameImEinsatz: ' ', fuehrung: 0, unterfuehrung: 0, mannschaft: 1 })).toThrow('erforderlich');
    expect(() => splitEinheit(ctx, { einsatzId: created.id, sourceEinheitId: source.id, nameImEinsatz: 'Teil', organisation: 'INVALID' as never, fuehrung: 0, unterfuehrung: 0, mannschaft: 1 })).toThrow('Organisation ist');
  });

  it('creates nested abschnitt with parent reference', () => {
    const ctx = createTestDb('s1-control-einsatz-abschnitt-parent-');
    const created = createEinsatz(ctx, { name: 'Lage', fuestName: 'FüSt' });
    const root = listAbschnitte(ctx.einsatz, created.id)[0]!;
    const child = createAbschnitt(ctx, { einsatzId: created.id, name: 'EA Nord', parentId: root.id, systemTyp: 'NORMAL' });
    const inMem = ctx.einsatz.abschnitte.find((a) => a.id === child.id);
    expect(inMem?.parentId).toBe(root.id);
  });

  it('supports abschnitt type BEREITSTELLUNGSRAUM', () => {
    const ctx = createTestDb('s1-control-einsatz-bereitstellungsraum-');
    const created = createEinsatz(ctx, { name: 'Lage', fuestName: 'FüSt' });
    const root = listAbschnitte(ctx.einsatz, created.id)[0]!;
    const abschnitt = createAbschnitt(ctx, { einsatzId: created.id, name: 'BR Nord', parentId: root.id, systemTyp: 'BEREITSTELLUNGSRAUM' });
    const row = ctx.einsatz.abschnitte.find((a) => a.id === abschnitt.id);
    expect(row?.systemTyp).toBe('BEREITSTELLUNGSRAUM');
  });
});

describe('einsatz service - tactical sign behavior', () => {
  it('supports explicit tactical-sign config and source fallback during split', () => {
    const ctx = createTestDb('s1-control-einsatz-sign-config-');
    const created = createEinsatz(ctx, { name: 'Lage', fuestName: 'FüSt' });
    const root = listAbschnitte(ctx.einsatz, created.id)[0]!;

    createEinheit(ctx, { einsatzId: created.id, nameImEinsatz: 'Basis', organisation: 'THW', aktuelleStaerke: 4, aktuelleStaerkeTaktisch: '0/0/4/4', tacticalSignConfigJson: '{"einheit":"X"}', aktuellerAbschnittId: root.id });
    const source = ctx.einsatz.einheiten.find((e) => e.einsatzId === created.id)!;
    expect(source.tacticalSignConfigJson).toContain('"einheit":"X"');

    splitEinheit(ctx, { einsatzId: created.id, sourceEinheitId: source.id, nameImEinsatz: 'Teil A', fuehrung: 0, unterfuehrung: 0, mannschaft: 1 });
    splitEinheit(ctx, { einsatzId: created.id, sourceEinheitId: source.id, nameImEinsatz: 'Teil B', fuehrung: 0, unterfuehrung: 0, mannschaft: 1, tacticalSignConfigJson: '{"einheit":"Y"}' });

    const children = ctx.einsatz.einheiten.filter((e) => e.parentEinsatzEinheitId === source.id && e.einsatzId === created.id);
    expect(children.some((row) => row.tacticalSignConfigJson?.includes('"einheit":"X"'))).toBe(true);
    expect(children.some((row) => row.tacticalSignConfigJson?.includes('"einheit":"Y"'))).toBe(true);
  });

  it('re-infers tactical sign on update when source is auto and name changes', () => {
    const ctx = createTestDb('s1-control-einsatz-sign-auto-update-');
    const created = createEinsatz(ctx, { name: 'Lage', fuestName: 'FüSt' });
    const root = listAbschnitte(ctx.einsatz, created.id)[0]!;

    createEinheit(ctx, { einsatzId: created.id, nameImEinsatz: 'FK Oldenburg', organisation: 'THW', aktuelleStaerke: 4, aktuelleStaerkeTaktisch: '0/0/4/4', aktuellerAbschnittId: root.id });
    const source = ctx.einsatz.einheiten.find((e) => e.einsatzId === created.id)!;
    const before = JSON.parse(source.tacticalSignConfigJson ?? '{}') as { meta?: { rawName?: string; source?: string } };
    expect(before.meta?.source).toBe('auto');
    expect(before.meta?.rawName).toBe('FK Oldenburg');

    updateEinheit(ctx, { einsatzId: created.id, einheitId: source.id, nameImEinsatz: 'Bergung 1', organisation: 'THW', aktuelleStaerke: 4, aktuelleStaerkeTaktisch: '0/0/4/4', status: 'AKTIV' });

    const updated = ctx.einsatz.einheiten.find((e) => e.id === source.id)!;
    const parsed = JSON.parse(updated.tacticalSignConfigJson ?? '{}') as { meta?: { rawName?: string; source?: string } };
    expect(parsed.meta?.source).toBe('auto');
    expect(parsed.meta?.rawName).toBe('Bergung 1');
  });

  it('keeps manual tactical-sign config stable on rename without override payload', () => {
    const ctx = createTestDb('s1-control-einsatz-sign-manual-stable-');
    const created = createEinsatz(ctx, { name: 'Lage', fuestName: 'FüSt' });
    const root = listAbschnitte(ctx.einsatz, created.id)[0]!;

    createEinheit(ctx, { einsatzId: created.id, nameImEinsatz: 'Einheit A', organisation: 'THW', aktuelleStaerke: 4, aktuelleStaerkeTaktisch: '0/0/4/4', tacticalSignConfigJson: JSON.stringify({ einheit: 'MAN', typ: 'gruppe', meta: { source: 'manual' } }), aktuellerAbschnittId: root.id });
    const source = ctx.einsatz.einheiten.find((e) => e.einsatzId === created.id)!;
    updateEinheit(ctx, { einsatzId: created.id, einheitId: source.id, nameImEinsatz: 'Einheit B', organisation: 'THW', aktuelleStaerke: 4, aktuelleStaerkeTaktisch: '0/0/4/4', status: 'AKTIV' });

    const updated = ctx.einsatz.einheiten.find((e) => e.id === source.id)!;
    const parsed = JSON.parse(updated.tacticalSignConfigJson ?? '{}') as { einheit?: string; meta?: { source?: string } };
    expect(parsed.einheit).toBe('MAN');
    expect(parsed.meta?.source).toBe('manual');
  });
});

describe('einsatz service - edge validations', () => {
  it('validates split source existence, non-zero split and non-negative values', () => {
    const ctx = createTestDb('s1-control-einsatz-split-edge-');
    const created = createEinsatz(ctx, { name: 'Lage', fuestName: 'FüSt' });
    const root = listAbschnitte(ctx.einsatz, created.id)[0]!;
    createEinheit(ctx, { einsatzId: created.id, nameImEinsatz: 'Basis', organisation: 'THW', aktuelleStaerke: 2, aktuelleStaerkeTaktisch: '0/0/2/2', aktuellerAbschnittId: root.id });

    expect(() => splitEinheit(ctx, { einsatzId: created.id, sourceEinheitId: 'missing', nameImEinsatz: 'Teil', fuehrung: 0, unterfuehrung: 0, mannschaft: 1 })).toThrow('Quell-Einheit nicht gefunden');

    const source = ctx.einsatz.einheiten.find((e) => e.einsatzId === created.id)!;
    expect(() => splitEinheit(ctx, { einsatzId: created.id, sourceEinheitId: source.id, nameImEinsatz: 'Teil', fuehrung: 0, unterfuehrung: 0, mannschaft: 0 })).toThrow('größer 0');
    expect(() => splitEinheit(ctx, { einsatzId: created.id, sourceEinheitId: source.id, nameImEinsatz: 'Teil', fuehrung: -1, unterfuehrung: 0, mannschaft: 0 })).toThrow('>= 0');
  });

  it('creates multiple fahrzeuge for same unit', () => {
    const ctx = createTestDb('s1-control-einsatz-fahrzeug-multi-');
    const created = createEinsatz(ctx, { name: 'Lage', fuestName: 'FüSt' });
    const root = listAbschnitte(ctx.einsatz, created.id)[0]!;
    createEinheit(ctx, { einsatzId: created.id, nameImEinsatz: 'Basis', organisation: 'THW', aktuelleStaerke: 2, aktuelleStaerkeTaktisch: '0/0/2/2', aktuellerAbschnittId: root.id });
    const source = ctx.einsatz.einheiten.find((e) => e.einsatzId === created.id)!;

    createFahrzeug(ctx, { einsatzId: created.id, name: 'MTW 1', aktuelleEinsatzEinheitId: source.id });
    createFahrzeug(ctx, { einsatzId: created.id, name: 'MTW 2', aktuelleEinsatzEinheitId: source.id });

    const rows = ctx.einsatz.fahrzeuge.filter((f) => f.einsatzId === created.id);
    expect(rows).toHaveLength(2);
  });

  it('updates abschnitt in-place', () => {
    const ctx = createTestDb('s1-control-einsatz-update-');
    const created = createEinsatz(ctx, { name: 'Update-Test', fuestName: 'FüSt 1' });
    const root = listAbschnitte(ctx.einsatz, created.id)[0]!;
    const abschnitt = createAbschnitt(ctx, { einsatzId: created.id, name: 'EA Nord', systemTyp: 'NORMAL', parentId: root.id });

    updateAbschnitt(ctx, { einsatzId: created.id, abschnittId: abschnitt.id, name: 'EA Nord Neu', systemTyp: 'LOGISTIK', parentId: null });

    const updatedAbschnitt = ctx.einsatz.abschnitte.find((a) => a.id === abschnitt.id);
    expect(updatedAbschnitt?.name).toBe('EA Nord Neu');
    expect(updatedAbschnitt?.systemTyp).toBe('LOGISTIK');
    expect(updatedAbschnitt?.parentId).toBeNull();
  });

  it('updates einheit and fahrzeug in-place', () => {
    const ctx = createTestDb('s1-control-einsatz-update-entity-');
    const created = createEinsatz(ctx, { name: 'Update-Test', fuestName: 'FüSt 1' });
    const root = listAbschnitte(ctx.einsatz, created.id)[0]!;
    const abschnitt = createAbschnitt(ctx, { einsatzId: created.id, name: 'EA Nord', systemTyp: 'NORMAL', parentId: root.id });
    createEinheit(ctx, { einsatzId: created.id, nameImEinsatz: 'FK Nord', organisation: 'THW', aktuelleStaerke: 9, aktuelleStaerkeTaktisch: '0/1/8/9', aktuellerAbschnittId: abschnitt.id });
    const einheit = ctx.einsatz.einheiten.find((e) => e.nameImEinsatz === 'FK Nord')!;

    createFahrzeug(ctx, { einsatzId: created.id, name: 'MTW Nord', kennzeichen: 'THW-1', aktuelleEinsatzEinheitId: einheit.id });
    const fahrzeug = ctx.einsatz.fahrzeuge.find((f) => f.einsatzId === created.id)!;

    updateEinheit(ctx, { einsatzId: created.id, einheitId: einheit.id, nameImEinsatz: 'FK Nord Neu', organisation: 'FEUERWEHR', aktuelleStaerke: 6, aktuelleStaerkeTaktisch: '0/1/5/6', status: 'IN_BEREITSTELLUNG' });
    updateFahrzeug(ctx, { einsatzId: created.id, fahrzeugId: fahrzeug.id, name: 'ELW Nord', kennzeichen: 'HH-1234', aktuelleEinsatzEinheitId: einheit.id, status: 'IN_BEREITSTELLUNG' });

    const updatedEinheit = ctx.einsatz.einheiten.find((e) => e.id === einheit.id);
    expect(updatedEinheit?.nameImEinsatz).toBe('FK Nord Neu');
    expect(updatedEinheit?.organisation).toBe('FEUERWEHR');
    expect(updatedEinheit?.aktuelleStaerkeTaktisch).toBe('0/1/5/6');
    expect(updatedEinheit?.status).toBe('IN_BEREITSTELLUNG');

    const updatedVehicle = ctx.einsatz.fahrzeuge.find((f) => f.id === fahrzeug.id);
    expect(updatedVehicle?.status).toBe('IN_BEREITSTELLUNG');
    expect(updatedVehicle?.aktuelleEinsatzEinheitId).toBe(einheit.id);
    expect(updatedVehicle?.name).toBe('ELW Nord');
    expect(updatedVehicle?.kennzeichen).toBe('HH-1234');
  });

  it('stores person and reachability fields for units', () => {
    const ctx = createTestDb('s1-control-einsatz-person-fields-');
    const created = createEinsatz(ctx, { name: 'Personen-Test', fuestName: 'FüSt 1' });
    const root = listAbschnitte(ctx.einsatz, created.id)[0]!;

    createEinheit(ctx, { einsatzId: created.id, nameImEinsatz: 'FK OL', organisation: 'THW', aktuelleStaerke: 9, aktuelleStaerkeTaktisch: '0/1/8/9', aktuellerAbschnittId: root.id, vegetarierVorhanden: true, erreichbarkeiten: '2m-Funk, Mobiltelefon GrFü' });

    const einheit = ctx.einsatz.einheiten.find((e) => e.nameImEinsatz === 'FK OL' && e.einsatzId === created.id);
    expect(einheit?.vegetarierVorhanden).toBe(true);
    expect(einheit?.erreichbarkeiten).toBe('2m-Funk, Mobiltelefon GrFü');

    updateEinheit(ctx, { einsatzId: created.id, einheitId: einheit!.id, nameImEinsatz: 'FK OL', organisation: 'THW', aktuelleStaerke: 9, aktuelleStaerkeTaktisch: '0/1/8/9', status: 'AKTIV', vegetarierVorhanden: false, erreichbarkeiten: 'Nur 2m-Funk' });

    const updated = ctx.einsatz.einheiten.find((e) => e.id === einheit!.id);
    expect(updated?.vegetarierVorhanden).toBe(false);
    expect(updated?.erreichbarkeiten).toBe('Nur 2m-Funk');

    const details = listAbschnittDetails(ctx.einsatz, ctx.system, created.id, root.id);
    const listed = details.einheiten.find((row) => row.id === einheit!.id);
    expect(listed?.vegetarierVorhanden).toBe(false);
    expect(listed?.erreichbarkeiten).toBe('Nur 2m-Funk');
  });

  it('creates and updates helpers per unit', () => {
    const ctx = createTestDb('s1-control-einsatz-helfer-');
    const created = createEinsatz(ctx, { name: 'Helfer', fuestName: 'FüSt 1' });
    const root = listAbschnitte(ctx.einsatz, created.id)[0]!;
    createEinheit(ctx, { einsatzId: created.id, nameImEinsatz: 'FK OL', organisation: 'THW', aktuelleStaerke: 4, aktuelleStaerkeTaktisch: '0/1/3/4', aktuellerAbschnittId: root.id });
    const einheit = ctx.einsatz.einheiten.find((e) => e.einsatzId === created.id)!;

    createEinheitHelfer(ctx, { einsatzId: created.id, einsatzEinheitId: einheit.id, name: '', rolle: 'FUEHRER', geschlecht: 'WEIBLICH', anzahl: 2, funktion: 'Truppführer', telefon: '0151-123', erreichbarkeit: 'Funk', vegetarisch: true });

    let helfer = listEinheitHelfer(ctx.einsatz, einheit.id);
    expect(helfer).toHaveLength(1);
    expect(helfer[0]?.name).toBe('N.N.');
    expect(helfer[0]?.rolle).toBe('FUEHRER');
    expect(helfer[0]?.geschlecht).toBe('WEIBLICH');
    expect(helfer[0]?.anzahl).toBe(2);
    expect(helfer[0]?.vegetarisch).toBe(true);

    updateEinheitHelfer(ctx, { einsatzId: created.id, helferId: helfer[0]!.id, name: '', rolle: 'UNTERFUEHRER', geschlecht: 'MAENNLICH', anzahl: 3, funktion: 'Gruppenführer', telefon: '0151-456', erreichbarkeit: 'Telefon', vegetarisch: false, bemerkung: 'Schicht A' });

    helfer = listEinheitHelfer(ctx.einsatz, einheit.id);
    expect(helfer[0]?.rolle).toBe('UNTERFUEHRER');
    expect(helfer[0]?.anzahl).toBe(3);
    expect(helfer[0]?.vegetarisch).toBe(false);
    expect(helfer[0]?.bemerkung).toBe('Schicht A');
  });

  it('lists and deletes helpers per unit', () => {
    const ctx = createTestDb('s1-control-einsatz-helfer-delete-');
    const created = createEinsatz(ctx, { name: 'Helfer', fuestName: 'FüSt 1' });
    const root = listAbschnitte(ctx.einsatz, created.id)[0]!;
    createEinheit(ctx, { einsatzId: created.id, nameImEinsatz: 'FK OL', organisation: 'THW', aktuelleStaerke: 4, aktuelleStaerkeTaktisch: '0/1/3/4', aktuellerAbschnittId: root.id });
    const einheit = ctx.einsatz.einheiten.find((e) => e.einsatzId === created.id)!;

    createEinheitHelfer(ctx, { einsatzId: created.id, einsatzEinheitId: einheit.id, name: '', rolle: 'FUEHRER', geschlecht: 'WEIBLICH', anzahl: 2 });
    const helfer = listEinheitHelfer(ctx.einsatz, einheit.id);
    expect(ctx.einsatz.helfer.find((h) => h.id === helfer[0]!.id)).toBeTruthy();

    deleteEinheitHelfer(ctx, { einsatzId: created.id, helferId: helfer[0]!.id });
    expect(listEinheitHelfer(ctx.einsatz, einheit.id)).toHaveLength(0);
  });

  it('validates updateFahrzeug errors correctly', () => {
    const ctx = createTestDb('s1-control-einsatz-update-fahrzeug-edge-');
    const created = createEinsatz(ctx, { name: 'Fahrzeug Update', fuestName: 'FüSt 1' });
    const root = listAbschnitte(ctx.einsatz, created.id)[0]!;
    createEinheit(ctx, { einsatzId: created.id, nameImEinsatz: 'FK OL', organisation: 'THW', aktuelleStaerke: 4, aktuelleStaerkeTaktisch: '0/1/3/4', aktuellerAbschnittId: root.id });
    const einheit = ctx.einsatz.einheiten.find((e) => e.einsatzId === created.id)!;

    expect(() => updateFahrzeug(ctx, { einsatzId: created.id, fahrzeugId: 'missing', name: 'ELW 1', aktuelleEinsatzEinheitId: einheit.id })).toThrow('Fahrzeug nicht gefunden');
    expect(() => updateFahrzeug(ctx, { einsatzId: created.id, fahrzeugId: 'missing', name: 'ELW 1', aktuelleEinsatzEinheitId: '' })).toThrow('Zugeordnete Einheit ist erforderlich');

    createFahrzeug(ctx, { einsatzId: created.id, name: 'GKW', aktuelleEinsatzEinheitId: einheit.id });
    const fzg = ctx.einsatz.fahrzeuge.find((f) => f.einsatzId === created.id)!;

    updateFahrzeug(ctx, { einsatzId: created.id, fahrzeugId: fzg.id, name: 'ELW Neu', kennzeichen: 'THW-999', aktuelleEinsatzEinheitId: einheit.id, status: 'AKTIV' });
    const updated = ctx.einsatz.fahrzeuge.find((f) => f.id === fzg.id)!;
    expect(updated.name).toBe('ELW Neu');
    expect(updated.kennzeichen).toBe('THW-999');

    expect(() => updateFahrzeug(ctx, { einsatzId: created.id, fahrzeugId: fzg.id, name: 'ELW', aktuelleEinsatzEinheitId: 'missing-unit' })).toThrow('Zugeordnete Einheit nicht gefunden');
  });
});

describe('einsatz service - split default sign', () => {
  it('uses default tactical config on split when none exists in source or input', () => {
    const ctx = createTestDb('s1-control-einsatz-split-default-sign-');
    const created = createEinsatz(ctx, { name: 'Lage', fuestName: 'FüSt' });
    const root = listAbschnitte(ctx.einsatz, created.id)[0]!;

    ctx.einsatz.einheiten.push({
      id: 'source-ohne-sign-config', einsatzId: created.id, stammdatenEinheitId: null, parentEinsatzEinheitId: null,
      nameImEinsatz: 'Basis', organisation: 'THW', aktuelleStaerke: 3, aktuelleStaerkeTaktisch: '0/0/3/3',
      tacticalSignConfigJson: null, grFuehrerName: null, ovName: null, ovTelefon: null, ovFax: null,
      rbName: null, rbTelefon: null, rbFax: null, lvName: null, lvTelefon: null, lvFax: null,
      bemerkung: null, vegetarierVorhanden: null, erreichbarkeiten: null,
      aktuellerAbschnittId: root.id, status: 'AKTIV', erstellt: new Date().toISOString(), aufgeloest: null, version: 0,
    });

    splitEinheit(ctx, { einsatzId: created.id, sourceEinheitId: 'source-ohne-sign-config', nameImEinsatz: 'Teil', fuehrung: 0, unterfuehrung: 0, mannschaft: 1 });

    const child = ctx.einsatz.einheiten.find((e) => e.parentEinsatzEinheitId === 'source-ohne-sign-config' && e.einsatzId === created.id);
    expect(child?.tacticalSignConfigJson).toContain('"name":"Teil"');
    expect(child?.tacticalSignConfigJson).toContain('"organisationName":"THW"');
  });
});
