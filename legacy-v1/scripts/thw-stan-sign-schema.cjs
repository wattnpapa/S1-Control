const REQUIRED_SIGN_KEYS = [
  'grundform',
  'fachaufgabe',
  'organisation',
  'einheit',
  'verwaltungsstufe',
  'symbol',
  'text',
  'name',
  'organisationsname',
  'typ',
];

const ALLOWED_GRUNDFORM = new Set(['taktische-formation', 'fahrzeug', 'anhaenger']);
const ALLOWED_TYP = new Set(['none', 'platoon', 'group', 'squad', 'zugtrupp', '']);
const ALLOWED_ORGANISATION = new Set([
  'THW',
  'FEUERWEHR',
  'POLIZEI',
  'BUNDESWEHR',
  'REGIE',
  'DRK',
  'ASB',
  'JOHANNITER',
  'MALTESER',
  'DLRG',
  'BERGWACHT',
  'MHD',
  'RETTUNGSDIENST_KOMMUNAL',
  'SONSTIGE',
]);

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function validateSignObject(sign, location) {
  const errors = [];
  if (!sign || typeof sign !== 'object') {
    return [`${location}: Sign-Objekt fehlt`];
  }

  for (const key of Object.keys(sign)) {
    if (!REQUIRED_SIGN_KEYS.includes(key)) {
      errors.push(`${location}: unerlaubtes Feld -> ${key}`);
    }
  }
  for (const key of REQUIRED_SIGN_KEYS) {
    if (!hasOwn(sign, key)) {
      errors.push(`${location}: Pflichtfeld fehlt -> ${key}`);
    }
  }
  if (errors.length > 0) {
    return errors;
  }

  for (const key of REQUIRED_SIGN_KEYS) {
    if (typeof sign[key] !== 'string') {
      errors.push(`${location}: Feld muss String sein -> ${key}`);
    }
  }

  if (!ALLOWED_GRUNDFORM.has(sign.grundform)) {
    errors.push(
      `${location}: ungültige grundform "${sign.grundform}" (erlaubt: ${Array.from(ALLOWED_GRUNDFORM).join(', ')})`,
    );
  }
  if (!ALLOWED_ORGANISATION.has(sign.organisation)) {
    errors.push(`${location}: ungültige organisation "${sign.organisation}"`);
  }
  if (!ALLOWED_TYP.has(sign.typ)) {
    errors.push(`${location}: ungültiger typ "${sign.typ}"`);
  }

  if (sign.grundform === 'taktische-formation' && sign.typ === '') {
    errors.push(`${location}: typ darf für taktische-formation nicht leer sein`);
  }
  if ((sign.grundform === 'fahrzeug' || sign.grundform === 'anhaenger') && sign.typ !== 'none' && sign.typ !== '') {
    errors.push(`${location}: typ muss bei fahrzeug/anhaenger "none" oder leer sein`);
  }
  return errors;
}

function validateStanPayload(payload) {
  const errors = [];
  const entries = Array.isArray(payload?.entries) ? payload.entries : [];
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    const entryId = entry?.id || `entry[${i}]`;
    errors.push(...validateSignObject(entry?.tacticalSign, `${entryId}.tacticalSign`));
    const vehicleSigns = Array.isArray(entry?.vehicleTacticalSigns) ? entry.vehicleTacticalSigns : [];
    for (let j = 0; j < vehicleSigns.length; j += 1) {
      errors.push(...validateSignObject(vehicleSigns[j], `${entryId}.vehicleTacticalSigns[${j}]`));
    }
  }
  return errors;
}

module.exports = {
  REQUIRED_SIGN_KEYS,
  validateStanPayload,
};
