/**
 * Handles Tactical Sign Alias.
 */
export interface TacticalSignAlias {
  key: string;
  aliases: string[];
}

/**
 * Handles THW Shortcode Rule.
 */
export interface ThwShortcodeRule {
  unit: string;
  label: string;
  typ: 'group' | 'squad' | 'zugtrupp' | 'platoon';
  patterns: string[];
}

/**
 * Handles Tactical Sign Aliases.
 */
export const TACTICAL_SIGN_ALIASES: TacticalSignAlias[] = [
  { key: 'thw-fk-fernmeldetrupp', aliases: ['fk', 'fgr fk', 'fernmeldetrupp', 'fuekom', 'fuekomkw'] },
  { key: 'thw-fk-zugtrupp', aliases: ['zugtrupp fk', 'zt fk', 'zugtrupp'] },
  { key: 'thw-bergungsgruppe-1', aliases: ['bergung 1', 'ber 1', 'b1'] },
  { key: 'thw-bergungsgruppe-2', aliases: ['bergung 2', 'ber 2', 'b2'] },
  { key: 'rettd', aliases: ['rettd', 'rettungsdienst', 'rd'] },
  { key: 'sanitaetsgruppe', aliases: ['san gruppe', 'sangruppe', 'sangr'] },
  { key: 'betreuung', aliases: ['betreuung', 'btgr', 'betreuungsgruppe'] },
  { key: 'verpflegung', aliases: ['verpflegung', 'vpfl', 'verpflegungsgruppe'] },
  { key: 'technischer-zug', aliases: ['tz', 'technischer zug'] },
  { key: 'fuehrungsgruppe', aliases: ['fuehrungsgruppe', 'fue grp', 'fuegr'] },
  { key: 'elw', aliases: ['elw', 'einsatzleitwagen'] },
];

/**
 * Handles THW Shortcode Rules.
 */
export const THW_SHORTCODE_RULES: ThwShortcodeRule[] = [
  { unit: 'Ztr', label: 'Zugtrupp', typ: 'zugtrupp', patterns: ['ztr', 'zugtrupp', 'zug trupp'] },
  { unit: 'BrB', label: 'Brückenbau', typ: 'group', patterns: ['brb', 'bruckenbau', 'brueckenbau', 'brucken bau'] },
  { unit: 'BT', label: 'Bergungstauchen', typ: 'group', patterns: ['bt', 'bergungstauchen', 'bergung tauchen'] },
  { unit: 'E', label: 'Elektroversorgung', typ: 'group', patterns: ['fg e', 'fgr e', 'elektroversorgung', 'elektro versorgung'] },
  { unit: 'I', label: 'Infrastruktur', typ: 'group', patterns: ['fg i', 'fgr i', 'infrastruktur'] },
  {
    unit: 'N',
    label: 'Notversorgung und Notinstandsetzung',
    typ: 'group',
    patterns: ['fg n', 'fgr n', 'notversorgung', 'notinstandsetzung', 'not versorgung'],
  },
  { unit: 'Öl', label: 'Ölschaden', typ: 'group', patterns: ['ol', 'oel', 'olschaden', 'oelschaden'] },
  { unit: 'O', label: 'Ortung', typ: 'group', patterns: ['fg o', 'fgr o', 'ortung'] },
  { unit: 'R', label: 'Räumen', typ: 'group', patterns: ['fg r', 'fgr r', 'raumen', 'raeumen'] },
  { unit: 'SB', label: 'Schwere Bergung', typ: 'group', patterns: ['sb', 'schwere bergung'] },
  { unit: 'SP', label: 'Sprengen', typ: 'group', patterns: ['sp', 'sprengen'] },
  { unit: 'TW', label: 'Trinkwasserversorgung', typ: 'group', patterns: ['tw', 'trinkwasser', 'trinkwasserversorgung'] },
  { unit: 'W', label: 'Wassergefahren', typ: 'group', patterns: ['fg w', ' w ', 'wassergefahren'] },
  { unit: 'WP', label: 'Wasserschaden/Pumpen', typ: 'group', patterns: ['wp', 'wasserschaden', 'pumpen'] },
  { unit: 'F', label: 'Führungsunterstützung', typ: 'group', patterns: ['fg f', 'fgr f', 'fuhrungsunterstutzung', 'fuehrungsunterstuetzung'] },
  { unit: 'K', label: 'Kommunikation', typ: 'group', patterns: ['fg k', 'fgr k', 'kommunikation'] },
  { unit: 'Log-MW', label: 'Logistik-Materialwirtschaft', typ: 'group', patterns: ['log mw', 'log-mw', 'logmw', 'materialwirtschaft'] },
  { unit: 'Log-V', label: 'Logistik-Verpflegung', typ: 'group', patterns: ['log v', 'log-v', 'logv', 'verpflegung'] },
  { unit: 'Log-M', label: 'Logistik-Materialerhaltung', typ: 'group', patterns: ['log m', 'log-m', 'logm', 'materialerhaltung'] },
  {
    unit: 'Log-VG',
    label: 'Logistik-Verbrauchsgüter',
    typ: 'group',
    patterns: ['log vg', 'log-vg', 'logvg', 'verbrauchsguter', 'verbrauchsgueter'],
  },
  {
    unit: 'ESS',
    label: 'Trupp Einsatzstellensicherung',
    typ: 'squad',
    patterns: ['ess', 'einsatzstellensicherung', 'einsatzstellen sicherung'],
  },
  { unit: 'UL', label: 'Trupp Unbemannte Luftfahrtsysteme', typ: 'squad', patterns: ['ul', 'unbemannte luftfahrtsysteme', 'uas'] },
  { unit: 'TS', label: 'Trupp Transport Schwer', typ: 'squad', patterns: ['ts', 'transport schwer'] },
];
