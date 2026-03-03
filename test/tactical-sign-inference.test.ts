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
    expect(result.confidence).toBeGreaterThan(0.2);
    expect(result.config.name).toBe('FK Oldenburg');
  });

  it('returns neutral fallback for low confidence matches', () => {
    const result = inferTacticalSignConfig('zzzz unbekannt 0815', 'THW');
    expect(result.config.unit).toBe('');
    expect(result.config.typ).toBe('none');
    expect(result.config.meta?.source).toBe('auto');
  });

  it('recognizes THW fachgruppen abbreviations with group typ', () => {
    const result = inferTacticalSignConfig('FGr BrB Oldenburg', 'THW');
    expect(result.config.unit).toBe('BrB');
    expect(result.config.typ).toBe('group');
    expect(result.config.meta?.source).toBe('auto');
    expect(result.config.meta?.matchedLabel).toContain('Brückenbau');
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it('recognizes THW trupp abbreviations with squad typ', () => {
    const result = inferTacticalSignConfig('ESS 1', 'THW');
    expect(result.config.unit).toBe('ESS');
    expect(result.config.typ).toBe('squad');
    expect(result.config.meta?.source).toBe('auto');
  });

  it('recognizes THW zugtrupp abbreviation with zugtrupp typ', () => {
    const result = inferTacticalSignConfig('Ztr OV Oldenburg', 'THW');
    expect(result.config.unit).toBe('Ztr');
    expect(result.config.typ).toBe('zugtrupp');
    expect(result.config.meta?.source).toBe('auto');
  });

  it('recognizes technical zug with fachgruppe code as platoon', () => {
    const result = inferTacticalSignConfig('TZ-R Oldenburg', 'THW');
    expect(result.config.unit).toBe('TZ-R');
    expect(result.config.typ).toBe('platoon');
    expect(result.config.meta?.source).toBe('auto');
  });

  it('recognizes fachzug FK and fachzug log as platoon', () => {
    const fk = inferTacticalSignConfig('FZ FK', 'THW');
    expect(fk.config.unit).toBe('FZ-FK');
    expect(fk.config.typ).toBe('platoon');

    const log = inferTacticalSignConfig('Fachzug Logistik', 'THW');
    expect(log.config.unit).toBe('FZ-Log');
    expect(log.config.typ).toBe('platoon');
  });

  it('lists catalog filtered by organisation and query', () => {
    const thwCatalog = listTacticalSignCatalog('THW');
    const fwCatalog = listTacticalSignCatalog('FEUERWEHR', 'löschzug');
    expect(thwCatalog.length).toBeGreaterThan(0);
    expect(fwCatalog.every((item) => item.label.toLowerCase().includes('löschzug'))).toBe(true);
  });

  it('parses and normalizes config with manual source', () => {
    const json = toTacticalSignConfigJson({
      unit: 'FK',
      typ: 'group',
      meta: { source: 'manual' },
    });
    const parsed = parseTacticalSignConfigJson(json);
    expect(parsed?.unit).toBe('FK');
    const normalized = ensureTacticalSignConfigSource(parsed ?? {}, 'manual', 'FK Oldenburg', 'THW');
    expect(normalized.meta?.source).toBe('manual');
    expect(normalized.name).toBe('FK Oldenburg');
  });

  it('returns null for malformed config json', () => {
    expect(parseTacticalSignConfigJson('{not-json')).toBeNull();
  });
});
