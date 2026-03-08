import { describe, expect, it } from 'vitest';
import {
  ensureTacticalSignConfigSource,
  inferTacticalSignConfig,
  listTacticalSignCatalog,
  parseTacticalSignConfigJson,
  toTacticalSignConfigJson,
} from '../src/main/services/tactical-sign-inference';

describe('tactical-sign inference', () => {
  it('matches known terms with confidence and metadata', () => {
    const result = inferTacticalSignConfig('FK Oldenburg', 'THW');
    expect(result.config.meta?.source).toBe('auto');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.config.name).toBe('FK Oldenburg');
  });

  it('returns neutral fallback for low confidence matches', () => {
    const result = inferTacticalSignConfig('zzzz unbekannt 0815', 'THW');
    expect(result.config.einheit).toBe('');
    expect(result.config.typ).toBe('none');
    expect(result.config.meta?.source).toBe('auto');
  });

  it('recognizes THW fachgruppen abbreviations with gruppe typ', () => {
    const result = inferTacticalSignConfig('FGr BrB Oldenburg', 'THW');
    expect(result.config.einheit).toBe('BrB');
    expect(result.config.typ).toBe('gruppe');
    expect(result.config.meta?.source).toBe('auto');
    expect(result.config.meta?.matchedLabel).toContain('Brückenbau');
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it('recognizes THW trupp abbreviations with trupp typ', () => {
    const result = inferTacticalSignConfig('ESS 1', 'THW');
    expect(result.config.einheit).toBe('ESS');
    expect(result.config.typ).toBe('trupp');
    expect(result.config.meta?.source).toBe('auto');
  });

  it('recognizes THW zugtrupp abbreviation with zugtrupp typ', () => {
    const result = inferTacticalSignConfig('Ztr OV Oldenburg', 'THW');
    expect(result.config.einheit).toBe('Ztr');
    expect(result.config.typ).toBe('zugtrupp');
    expect(result.config.meta?.source).toBe('auto');
  });

  it('recognizes technical zug with fachgruppe code as zug', () => {
    const result = inferTacticalSignConfig('TZ-R Oldenburg', 'THW');
    expect(result.config.einheit).toBe('TZ-R');
    expect(result.config.typ).toBe('zug');
    expect(result.config.meta?.source).toBe('auto');
  });

  it('recognizes fachzug FK and fachzug log as zug', () => {
    const fk = inferTacticalSignConfig('FZ FK', 'THW');
    expect(fk.config.einheit).toBe('FZ-FK');
    expect(fk.config.typ).toBe('zug');

    const log = inferTacticalSignConfig('Fachzug Logistik', 'THW');
    expect(log.config.einheit).toBe('FZ-Log');
    expect(log.config.typ).toBe('zug');
  });

  it('lists core enum catalog and supports query filtering', () => {
    const thwCatalog = listTacticalSignCatalog('THW');
    const fwCatalog = listTacticalSignCatalog('FEUERWEHR', 'großverband');
    expect(thwCatalog.length).toBeGreaterThan(0);
    expect(fwCatalog.every((item) => item.label.toLowerCase().includes('großverband'))).toBe(true);
  });

  it('parses and normalizes config with manual source', () => {
    const json = toTacticalSignConfigJson({
      einheit: 'FK',
      typ: 'gruppe',
      meta: { source: 'manual' },
    });
    const parsed = parseTacticalSignConfigJson(json);
    expect(parsed?.einheit).toBe('FK');
    const normalized = ensureTacticalSignConfigSource(parsed ?? {}, 'manual', 'FK Oldenburg', 'THW');
    expect(normalized.meta?.source).toBe('manual');
    expect(normalized.name).toBe('FK Oldenburg');
  });

  it('returns null for malformed config json', () => {
    expect(parseTacticalSignConfigJson('{not-json')).toBeNull();
  });
});
