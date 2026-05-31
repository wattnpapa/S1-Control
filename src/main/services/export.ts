import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import type { DbContext } from '../db/connection';
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

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function toCsvRow(values: Array<string | number | null>): string {
  return values
    .map((value) => {
      const text = value === null ? '' : String(value);
      return `"${text.replaceAll('"', '""')}"`;
    })
    .join(';');
}

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

function buildEinheitenCsv(einheiten: EinheitenExportRow[]): string {
  return [
    toCsvRow(['id', 'name_im_einsatz', 'organisation', 'aktuelle_staerke', 'aktuelle_staerke_taktisch', 'status', 'aktueller_abschnitt_id']),
    ...einheiten.map((item) =>
      toCsvRow([item.id, item.nameImEinsatz, item.organisation, item.aktuelleStaerke, item.aktuelleStaerkeTaktisch, item.status, item.aktuellerAbschnittId]),
    ),
  ].join('\n');
}

function buildBewegungenCsv(einheitBewegungen: EinheitBewegungExportRow[], fahrzeugBewegungen: FahrzeugBewegungExportRow[]): string {
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

export async function exportEinsatzakte(ctx: DbContext, einsatzId: string, outputPath: string): Promise<void> {
  const e = ctx.einsatz.einsatz;
  if (e.id !== einsatzId) {
    throw new AppError('Einsatz nicht gefunden', 'NOT_FOUND');
  }

  const einheiten: EinheitenExportRow[] = ctx.einsatz.einheiten
    .filter((i) => i.einsatzId === einsatzId)
    .map((i) => ({
      id: i.id,
      nameImEinsatz: i.nameImEinsatz,
      organisation: i.organisation,
      aktuelleStaerke: i.aktuelleStaerke,
      aktuelleStaerkeTaktisch: i.aktuelleStaerkeTaktisch,
      status: i.status,
      aktuellerAbschnittId: i.aktuellerAbschnittId,
    }));

  const einheitIds = new Set(einheiten.map((i) => i.id));
  const fahrzeugIds = new Set(ctx.einsatz.fahrzeuge.filter((f) => f.einsatzId === einsatzId).map((f) => f.id));

  const einheitBewegungen: EinheitBewegungExportRow[] = ctx.einsatz.einheitBewegungen
    .filter((b) => einheitIds.has(b.einsatzEinheitId))
    .map((b) => ({
      einsatzEinheitId: b.einsatzEinheitId,
      vonAbschnittId: b.vonAbschnittId,
      nachAbschnittId: b.nachAbschnittId,
      zeitpunkt: b.zeitpunkt,
      benutzer: b.benutzer,
    }));

  const fahrzeugBewegungen: FahrzeugBewegungExportRow[] = ctx.einsatz.fahrzeugBewegungen
    .filter((b) => fahrzeugIds.has(b.einsatzFahrzeugId))
    .map((b) => ({
      einsatzFahrzeugId: b.einsatzFahrzeugId,
      vonAbschnittId: b.vonAbschnittId,
      nachAbschnittId: b.nachAbschnittId,
      zeitpunkt: b.zeitpunkt,
      benutzer: b.benutzer,
    }));

  const html = buildHtmlReport({ einsatzName: e.name, fuestName: e.fuestName, status: e.status, einheiten, einheitBewegungen, fahrzeugBewegungen });
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
