/**
 * Handles Tactical Sign Alias.
 */
export interface TacticalSignAlias {
  key: string;
  aliases: string[];
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
