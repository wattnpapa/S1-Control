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
  abschnittName: string;
}

interface FahrzeugExportRow {
  id: string;
  name: string;
  kennzeichen: string | null;
  funkrufname: string | null;
  status: string;
  abschnittName: string;
  einheitName: string;
}

interface EinheitBewegungExportRow {
  einsatzEinheitId: string;
  objektName: string;
  vonAbschnittId: string | null;
  vonName: string;
  nachAbschnittId: string;
  nachName: string;
  zeitpunkt: string;
  benutzer: string;
}

interface FahrzeugBewegungExportRow {
  einsatzFahrzeugId: string;
  objektName: string;
  vonAbschnittId: string | null;
  vonName: string;
  nachAbschnittId: string;
  nachName: string;
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
  standIso: string;
  gesamtstaerke: string;
  einheiten: EinheitenExportRow[];
  fahrzeuge: FahrzeugExportRow[];
  einheitBewegungen: EinheitBewegungExportRow[];
  fahrzeugBewegungen: FahrzeugBewegungExportRow[];
}): string {
  const bewegungen = [...input.einheitBewegungen.map((b) => ({ ...b, typ: 'Einheit' })),
    ...input.fahrzeugBewegungen.map((b) => ({ ...b, typ: 'Fahrzeug' }))]
    .sort((a, b) => a.zeitpunkt.localeCompare(b.zeitpunkt));

  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>Einsatzakte ${escapeHtml(input.einsatzName)}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #000; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
    th, td { border: 1px solid #666; padding: 6px; text-align: left; font-size: 12px; }
    th { background: #eee; }
    .kopf { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
    .kopf dl { margin: 0; }
    .kopf dt { font-weight: 700; font-size: 12px; }
    .kopf dd { margin: 0 0 6px 0; font-size: 14px; }
    .unterschrift { margin-top: 32px; display: flex; gap: 48px; }
    .unterschrift div { flex: 1; border-top: 1px solid #000; padding-top: 6px; font-size: 12px; }
    /* Druckausgabe: jede Aufstellung beginnt auf einer neuen Seite, und die
       Kopfzeile wiederholt sich auf Folgeseiten. */
    @media print {
      body { padding: 0; }
      h2 { break-before: page; }
      h2:first-of-type { break-before: auto; }
      thead { display: table-header-group; }
      tr { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="kopf">
    <div>
      <h1>Einsatzakte: ${escapeHtml(input.einsatzName)}</h1>
      <dl>
        <dt>Führungsstelle</dt><dd>${escapeHtml(input.fuestName)}</dd>
        <dt>Stand des Ausdrucks</dt><dd>${escapeHtml(input.standIso)}</dd>
      </dl>
    </div>
    <div>
      <dl>
        <dt>Stärke vor Ort</dt><dd>${escapeHtml(input.gesamtstaerke)}</dd>
        <dt>Einsatzstatus</dt><dd>${escapeHtml(input.status)}</dd>
      </dl>
    </div>
  </div>

  <h2>Kräfte</h2>
  <table>
    <thead><tr><th>Einheit</th><th>Organisation</th><th>Stärke</th><th>Status</th><th>Abschnitt</th></tr></thead>
    <tbody>
      ${input.einheiten
        .map(
          (item) =>
            `<tr><td>${escapeHtml(item.nameImEinsatz)}</td><td>${escapeHtml(item.organisation)}</td><td>${escapeHtml(item.aktuelleStaerkeTaktisch ?? String(item.aktuelleStaerke))}</td><td>${escapeHtml(item.status)}</td><td>${escapeHtml(item.abschnittName)}</td></tr>`,
        )
        .join('')}
    </tbody>
  </table>

  <h2>Fahrzeuge</h2>
  <table>
    <thead><tr><th>Fahrzeug</th><th>Funkrufname</th><th>Kennzeichen</th><th>Einheit</th><th>Status</th><th>Abschnitt</th></tr></thead>
    <tbody>
      ${input.fahrzeuge
        .map(
          (item) =>
            `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.funkrufname ?? '-')}</td><td>${escapeHtml(item.kennzeichen ?? '-')}</td><td>${escapeHtml(item.einheitName)}</td><td>${escapeHtml(item.status)}</td><td>${escapeHtml(item.abschnittName)}</td></tr>`,
        )
        .join('')}
    </tbody>
  </table>

  <h2>Bewegungen</h2>
  <table>
    <thead><tr><th>Zeitpunkt</th><th>Typ</th><th>Objekt</th><th>Von</th><th>Nach</th><th>Erfasst von</th></tr></thead>
    <tbody>
      ${bewegungen
        .map(
          (item) =>
            `<tr><td>${escapeHtml(item.zeitpunkt)}</td><td>${escapeHtml(item.typ)}</td><td>${escapeHtml(item.objektName)}</td><td>${escapeHtml(item.vonName)}</td><td>${escapeHtml(item.nachName)}</td><td>${escapeHtml(item.benutzer)}</td></tr>`,
        )
        .join('')}
    </tbody>
  </table>

  <div class="unterschrift">
    <div>Erstellt (Name, Unterschrift)</div>
    <div>Übernommen (Name, Unterschrift)</div>
  </div>
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

  // Namen statt technischer Schlüssel: die Akte soll auf Papier lesbar sein.
  const abschnittName = (id: string | null): string => {
    if (!id) {
      return '-';
    }
    return ctx.einsatz.abschnitte.find((a) => a.id === id)?.name ?? 'entfernter Abschnitt';
  };
  const einheitName = (id: string | null): string => {
    if (!id) {
      return '-';
    }
    return ctx.einsatz.einheiten.find((i) => i.id === id)?.nameImEinsatz ?? 'entfernte Einheit';
  };
  const fahrzeugName = (id: string): string =>
    ctx.einsatz.fahrzeuge.find((f) => f.id === id)?.name ?? 'entferntes Fahrzeug';

  const einheiten: EinheitenExportRow[] = ctx.einsatz.einheiten
    .filter((i) => i.einsatzId === einsatzId && !i.aufgeloest)
    .map((i) => ({
      id: i.id,
      nameImEinsatz: i.nameImEinsatz,
      organisation: i.organisation,
      aktuelleStaerke: i.aktuelleStaerke,
      aktuelleStaerkeTaktisch: i.aktuelleStaerkeTaktisch,
      status: i.status,
      aktuellerAbschnittId: i.aktuellerAbschnittId,
      abschnittName: abschnittName(i.aktuellerAbschnittId),
    }));

  const fahrzeuge: FahrzeugExportRow[] = ctx.einsatz.fahrzeuge
    .filter((f) => f.einsatzId === einsatzId && !f.entfernt)
    .map((f) => ({
      id: f.id,
      name: f.name,
      kennzeichen: f.kennzeichen,
      funkrufname: f.funkrufname,
      status: f.status,
      abschnittName: abschnittName(f.aktuellerAbschnittId),
      einheitName: einheitName(f.aktuelleEinsatzEinheitId),
    }));

  const einheitIds = new Set(ctx.einsatz.einheiten.filter((i) => i.einsatzId === einsatzId).map((i) => i.id));
  const fahrzeugIds = new Set(ctx.einsatz.fahrzeuge.filter((f) => f.einsatzId === einsatzId).map((f) => f.id));

  const einheitBewegungen: EinheitBewegungExportRow[] = ctx.einsatz.einheitBewegungen
    .filter((b) => einheitIds.has(b.einsatzEinheitId))
    .map((b) => ({
      einsatzEinheitId: b.einsatzEinheitId,
      objektName: einheitName(b.einsatzEinheitId),
      vonAbschnittId: b.vonAbschnittId,
      vonName: abschnittName(b.vonAbschnittId),
      nachAbschnittId: b.nachAbschnittId,
      nachName: abschnittName(b.nachAbschnittId),
      zeitpunkt: b.zeitpunkt,
      benutzer: b.benutzer,
    }));

  const fahrzeugBewegungen: FahrzeugBewegungExportRow[] = ctx.einsatz.fahrzeugBewegungen
    .filter((b) => fahrzeugIds.has(b.einsatzFahrzeugId))
    .map((b) => ({
      einsatzFahrzeugId: b.einsatzFahrzeugId,
      objektName: fahrzeugName(b.einsatzFahrzeugId),
      vonAbschnittId: b.vonAbschnittId,
      vonName: abschnittName(b.vonAbschnittId),
      nachAbschnittId: b.nachAbschnittId,
      nachName: abschnittName(b.nachAbschnittId),
      zeitpunkt: b.zeitpunkt,
      benutzer: b.benutzer,
    }));

  const html = buildHtmlReport({
    einsatzName: e.name,
    fuestName: e.fuestName,
    status: e.status,
    standIso: new Date().toISOString(),
    gesamtstaerke: summiereStaerkeVorOrt(ctx, einsatzId),
    einheiten,
    fahrzeuge,
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

/**
 * Summiert die Stärke der Kräfte vor Ort nach derselben Regel wie die
 * Anzeige: ohne abgemeldete Einheiten und ohne Anfahrt-Abschnitte.
 */
function summiereStaerkeVorOrt(ctx: DbContext, einsatzId: string): string {
  const anfahrt = new Set(
    ctx.einsatz.abschnitte.filter((a) => a.systemTyp === 'ANFAHRT').map((a) => a.id),
  );
  let fuehrung = 0;
  let unterfuehrung = 0;
  let mannschaft = 0;
  for (const einheit of ctx.einsatz.einheiten) {
    if (einheit.einsatzId !== einsatzId || einheit.aufgeloest) {
      continue;
    }
    if (einheit.status === 'ABGEMELDET' || anfahrt.has(einheit.aktuellerAbschnittId)) {
      continue;
    }
    const teile = (einheit.aktuelleStaerkeTaktisch ?? '').split('/').map((wert) => Number(wert));
    if (teile.length === 4 && teile.every((wert) => Number.isFinite(wert))) {
      fuehrung += teile[0] ?? 0;
      unterfuehrung += teile[1] ?? 0;
      mannschaft += teile[2] ?? 0;
    } else {
      mannschaft += einheit.aktuelleStaerke;
    }
  }
  return `${fuehrung}/${unterfuehrung}/${mannschaft}/${fuehrung + unterfuehrung + mannschaft}`;
}
