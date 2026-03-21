const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

const ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_HTML = path.join(__dirname, 'thw-einheiten.html');
const DEFAULT_JSON_PATH = '../../src/main/services/stan/thw-stan-2025.generated.json';

function buildRendererBundle() {
  const bundle = esbuild.buildSync({
    stdin: {
      contents: `
        import { erzeugeTaktischesZeichen } from 'taktische-zeichen-core';

        function normalizeSpec(input) {
          if (!input || typeof input !== 'object' || Array.isArray(input)) {
            return {};
          }
          return structuredClone(input);
        }

        window.__tzRender = function __tzRender(spec) {
          const image = erzeugeTaktischesZeichen(normalizeSpec(spec));
          return image.dataUrl;
        };
      `,
      resolveDir: ROOT,
      sourcefile: 'stan-preview-renderer-entry.ts',
      loader: 'ts',
    },
    bundle: true,
    minify: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    target: ['es2022'],
  });

  return bundle.outputFiles[0].text;
}

function buildHtml(coreBundle) {
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
    .sign-einheit { width:220px; height:auto; display:block; }
    .sign-vehicle { width:160px; height:auto; display:block; }
    .strength { font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace; font-weight:700; white-space:nowrap; }
    .vehicle-list { list-style:none; padding:0; margin:0; display:grid; gap:8px; }
    .vehicle-item { display:flex; gap:10px; align-items:flex-start; }
    .vehicle-sign-wrap { width:170px; flex:0 0 170px; }
    .muted { color:var(--muted); }
    .snippet-editor { width:100%; min-height:130px; resize:vertical; border:1px solid #d7deeb; border-radius:6px; padding:6px; font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace; font-size:11px; line-height:1.35; background:#f6f8fd; }
    .snippet-actions { margin-top:6px; }
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
  <script>${coreBundle}</script>
  <script>
    const DEFAULT_JSON_PATH = ${JSON.stringify(DEFAULT_JSON_PATH)};
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

    function cloneSign(sign) {
      if (!sign || typeof sign !== 'object' || Array.isArray(sign)) {
        return {};
      }
      return JSON.parse(JSON.stringify(sign));
    }

    function renderSign(sign) {
      try {
        return { src: window.__tzRender(cloneSign(sign)), error: '' };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { src: '', error: message };
      }
    }

    function formatStrength(strength) {
      if (!strength) return '-';
      return String(strength.fuehrung ?? 0) + '/' + String(strength.unterfuehrung ?? 0) + '/' + String(strength.mannschaft ?? 0) + '/' + String(strength.gesamt ?? 0);
    }

    function setStatus(message) {
      document.getElementById('status').textContent = message;
    }

    function setError(message) {
      const el = document.getElementById('error');
      el.innerHTML = message ? '<div class="error">' + esc(message) + '</div>' : '';
    }

    function updateEntrySnippet(entryIndex, signPath, editor, img, type) {
      try {
        const parsed = JSON.parse(editor.value);
        if (signPath === 'tacticalSign') {
          currentPayload.entries[entryIndex].tacticalSign = parsed;
        } else {
          currentPayload.entries[entryIndex].vehicleTacticalSigns[signPath] = parsed;
        }
        const rendered = renderSign(parsed);
        if (!rendered.src) {
          throw new Error(rendered.error || 'Ungültige Parameter für taktisches Zeichen');
        }
        img.src = rendered.src;
        img.title = '';
        const appliedValue = type === 'einheit'
          ? currentPayload.entries[entryIndex].tacticalSign
          : currentPayload.entries[entryIndex].vehicleTacticalSigns[signPath];
        editor.value = JSON.stringify(appliedValue, null, 2);
        setError('');
        setStatus('Snippet übernommen');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setError('Snippet konnte nicht angewendet werden: ' + message);
      }
    }

    function renderRows(entries) {
      const tbody = document.getElementById('rows');
      tbody.innerHTML = '';

      entries.forEach((entry, entryIndex) => {
        const tr = document.createElement('tr');

        const tdTitle = document.createElement('td');
        tdTitle.innerHTML = '<div class="title">' + esc(entry.title || '') + '</div><div class="source">' + esc(entry.sourceFile || '') + '</div>';

        const tdSign = document.createElement('td');
        const einheitSign = cloneSign(entry.tacticalSign);
        const unitImg = document.createElement('img');
        unitImg.className = 'sign-einheit';
        const renderedUnit = renderSign(einheitSign);
        unitImg.src = renderedUnit.src;
        unitImg.title = renderedUnit.error || '';
        tdSign.appendChild(unitImg);
        if (renderedUnit.error) {
          const unitError = document.createElement('div');
          unitError.className = 'muted';
          unitError.textContent = 'Render-Fehler: ' + renderedUnit.error;
          tdSign.appendChild(unitError);
        }

        const unitEditor = document.createElement('textarea');
        unitEditor.className = 'snippet-editor';
        unitEditor.value = JSON.stringify(einheitSign, null, 2);
        tdSign.appendChild(unitEditor);

        const unitActions = document.createElement('div');
        unitActions.className = 'snippet-actions';
        const unitApply = document.createElement('button');
        unitApply.textContent = 'Snippet anwenden';
        unitApply.type = 'button';
        unitApply.addEventListener('click', () => updateEntrySnippet(entryIndex, 'tacticalSign', unitEditor, unitImg, 'einheit'));
        unitActions.appendChild(unitApply);
        tdSign.appendChild(unitActions);

        const tdStrength = document.createElement('td');
        tdStrength.className = 'strength';
        tdStrength.textContent = formatStrength(entry.strength);

        const tdVehicles = document.createElement('td');
        const list = document.createElement('ul');
        list.className = 'vehicle-list';

        const vehicleSigns = Array.isArray(entry.vehicleTacticalSigns) ? entry.vehicleTacticalSigns : [];
        const vehicles = Array.isArray(entry.vehicles) ? entry.vehicles : [];
        const maxLength = Math.max(vehicleSigns.length, vehicles.length);

        for (let i = 0; i < maxLength; i += 1) {
          const vehicleName = vehicles[i] || '(ohne Fahrzeugname)';
          const sign = cloneSign(vehicleSigns[i]);
          const li = document.createElement('li');
          li.className = 'vehicle-item';

          const signWrap = document.createElement('div');
          signWrap.className = 'vehicle-sign-wrap';
          const img = document.createElement('img');
          img.className = 'sign-vehicle';
          const renderedVehicle = renderSign(sign);
          img.src = renderedVehicle.src;
          img.title = renderedVehicle.error || '';
          signWrap.appendChild(img);
          if (renderedVehicle.error) {
            const vehicleError = document.createElement('div');
            vehicleError.className = 'muted';
            vehicleError.textContent = 'Render-Fehler: ' + renderedVehicle.error;
            signWrap.appendChild(vehicleError);
          }
          li.appendChild(signWrap);

          const textWrap = document.createElement('div');
          textWrap.innerHTML = '<div><strong>' + esc(vehicleName) + '</strong></div>';
          const editor = document.createElement('textarea');
          editor.className = 'snippet-editor';
          editor.value = JSON.stringify(sign, null, 2);
          textWrap.appendChild(editor);

          const actions = document.createElement('div');
          actions.className = 'snippet-actions';
          const applyBtn = document.createElement('button');
          applyBtn.textContent = 'Snippet anwenden';
          applyBtn.type = 'button';
          applyBtn.addEventListener('click', () => updateEntrySnippet(entryIndex, i, editor, img, 'fahrzeug'));
          actions.appendChild(applyBtn);
          textWrap.appendChild(actions);

          li.appendChild(textWrap);
          list.appendChild(li);
        }

        if (maxLength === 0) {
          tdVehicles.innerHTML = '<span class="muted">-</span>';
        } else {
          tdVehicles.appendChild(list);
        }

        tr.appendChild(tdTitle);
        tr.appendChild(tdSign);
        tr.appendChild(tdStrength);
        tr.appendChild(tdVehicles);
        tbody.appendChild(tr);
      });
    }

    function renderPayload(payload, label) {
      if (!payload || !Array.isArray(payload.entries)) {
        throw new Error('JSON enthält kein Feld "entries" als Array.');
      }
      currentPayload = payload;
      currentSourceLabel = label;
      renderRows(payload.entries);
      setStatus('Quelle: ' + label + ' | Einträge: ' + payload.entries.length);
    }

    function saveCurrentPayload() {
      if (!currentPayload) {
        setError('Kein JSON geladen.');
        return;
      }
      const blob = new Blob([JSON.stringify(currentPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'thw-stan-2025.generated.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus('JSON gespeichert');
    }

    async function loadDefaultJson() {
      setError('');
      setStatus('Lade Standard-JSON...');
      const response = await fetch(DEFAULT_JSON_PATH);
      if (!response.ok) {
        throw new Error('Standard-JSON konnte nicht geladen werden: ' + response.status + ' ' + response.statusText);
      }
      const payload = await response.json();
      renderPayload(payload, DEFAULT_JSON_PATH);
    }

    async function handleFileInput(file) {
      if (!file) return;
      setError('');
      setStatus('Lade Datei...');
      const text = await file.text();
      const payload = JSON.parse(text);
      renderPayload(payload, file.name);
    }

    document.getElementById('loadDefaultBtn').addEventListener('click', async () => {
      try {
        await loadDefaultJson();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setError(message);
        setStatus('Fehler');
      }
    });

    document.getElementById('saveJsonBtn').addEventListener('click', () => saveCurrentPayload());

    document.getElementById('fileInput').addEventListener('change', async (event) => {
      try {
        const file = event.target.files && event.target.files[0] ? event.target.files[0] : null;
        await handleFileInput(file);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setError('Datei konnte nicht geladen werden: ' + message);
        setStatus('Fehler');
      }
    });

    loadDefaultJson().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      setError(message + ' (Hinweis: Bei file:// kann der Browser fetch blockieren; nutze dann "JSON wählen".)');
      setStatus('Bereit');
    });
  </script>
</body>
</html>`;
}

function run() {
  const rendererBundle = buildRendererBundle();
  const html = buildHtml(rendererBundle);
  fs.writeFileSync(OUTPUT_HTML, html, 'utf8');
  console.log('Wrote', path.relative(process.cwd(), OUTPUT_HTML));
}

run();
