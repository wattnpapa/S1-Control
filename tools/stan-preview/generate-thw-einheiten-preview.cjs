const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_HTML = path.join(__dirname, 'thw-einheiten.html');
const DEFAULT_JSON_PATH = '../../src/main/services/stan/thw-stan-2025.generated.json';
const libRoot = path.dirname(require.resolve('taktische-zeichen/package.json'));
const handlebarsRuntime = fs.readFileSync(require.resolve('handlebars/dist/handlebars.min.js'), 'utf8');
const einheitTemplate = fs.readFileSync(path.join(libRoot, 'templates', 'Einheit.svg'), 'utf8');
const gebaeudeTemplate = fs.readFileSync(path.join(libRoot, 'templates', 'Gebäude.svg'), 'utf8');
const fahrzeugTemplate = fs.readFileSync(path.join(libRoot, 'templates', 'Fahrzeug.svg'), 'utf8');
const anhaengerTemplate = fs.readFileSync(path.join(libRoot, 'templates', 'Anhänger.svg'), 'utf8');
const wasserfahrzeugTemplate = fs.readFileSync(path.join(libRoot, 'templates', 'Wasserfahrzeug.svg'), 'utf8');
const luftfahrzeugTemplate = fs.readFileSync(path.join(libRoot, 'templates', 'Luftfahrzeug.svg'), 'utf8');
const wechselladerfahrzeugTemplate = fs.readFileSync(
  path.join(libRoot, 'templates', 'Wechselladerfahrzeug.svg'),
  'utf8',
);
const zweiradTemplate = fs.readFileSync(path.join(libRoot, 'templates', 'Zweirad.svg'), 'utf8');

