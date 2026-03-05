import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { eq } from 'drizzle-orm';
import type { DbContext } from '../db/connection';
import {
  einsatz,
  einsatzEinheit,
  einsatzEinheitBewegung,
  einsatzFahrzeug,
  einsatzFahrzeugBewegung,
} from '../db/schema';
import { AppError } from './errors';

interface EinheitenExportRow {
  id: string;
  nameImEinsatz: string;
  organisation: string;
  aktuelleStaerke: number;
  aktuelleStaerkeTaktisch: string | null;
  status: string;
  aktuellerAbschnittId: string;
}

interface EinheitBewegungExportRow {
  einsatzEinheitId: string;
  vonAbschnittId: string | null;
  nachAbschnittId: string;
  zeitpunkt: string;
  benutzer: string;
}

interface FahrzeugBewegungExportRow {
  einsatzFahrzeugId: string;
  vonAbschnittId: string | null;
  nachAbschnittId: string;
  zeitpunkt: string;
  benutzer: string;
}

/**
 * Handles Escape Html.
 */
function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/**
 * Handles To Csv Row.
 */
function toCsvRow(values: Array<string | number | null>): string {
  return values
    .map((value) => {
      const text = value === null ? '' : String(value);
      return `"${text.replaceAll('"', '""')}"`;
    })
    .join(';');
}

/**
 * Loads all movement rows for a set of entity ids.
 */
function loadMovements<TMovement>(
  ids: string[],
  loader: (id: string) => TMovement[],
): TMovement[] {
  return ids.flatMap((id) => loader(id));
}

/**
 * Builds html report for export package.
 */
