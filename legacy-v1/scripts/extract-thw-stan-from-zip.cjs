const fs = require('node:fs');
const path = require('node:path');
const JSZip = require('jszip');
const { PDFParse } = require('pdf-parse');
const { validateStanPayload } = require('./thw-stan-sign-schema.cjs');

const ZIP_PATH = process.argv[2] || '/Users/johannes/Downloads/stan_gesamt_2025.zip';
const OUTPUT_PATH =
  process.argv[3] ||
  path.join(process.cwd(), 'src', 'main', 'services', 'stan', 'thw-stan-2025.generated.json');

const VEHICLE_TERMS = [
  'FüKomKW',
  'FüKW',
  'GKW I',
  'GKW II',
  'MTW',
  'MLW I',
  'MLW II',
  'MLW III',
  'MLW IV',
  'MLW V',
  'LKW Lbw',
  'LKW Lkr',
  'LKW-K',
  'MzKW',
  'WLF',
  'FmKW',
  'MastKW',
  'Pkw gl',
  'Pkw Kombi',
  'Pkw',
  'Bus',
  'Gabelstapler',
  'BRmG',
  'DUKW',
  'Häg',
];

const VEHICLE_LINE_RX = /(wagen|anh[aä]nger|lkw|pkw|bus|stapler|boot|br[mu]g|kw\b|wlf|dukw|haeg|h[aä]g)/i;

function normalize(value) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function extractTitle(fileName) {
  const base = fileName
    .replace(/^\d{2}-\d{2}[a-z]?\s*/i, '')
    .replace(/^StAN\s*/i, '')
    .replace(/-bf\.pdf$/i, '')
    .replace(/\.pdf$/i, '')
    .trim();
  return base;
}

function parseStrengthCandidates(text) {
  const candidates = [];
  const rxWithLeader = /(^|[^0-9])(-|\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{1,3})\s*\/\s*(\d{1,3})\b/g;
  let m = rxWithLeader.exec(text);
  while (m) {
    const f = m[2] === '-' ? 0 : Number(m[2]);
    const u = Number(m[3]);
    const man = Number(m[4]);
    const gesamt = Number(m[5]);
    if (
      Number.isFinite(f) &&
      Number.isFinite(u) &&
      Number.isFinite(man) &&
      Number.isFinite(gesamt)
    ) {
      candidates.push({
        fuehrung: f,
        unterfuehrung: u,
        mannschaft: man,
        gesamt,
        quality: 2,
      });
    }
    m = rxWithLeader.exec(text);
  }

  const rx = /\b(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{1,3})\b/g;
  m = rx.exec(text);
  while (m) {
    const f = Number(m[1]);
    const u = Number(m[2]);
    const man = Number(m[3]);
    if (Number.isFinite(f) && Number.isFinite(u) && Number.isFinite(man)) {
      candidates.push({
        fuehrung: f,
        unterfuehrung: u,
        mannschaft: man,
        gesamt: f + u + man,
        quality: 1,
      });
    }
    m = rx.exec(text);
  }
  return candidates;
}

function pickBestStrength(text) {
  const candidates = parseStrengthCandidates(text);
  if (candidates.length === 0) {
    return null;
  }
  const byTotal = [...candidates].sort((a, b) => {
    if (b.quality !== a.quality) {
      return b.quality - a.quality;
    }
    return b.gesamt - a.gesamt;
  });
  const best = byTotal[0];
  return {
    fuehrung: best.fuehrung,
    unterfuehrung: best.unterfuehrung,
    mannschaft: best.mannschaft,
    gesamt: best.gesamt,
  };
}

function cleanupLine(line) {
  return line
    .replace(/\s+/g, ' ')
    .replace(/^\*\s*/, '')
    .replace(/\*+$/, '')
    .trim();
}

function pickVehicleByTerms(lines) {
  const normalizedText = normalize(lines.join(' '));
  const found = [];
  for (const term of VEHICLE_TERMS) {
    if (normalizedText.includes(normalize(term))) {
      found.push(term);
    }
  }
  return found;
}

