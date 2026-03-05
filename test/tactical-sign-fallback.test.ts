import { describe, expect, it } from 'vitest';
import { buildFallbackFormationSignDataUrl, buildFallbackVehicleSignDataUrl } from '../src/renderer/src/utils/tactical-sign-fallback';

function decodeDataUrl(dataUrl: string): string {
  const encoded = dataUrl.replace('data:image/svg+xml;base64,', '');
  return Buffer.from(encoded, 'base64').toString('utf8');
}

describe('tactical sign fallback generator', () => {
  it('builds formation fallback as svg data url', () => {
    const dataUrl = buildFallbackFormationSignDataUrl('THW');
    expect(dataUrl.startsWith('data:image/svg+xml;base64,')).toBe(true);
    const svg = decodeDataUrl(dataUrl);
    expect(svg).toContain('<svg');
    expect(svg).toContain('THW');
  });

  it('builds vehicle fallback as svg data url', () => {
    const dataUrl = buildFallbackVehicleSignDataUrl('FEUERWEHR');
    expect(dataUrl.startsWith('data:image/svg+xml;base64,')).toBe(true);
    const svg = decodeDataUrl(dataUrl);
    expect(svg).toContain('<svg');
    expect(svg).toContain('<circle');
  });
});