function buildHtmlReport(input: {
  einsatzName: string;
  fuestName: string;
  status: string;
  einheiten: EinheitenExportRow[];
  einheitBewegungen: EinheitBewegungExportRow[];
  fahrzeugBewegungen: FahrzeugBewegungExportRow[];
}): string {
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>Einsatzakte ${escapeHtml(input.einsatzName)}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
    th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
    th { background: #f0f0f0; }
  </style>
</head>
<body>
  <h1>Einsatzakte: ${escapeHtml(input.einsatzName)}</h1>
  <p>FüSt: ${escapeHtml(input.fuestName)} | Status: ${escapeHtml(input.status)}</p>
  <h2>Kräfteübersicht Einheiten</h2>
  <table>
    <thead><tr><th>Name</th><th>Organisation</th><th>Stärke</th><th>Stärke taktisch</th><th>Status</th><th>Abschnitt</th></tr></thead>
    <tbody>
      ${input.einheiten
        .map(
          (item) =>
            `<tr><td>${escapeHtml(item.nameImEinsatz)}</td><td>${escapeHtml(item.organisation)}</td><td>${item.aktuelleStaerke}</td><td>${escapeHtml(item.aktuelleStaerkeTaktisch ?? '-')}</td><td>${escapeHtml(item.status)}</td><td>${escapeHtml(item.aktuellerAbschnittId)}</td></tr>`,
        )
        .join('')}
    </tbody>
  </table>
  <h2>Bewegungen</h2>
  <table>
    <thead><tr><th>Typ</th><th>Objekt</th><th>Von</th><th>Nach</th><th>Zeitpunkt</th><th>Benutzer</th></tr></thead>
    <tbody>
      ${input.einheitBewegungen
        .map(
          (item) =>
            `<tr><td>Einheit</td><td>${escapeHtml(item.einsatzEinheitId)}</td><td>${escapeHtml(item.vonAbschnittId ?? '-')}</td><td>${escapeHtml(item.nachAbschnittId)}</td><td>${escapeHtml(item.zeitpunkt)}</td><td>${escapeHtml(item.benutzer)}</td></tr>`,
        )
        .join('')}
      ${input.fahrzeugBewegungen
        .map(
          (item) =>
            `<tr><td>Fahrzeug</td><td>${escapeHtml(item.einsatzFahrzeugId)}</td><td>${escapeHtml(item.vonAbschnittId ?? '-')}</td><td>${escapeHtml(item.nachAbschnittId)}</td><td>${escapeHtml(item.zeitpunkt)}</td><td>${escapeHtml(item.benutzer)}</td></tr>`,
        )
        .join('')}
    </tbody>
  </table>
</body>
</html>`;
}

/**
 * Builds CSV output for unit rows.
 */
function buildEinheitenCsv(einheiten: EinheitenExportRow[]): string {
  return [
    toCsvRow([
      'id',
      'name_im_einsatz',
      'organisation',
      'aktuelle_staerke',
      'aktuelle_staerke_taktisch',
      'status',
      'aktueller_abschnitt_id',
    ]),
    ...einheiten.map((item) =>
      toCsvRow([
        item.id,
        item.nameImEinsatz,
        item.organisation,
        item.aktuelleStaerke,
        item.aktuelleStaerkeTaktisch,
        item.status,
        item.aktuellerAbschnittId,
      ]),
    ),
  ].join('\n');
}

/**
 * Builds CSV output for movement rows.
 */
function buildBewegungenCsv(
  einheitBewegungen: EinheitBewegungExportRow[],
  fahrzeugBewegungen: FahrzeugBewegungExportRow[],
): string {
  return [
    toCsvRow(['typ', 'objekt_id', 'von_abschnitt_id', 'nach_abschnitt_id', 'zeitpunkt', 'benutzer']),
    ...einheitBewegungen.map((item) =>
      toCsvRow(['EINHEIT', item.einsatzEinheitId, item.vonAbschnittId, item.nachAbschnittId, item.zeitpunkt, item.benutzer]),
    ),
    ...fahrzeugBewegungen.map((item) =>
      toCsvRow(['FAHRZEUG', item.einsatzFahrzeugId, item.vonAbschnittId, item.nachAbschnittId, item.zeitpunkt, item.benutzer]),
    ),
  ].join('\n');
}

/**
 * Handles Export Einsatzakte.
 */
export async function exportEinsatzakte(
  ctx: DbContext,
  einsatzId: string,
  outputPath: string,
): Promise<void> {
  const einsatzRow = ctx.db.select().from(einsatz).where(eq(einsatz.id, einsatzId)).get();
  if (!einsatzRow) {
    throw new AppError('Einsatz nicht gefunden', 'NOT_FOUND');
  }

  const einheiten = ctx.db.select().from(einsatzEinheit).where(eq(einsatzEinheit.einsatzId, einsatzId)).all();
  const fahrzeuge = ctx.db.select().from(einsatzFahrzeug).where(eq(einsatzFahrzeug.einsatzId, einsatzId)).all();

  const einheitIds = einheiten.map((item) => item.id);
  const fahrzeugIds = fahrzeuge.map((item) => item.id);

  const einheitBewegungen = loadMovements(einheitIds, (id) =>
    ctx.db.select().from(einsatzEinheitBewegung).where(eq(einsatzEinheitBewegung.einsatzEinheitId, id)).all(),
  );
  const fahrzeugBewegungen = loadMovements(fahrzeugIds, (id) =>
    ctx.db.select().from(einsatzFahrzeugBewegung).where(eq(einsatzFahrzeugBewegung.einsatzFahrzeugId, id)).all(),
  );

  const html = buildHtmlReport({
    einsatzName: einsatzRow.name,
    fuestName: einsatzRow.fuestName,
    status: einsatzRow.status,
    einheiten,
    einheitBewegungen,
    fahrzeugBewegungen,
  });
  const einheitenCsv = buildEinheitenCsv(einheiten);
  const bewegungenCsv = buildBewegungenCsv(einheitBewegungen, fahrzeugBewegungen);

  const zip = new JSZip();
  zip.file('einsatzakte/report.html', html);
  zip.file('einsatzakte/einheiten.csv', einheitenCsv);
  zip.file('einsatzakte/bewegungen.csv', bewegungenCsv);
  zip.file('einsatzakte/einsatz.s1control', fs.readFileSync(ctx.path));

  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);
}