function extractVehicles(text) {
  const lines = text
    .split('\n')
    .map(cleanupLine)
    .filter((line) => line.length > 0)
    .filter((line) => !/^st[aä]rke\s*:/i.test(line))
    .filter((line) => !/^stan[-:]?/i.test(line))
    .filter((line) => !/^seite\s+\d+/i.test(line))
    .filter((line) => !/^bundesanstalt /i.test(line))
    .filter((line) => !/^3\s+gliederungsbild/i.test(line))
    .filter((line) => !/^4\s+funktions/i.test(line))
    .filter((line) => !/^die fahrzeuge /i.test(line))
    .filter((line) => !/^gelegt\./i.test(line))
    .filter((line) => !/^--\s*\d+\s+of\s+\d+\s*--$/i.test(line));

  const vehicleLines = lines.filter((line) => VEHICLE_LINE_RX.test(line));
  const strictVehicleLines = vehicleLines
    .filter((line) => /^[A-ZÄÖÜ(0-9]/.test(line))
    .filter((line) => !/^[a-zäöü]/.test(line))
    .filter((line) => line.length <= 120)
    .filter((line) => !/[.;]\s*$/.test(line));
  if (strictVehicleLines.length > 0) {
    return Array.from(new Set(strictVehicleLines));
  }
  const byTerms = pickVehicleByTerms(lines);
  if (byTerms.length > 0) {
    return Array.from(new Set(byTerms));
  }
  return [];
}

function normalizeVehicleSignUnit(value) {
  return value
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferVehicleSignUnit(vehicleName) {
  const n = normalize(vehicleName);
  if (n.includes('fernmeldekraftwagen')) return 'FmKW';
  if (n.includes('fuhrungs und kommunikationskraftwagen') || n.includes('fuehrungs und kommunikationskraftwagen')) return 'FüKomKW';
  if (n.includes('fuhrungskraftwagen') || n.includes('fuehrungskraftwagen')) return 'FüKW';
  if (n.includes('mastkraftwagen')) return 'MastKW';
  if (n.includes('mannschaftstransportwagen')) return 'MTW';
  if (n.includes('mannschaftslastwagen')) return 'MLW';
  if (n.includes('mehrzweckkraftwagen')) return 'MzKW';
  if (n.includes('geratekraftwagen') || n.includes('geraetekraftwagen')) return 'GKW';
  if (n.includes('lastkraftwagen')) return 'LKW';
  if (n.includes('personenkraftwagen')) return 'PKW';
  if (n.includes('dukw')) return 'DUKW';
  if (n.includes('wechselladerfahrzeug')) return 'WLF';
  if (n.includes('anhanger') || n.includes('anhänger')) return 'Anh';
  if (n.includes('stapler')) return 'Stapler';
  return normalizeVehicleSignUnit(vehicleName);
}

function inferUnitSignType(title) {
  const n = normalize(title);
  if (n.includes('ztr') || n.includes('zugtrupp')) return 'zugtrupp';
  if (n.startsWith('(tr ') || n.includes(' tr ') || n.startsWith('tr ')) return 'squad';
  if (n.includes('fgr') || n.includes('fachgruppe')) return 'group';
  if (n.includes('stab')) return 'platoon';
  return 'none';
}

function inferUnitSignUnit(title) {
  const n = normalize(title);
  const directMatch = title.match(/\(\s*(ZTr|Tr|FGr)\s+([A-Za-zÖÄÜöäü0-9-]+(?:\s*[A-Za-zÖÄÜöäü0-9-]+)?)\s*(?:\(([^)]+)\))?\s*\)/i);
  if (directMatch) {
    return directMatch[2].trim();
  }
  if (n.includes('log mw')) return 'Log-MW';
  if (n.includes('log v')) return 'Log-V';
  if (n.includes('log m')) return 'Log-M';
  if (n.includes('wp')) return 'WP';
  if (n.includes('brb')) return 'BrB';
  if (n.includes('seeba')) return 'SEEBA';
  if (n.includes('seewa')) return 'SEEWA';
  if (n.includes('seelift')) return 'SEElift';
  if (n.includes('sys br500')) return 'BR500';
  if (n.includes('stab')) return 'Stab';
  return title.replace(/[()]/g, '').trim();
}

function buildUnitTacticalSign(title) {
  const unit = inferUnitSignUnit(title);
  return {
    grundform: 'taktische-formation',
    fachaufgabe: '',
    organisation: 'THW',
    einheit: unit,
    verwaltungsstufe: '',
    symbol: '',
    text: title,
    name: title,
    organisationsname: 'THW',
    typ: inferUnitSignType(title),
  };
}

function buildVehicleTacticalSigns(vehicles) {
  return vehicles.map((name) => {
    const isTrailer = /anh[aä]nger/i.test(name);
    const unit = inferVehicleSignUnit(name);
    return {
      grundform: isTrailer ? 'anhaenger' : 'fahrzeug',
      fachaufgabe: '',
      organisation: 'THW',
      einheit: unit,
      verwaltungsstufe: '',
      symbol: '',
      text: name,
      name,
      organisationsname: 'THW',
      typ: 'none',
    };
  });
}

async function readPdfPages(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const info = await parser.getInfo();
    const total = Number(info.total) || 0;
    const pages = [];
    for (let page = 1; page <= total; page += 1) {
      const textResult = await parser.getText({ partial: [page] });
      pages.push((textResult.text || '').trim());
    }
    return pages;
  } catch {
    return [];
  } finally {
    await parser.destroy();
  }
}

