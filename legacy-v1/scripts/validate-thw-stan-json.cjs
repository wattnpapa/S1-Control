const fs = require('node:fs');
const path = require('node:path');
const { validateStanPayload } = require('./thw-stan-sign-schema.cjs');

const inputPath =
  process.argv[2] ||
  path.join(process.cwd(), 'src', 'main', 'services', 'stan', 'thw-stan-2025.generated.json');

if (!fs.existsSync(inputPath)) {
  console.error(`Datei nicht gefunden: ${inputPath}`);
  process.exit(1);
}

let payload;
try {
  payload = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
} catch (error) {
  console.error(`JSON ungültig: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const errors = validateStanPayload(payload);
if (errors.length > 0) {
  console.error(`STAN-Validierung fehlgeschlagen (${errors.length} Fehler):`);
  for (const err of errors.slice(0, 100)) {
    console.error(`- ${err}`);
  }
  if (errors.length > 100) {
    console.error(`- ... weitere ${errors.length - 100} Fehler`);
  }
  process.exit(1);
}

const count = Array.isArray(payload.entries) ? payload.entries.length : 0;
console.log(`STAN-Validierung OK: ${count} Einträge geprüft (${inputPath})`);