function buildHtml() {
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>THW-Einheiten Vorschau</title>
  <style>
    :root { --line:#d8deea; --bg:#f3f6fb; --panel:#fff; --text:#1f2937; --muted:#5f6a7d; }
    * { box-sizing:border-box; }
    body { margin:0; font-family:"Segoe UI","Helvetica Neue",Arial,sans-serif; background:var(--bg); color:var(--text); }
    main { max-width:1600px; margin:0 auto; padding:16px; }
    h1 { margin:0 0 8px; }
    .meta { color:var(--muted); margin:0 0 14px; font-size:14px; }
    .toolbar { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:12px; background:var(--panel); border:1px solid var(--line); padding:10px; border-radius:8px; }
    button { border:1px solid #9ab0d9; background:#e8eefc; color:#1d2f63; border-radius:8px; padding:8px 12px; cursor:pointer; }
    input[type=file] { font-size:13px; }
    .status { color:var(--muted); font-size:13px; }
    .error { color:#8a1a1a; background:#fdeaea; border:1px solid #f6c9c9; border-radius:8px; padding:8px; margin-bottom:12px; }
    table { width:100%; border-collapse:collapse; background:var(--panel); border:1px solid var(--line); }
    th,td { border-bottom:1px solid var(--line); padding:10px; vertical-align:top; text-align:left; }
    th { background:#f7f9fd; font-size:14px; }
    .title { font-weight:600; }
    .source { color:var(--muted); font-size:12px; margin-top:4px; }
    .sign-cell { min-width:240px; }
    .sign-einheit { width:140px; height:auto; display:block; }
    .sign-vehicle { width:110px; height:auto; display:block; }
    .strength { font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace; font-weight:700; white-space:nowrap; }
    pre { margin:6px 0 10px; white-space:pre-wrap; word-break:break-word; font-size:12px; line-height:1.35; background:#f6f8fd; border:1px solid #e2e8f3; border-radius:6px; padding:6px; }
    .hint-pre { margin-top:6px; margin-bottom:0; }
    .vehicle-list { list-style:none; padding:0; margin:0; display:grid; gap:7px; }
    .vehicle-item { display:flex; align-items:flex-start; gap:10px; }
    .vehicle-sign-wrap { width:120px; flex:0 0 120px; }
    .muted { color:var(--muted); }
    .snippet-editor { width:100%; min-height:110px; resize:vertical; border:1px solid #d7deeb; border-radius:6px; padding:6px; font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace; font-size:11px; line-height:1.35; background:#f6f8fd; }
    .snippet-actions { margin-top:6px; display:flex; gap:6px; }
    .snippet-actions button { font-size:12px; padding:5px 8px; }
  </style>
</head>
<body>
  <main>
    <h1>THW-Einheiten Vorschau (STAN)</h1>
    <div class="toolbar">
      <button id="loadDefaultBtn">Standard-JSON laden</button>
      <label>JSON wählen: <input id="fileInput" type="file" accept=".json,application/json"></label>
      <button id="saveJsonBtn" type="button">JSON speichern</button>
      <span id="status" class="status"></span>
    </div>
    <div id="error"></div>
    <p id="meta" class="meta"></p>
    <table>
      <thead>
        <tr>
          <th>Titel</th>
          <th>Taktisches Zeichen der Einheit</th>
          <th>Stärke</th>
          <th>Fahrzeuge (jeweils mit taktischen Zeichen)</th>
        </tr>
      </thead>
      <tbody id="rows"></tbody>
    </table>
  </main>
  <script>${handlebarsRuntime}</script>
  <script>
    const DEFAULT_JSON_PATH = ${JSON.stringify(DEFAULT_JSON_PATH)};
    const EINHEIT_TEMPLATE = ${JSON.stringify(einheitTemplate)};
    const UNIT_TEMPLATE_MAP = {
      gebaeude: ${JSON.stringify(gebaeudeTemplate)},
    };
    const VEHICLE_TEMPLATE_MAP = {
      fahrzeug: ${JSON.stringify(fahrzeugTemplate)},
      'kraftfahrzeug-landgebunden': ${JSON.stringify(fahrzeugTemplate)},
      anhaenger: ${JSON.stringify(anhaengerTemplate)},
      'anhaenger-lkw': ${JSON.stringify(anhaengerTemplate)},
      'anhaenger-pkw': ${JSON.stringify(anhaengerTemplate)},
      wasserfahrzeug: ${JSON.stringify(wasserfahrzeugTemplate)},
      flugzeug: ${JSON.stringify(luftfahrzeugTemplate)},
      hubschrauber: ${JSON.stringify(luftfahrzeugTemplate)},
      luftfahrzeug: ${JSON.stringify(luftfahrzeugTemplate)},
      wechselladerfahrzeug: ${JSON.stringify(wechselladerfahrzeugTemplate)},
      wechsellader: ${JSON.stringify(wechselladerfahrzeugTemplate)},
      zweirad: ${JSON.stringify(zweiradTemplate)},
    };
    const templateCompilerCache = new Map();
    let currentPayload = null;
    let currentSourceLabel = DEFAULT_JSON_PATH;

    function esc(value) {
      return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }

    function toDataUrl(svg) {
      return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    }

    function cloneSign(sign) {
      if (!sign || typeof sign !== 'object' || Array.isArray(sign)) {
        return {};
      }
      return JSON.parse(JSON.stringify(sign));
    }

    function signUnitLabel(sign) {
      if (!sign || typeof sign !== 'object') {
        return '';
      }
      return String(sign.einheit || '').trim();
    }

    function addVerbandMarker(svg, typ) {
      let barCount = 0;
      if (typ === 'bereitschaft') barCount = 1;
      if (typ === 'abteilung') barCount = 2;
      if (typ === 'grossverband') barCount = 3;
      if (!barCount) {
        return svg;
      }
      const markerBlocks = [];
      const startX = 112 - ((barCount - 1) * 16) / 2;
      for (let i = 0; i < barCount; i += 1) {
        markerBlocks.push('<rect x="' + (startX + i * 16) + '" y="8" width="10" height="28" fill="#000000" />');
      }
      const markerSvg = markerBlocks.join('');
      return svg.replace('</svg>', markerSvg + '</svg>');
    }

    function signColors(sign) {
      const org = String(sign?.organisation || '').trim().toLowerCase();
      if (org === 'feuerwehr') return { primary: '#d61a1f', text: '#FFFFFF' };
      if (org === 'polizei') return { primary: '#13a538', text: '#FFFFFF' };
      if (org === 'bundeswehr') return { primary: '#7a6230', text: '#FFFFFF' };
      if (org === 'zivil') return { primary: '#f39200', text: '#000000' };
      if (org === 'hilfsorganisation') return { primary: '#FFFFFF', text: '#000000' };
      return { primary: '#003399', text: '#FFFFFF' };
    }

    function renderTemplate(template, data) {
      let compiled = templateCompilerCache.get(template);
      if (!compiled) {
        compiled = window.Handlebars.compile(template);
        templateCompilerCache.set(template, compiled);
      }
      return compiled(data);
    }

    function renderEinheitSign(sign) {
      const unitLabel = signUnitLabel(sign);
      if (!sign || !unitLabel) {
        return '';
      }
      const colors = signColors(sign);
      const signShape = String(sign.grundform || '').trim().toLowerCase();
      if (signShape && signShape !== 'taktische-formation') {
        const unitTemplate = UNIT_TEMPLATE_MAP[signShape];
        if (!unitTemplate) {
          return '';
        }
        const svg = renderTemplate(unitTemplate, {
          ...sign,
          color_primary: colors.primary,
          color_secondary: '#FFFFFF',
          stroke_color: '#000000',
          color_text: colors.text,
          organization: sign.nameDerOrganisation || '',
          unit: unitLabel,
          denominator: sign.verwaltungsstufe || '',
        });
        return toDataUrl(svg);
      }
      const typ = String(sign.typ || '').trim().toLowerCase();
      const svg = renderTemplate(EINHEIT_TEMPLATE, {
        ...sign,
        color_primary: colors.primary,
        color_secondary: '#FFFFFF',
        stroke_color: '#000000',
        color_text: colors.text,
        organization: sign.nameDerOrganisation || '',
        unit: unitLabel,
        denominator: sign.verwaltungsstufe || '',
        platoon: typ === 'zug',
        group: typ === 'gruppe',
        squad: typ === 'trupp',
        zugtrupp: typ === 'zugtrupp',
      });
      return toDataUrl(addVerbandMarker(svg, typ));
    }

    function renderFahrzeugSign(sign) {
      const unitLabel = signUnitLabel(sign);
      if (!sign || !unitLabel) {
        return '';
      }
      const colors = signColors(sign);
      const templateKey = String(sign.grundform || '').trim().toLowerCase();
      const template = VEHICLE_TEMPLATE_MAP[templateKey];
      if (!template) {
        return '';
      }
      const inferredTrailer = templateKey.includes('anhaenger');
      const svg = renderTemplate(template, {
        ...sign,
        color_primary: colors.primary,
        color_secondary: '#FFFFFF',
        stroke_color: '#000000',
        color_text: colors.text,
        organization: sign.nameDerOrganisation || '',
        unit: unitLabel,
        two_wheels: true,
        three_wheels: false,
        trailer: inferredTrailer,
        container: false,
        tracks: false,
        rail: false,
      });
      return toDataUrl(svg);
    }

    function formatStrength(strength) {
      if (!strength) return '-';
      return \`\${strength.fuehrung ?? 0}/\${strength.unterfuehrung ?? 0}/\${strength.mannschaft ?? 0}/\${strength.gesamt ?? 0}\`;
    }

    function setStatus(message) {
      document.getElementById('status').textContent = message;
    }

    function setError(message) {
      const el = document.getElementById('error');
      el.innerHTML = message ? \`<div class="error">\${esc(message)}</div>\` : '';
    }

    function renderRows(entries) {
      const tbody = document.getElementById('rows');
      tbody.innerHTML = '';
      const sorted = [...entries].sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'de'));
      for (const entry of sorted) {
        const entryId = String(entry.id || '');
        const einheitSrc = renderEinheitSign(entry.tacticalSign);
        const vehicles = Array.isArray(entry.vehicles) ? entry.vehicles : [];
        const vehicleSigns = Array.isArray(entry.vehicleTacticalSigns) ? entry.vehicleTacticalSigns : [];
        const tacticalHint = entry.tacticalSign ? JSON.stringify(entry.tacticalSign, null, 2) : '{}';
        const vehicleItems = vehicles.length
          ? vehicles.map((name, i) => {
              const sign = vehicleSigns[i];
              const src = renderFahrzeugSign(sign);
              const hint = sign ? JSON.stringify(cloneSign(sign), null, 2) : '{}';
              return \`<li class="vehicle-item">
  <span class="vehicle-sign-wrap">\${src ? \`<img class="sign-vehicle" src="\${src}" alt="Fahrzeugzeichen \${esc(signUnitLabel(sign) || name)}">\` : '-'}</span>
  <span>
    <div>\${esc(name)}</div>
    <textarea class="snippet-editor" data-entry-id="\${esc(entryId)}" data-kind="vehicle" data-vehicle-index="\${i}" spellcheck="false">\${esc(hint)}</textarea>
    <div class="snippet-actions"><button type="button" class="snippet-apply">Snippet anwenden</button></div>
  </span>
</li>\`;
            }).join('')
          : '<li class="vehicle-item muted">-</li>';

        const tr = document.createElement('tr');
        tr.innerHTML = \`<td>
  <div class="title">\${esc(entry.title || '-')}</div>
  <div class="source">\${esc(entry.sourceFile || '')}</div>
</td>
<td class="sign-cell">
  \${einheitSrc ? \`<img class="sign-einheit" src="\${einheitSrc}" alt="Einheitszeichen \${esc(signUnitLabel(entry.tacticalSign))}">\` : '<span class="muted">-</span>'}
  <div class="source">\${esc(signUnitLabel(entry.tacticalSign))}\${entry.tacticalSign?.verwaltungsstufe ? \` (\${esc(entry.tacticalSign.verwaltungsstufe)})\` : ''}</div>
  <textarea class="snippet-editor" data-entry-id="\${esc(entryId)}" data-kind="unit" spellcheck="false">\${esc(tacticalHint)}</textarea>
  <div class="snippet-actions"><button type="button" class="snippet-apply">Snippet anwenden</button></div>
</td>
<td class="strength">\${esc(formatStrength(entry.strength))}</td>
<td><ul class="vehicle-list">\${vehicleItems}</ul></td>\`;
        tbody.appendChild(tr);
      }
    }

    function renderPayload(payload, label) {
      const entries = Array.isArray(payload?.entries) ? payload.entries : [];
      for (const entry of entries) {
        entry.tacticalSign = cloneSign(entry.tacticalSign);
        if (Array.isArray(entry.vehicleTacticalSigns)) {
          entry.vehicleTacticalSigns = entry.vehicleTacticalSigns.map((sign) => cloneSign(sign));
        } else {
          entry.vehicleTacticalSigns = [];
        }
      }
      renderRows(entries);
      currentPayload = payload;
      currentSourceLabel = label;
      document.getElementById('meta').textContent =
        \`Quelle: \${label} | Einträge: \${entries.length} | Generiert: \${payload?.generatedAt || '-'}\`;
    }

    function findEntryById(entryId) {
      if (!currentPayload || !Array.isArray(currentPayload.entries)) {
        return null;
      }
      return currentPayload.entries.find((entry) => String(entry.id || '') === entryId) || null;
    }

    function applySnippet(textarea) {
      const entryId = textarea.dataset.entryId || '';
      const kind = textarea.dataset.kind || '';
      const vehicleIndex = Number(textarea.dataset.vehicleIndex || '-1');
      const entry = findEntryById(entryId);
      if (!entry) {
        setError(\`Eintrag nicht gefunden: \${entryId}\`);
        return;
      }
      const raw = textarea.value;
      try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Snippet muss ein JSON-Objekt sein');
        }
        if (kind === 'unit') {
          entry.tacticalSign = cloneSign(parsed);
        } else if (kind === 'vehicle') {
          if (!Array.isArray(entry.vehicleTacticalSigns)) {
            entry.vehicleTacticalSigns = [];
          }
          if (!Number.isInteger(vehicleIndex) || vehicleIndex < 0) {
            throw new Error('Ungültiger Fahrzeug-Index');
          }
          entry.vehicleTacticalSigns[vehicleIndex] = cloneSign(parsed);
        } else {
          throw new Error('Unbekannter Snippet-Typ');
        }
        renderPayload(currentPayload, currentSourceLabel);
        setError('');
        setStatus('Snippet übernommen.');
      } catch (error) {
        setError(\`Snippet-Fehler: \${error instanceof Error ? error.message : String(error)}\`);
        setStatus('Snippet ungültig.');
      }
    }

    function saveJsonToFile() {
      if (!currentPayload) {
        setStatus('Keine JSON geladen.');
        return;
      }
      const text = JSON.stringify(currentPayload, null, 2) + '\\n';
      const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const safeSource = String(currentSourceLabel || 'thw-stan')
        .replace(/^.*[\\\\/]/, '')
        .replace(/[^a-zA-Z0-9._-]+/g, '_')
        .replace(/_+/g, '_');
      anchor.href = url;
      anchor.download = safeSource.endsWith('.json') ? safeSource : 'thw-stan-korrigiert.json';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setStatus('JSON gespeichert.');
    }

    async function loadDefaultJson() {
      setStatus('Lade Standard-JSON...');
      setError('');
      try {
        const res = await fetch(DEFAULT_JSON_PATH, { cache: 'no-store' });
        if (!res.ok) {
          throw new Error(\`HTTP \${res.status}\`);
        }
        const payload = await res.json();
        renderPayload(payload, DEFAULT_JSON_PATH);
        setStatus('Standard-JSON geladen.');
      } catch (error) {
        setError(
          \`Standard-JSON konnte nicht geladen werden (\${error instanceof Error ? error.message : String(error)}). \` +
          'Bitte JSON-Datei manuell wählen.'
        );
        setStatus('Bitte JSON-Datei wählen.');
      }
    }

    function loadFromFile(file) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const payload = JSON.parse(String(reader.result || '{}'));
          renderPayload(payload, file.name);
          setStatus('Datei geladen.');
          setError('');
        } catch (error) {
          setError(\`Ungültige JSON-Datei: \${error instanceof Error ? error.message : String(error)}\`);
          setStatus('Fehler.');
        }
      };
      reader.readAsText(file, 'utf8');
    }

    document.getElementById('loadDefaultBtn').addEventListener('click', () => {
      void loadDefaultJson();
    });
    document.getElementById('fileInput').addEventListener('change', (event) => {
      const file = event.target.files && event.target.files[0];
      if (file) {
        loadFromFile(file);
      }
    });
    document.getElementById('saveJsonBtn').addEventListener('click', saveJsonToFile);
    document.getElementById('rows').addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.classList.contains('snippet-apply')) {
        return;
      }
      const container = target.closest('li, td');
      const textarea = container ? container.querySelector('.snippet-editor') : null;
      if (textarea instanceof HTMLTextAreaElement) {
        applySnippet(textarea);
      }
    });

    void loadDefaultJson();
  </script>
</body>
</html>`;
}

fs.writeFileSync(OUTPUT_HTML, buildHtml(), 'utf8');
console.log(`Wrote ${OUTPUT_HTML}`);