function pickGliederungsbildPage(pages) {
  let best = '';
  let bestScore = -1;
  for (const pageText of pages) {
    const text = pageText || '';
    let score = 0;
    if (/gliederungsbild/i.test(text)) {
      score += 3;
    }
    if (/st[aä]rke\s*:/i.test(text)) {
      score += 4;
    }
    if (/3\s+gliederungsbild/i.test(text)) {
      score += 2;
    }
    if (/funktions-\s*und\s*helfer/i.test(text)) {
      score -= 2;
    }
    if (/^\s*inhalt\b/im.test(text)) {
      score -= 3;
    }
    if (/\.{5,}\s*\d+\s*$/m.test(text)) {
      score -= 3;
    }
    if (score > bestScore) {
      bestScore = score;
      best = text;
    }
  }
  return best || pages[0] || '';
}

function extractTitleFromGliederungsbild(pageText, fallbackTitle) {
  const lines = pageText
    .split('\n')
    .map(cleanupLine)
    .filter(Boolean);
  const marker = lines.findIndex((line) => /gliederungsbild/i.test(line));
  if (marker < 0) {
    return fallbackTitle;
  }
  const titleCandidates = lines
    .slice(marker + 1, marker + 8)
    .filter((line) => !/^stan\s*:/i.test(line))
    .filter((line) => !/^st[aä]rke\s*:/i.test(line))
    .filter((line) => !/^seite\s+\d+/i.test(line))
    .filter((line) => !/^bundesanstalt /i.test(line))
    .filter((line) => !/^--\s*\d+\s+of\s+\d+\s*--$/i.test(line));

  if (titleCandidates.length === 0) {
    return fallbackTitle;
  }
  const withFgr = titleCandidates.find((line) => /\bfgr\b/i.test(line));
  if (withFgr) {
    return withFgr;
  }
  const withAbbrev = titleCandidates.find((line) => /\([^)]+\)/.test(line));
  return withAbbrev || titleCandidates[0] || fallbackTitle;
}

async function main() {
  if (!fs.existsSync(ZIP_PATH)) {
    throw new Error(`ZIP nicht gefunden: ${ZIP_PATH}`);
  }
  const zipBuffer = fs.readFileSync(ZIP_PATH);
  const zip = await JSZip.loadAsync(zipBuffer);

  const entries = [];
  const files = Object.keys(zip.files)
    .filter((name) => /\.pdf$/i.test(name) && /stan/i.test(name))
    .sort((a, b) => a.localeCompare(b));

  for (const fileName of files) {
    const file = zip.files[fileName];
    if (!file || file.dir) {
      continue;
    }
    const pdfBuffer = await file.async('nodebuffer');
    const pages = await readPdfPages(pdfBuffer);
    const fallbackTitle = extractTitle(path.basename(fileName));
    const gliederungsbildPage = pickGliederungsbildPage(pages);
    const title = extractTitleFromGliederungsbild(gliederungsbildPage, fallbackTitle);
    const strength = pickBestStrength(gliederungsbildPage);
    const vehicles = extractVehicles(gliederungsbildPage);
    entries.push({
      id: normalize(title).replace(/\s+/g, '-'),
      title,
      sourceFile: path.basename(fileName),
      strength,
      vehicles,
      tacticalSign: buildUnitTacticalSign(title),
      vehicleTacticalSigns: buildVehicleTacticalSigns(vehicles),
      confidence: {
        strength: strength ? (gliederungsbildPage ? 0.95 : 0.3) : 0,
        vehicles: vehicles.length > 0 ? (gliederungsbildPage ? 0.9 : 0.3) : 0,
      },
    });
    console.log(`[STAN] ${path.basename(fileName)} -> ${title} | strength=${strength ? `${strength.fuehrung}/${strength.unterfuehrung}/${strength.mannschaft}` : '-'} | vehicles=${vehicles.length}`);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    sourceZip: ZIP_PATH,
    note: 'Automatisch aus PDF-Text extrahiert. Bitte fachlich prüfen.',
    entries,
  };
  const validationErrors = validateStanPayload(payload);
  if (validationErrors.length > 0) {
    throw new Error(
      `STAN-Validierung fehlgeschlagen (${validationErrors.length}): ${validationErrors.slice(0, 3).join(' | ')}`,
    );
  }
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`[STAN] Wrote ${entries.length} entries to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
