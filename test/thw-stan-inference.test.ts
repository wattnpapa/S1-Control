import { describe, expect, it } from 'vitest';
import { inferThwStanPreset } from '../src/main/services/stan/thw-stan-inference';

describe('thw stan inference', () => {
  it('returns matching STAN preset for THW shorthand names', () => {
    const result = inferThwStanPreset('THW', 'ZTr FK Oldenburg');
    expect(result).not.toBeNull();
    expect(result?.title).toMatch(/ZTr/i);
    expect(result?.title).toMatch(/FK/i);
    expect(result?.confidence).toBeGreaterThan(0.45);
    expect(result?.strength).not.toBeNull();
    expect((result?.vehicles.length ?? 0)).toBeGreaterThan(0);
    expect(result?.tacticalSign?.organisation).toBe('THW');
    expect(result?.tacticalSign?.einheit).toBeTruthy();
    expect((result?.vehicleTacticalSigns?.length ?? 0)).toBeGreaterThan(0);
  });

  it('returns null for non-THW organisations', () => {
    const result = inferThwStanPreset('FEUERWEHR', 'ZTr FK');
    expect(result).toBeNull();
  });
});
