import { describe, expect, it } from 'vitest';
import { getTacticalFormationSvgDataUrl, getTacticalVehicleSvgDataUrl } from '../src/main/services/tactical-signs';
import type { OrganisationKey } from '../src/shared/types';

function decodeSvg(dataUrl: string): string {
  const payload = dataUrl.split(',')[1] ?? '';
  return Buffer.from(payload, 'base64').toString('utf8');
}

describe('tactical signs service', () => {
  const organisations: OrganisationKey[] = [
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
  ];

  it('renders formation sign and caches identical requests', () => {
    const first = getTacticalFormationSvgDataUrl('THW', null);
    const second = getTacticalFormationSvgDataUrl('THW', null);

    expect(first.startsWith('data:image/svg+xml;base64,')).toBe(true);
    expect(first).toBe(second);

    const svg = decodeSvg(first);
    expect(svg).toContain('THW');
    expect(svg).toContain('#003399');
    expect(svg).not.toContain('cy="48" rx="10" ry="10" fill="#000000"');
  });

  it('renders configured group markers when typ is set', () => {
    const dataUrl = getTacticalFormationSvgDataUrl('THW', {
      typ: 'group',
      organisationsname: 'THW',
      unit: 'Fk',
    });
    const svg = decodeSvg(dataUrl);

    expect(svg).toContain('Fk');
    expect(svg).toContain('cy="48"');
  });

  it('renders white medical organizations', () => {
    const drkSvg = decodeSvg(getTacticalFormationSvgDataUrl('DRK', null));
    const johSvg = decodeSvg(getTacticalFormationSvgDataUrl('JOHANNITER', null));

    expect(drkSvg).toContain('fill="#FFFFFF"');
    expect(johSvg).toContain('fill="#FFFFFF"');
  });

  it('renders vehicle sign with org text and varying colors', () => {
    const thwVehicle = decodeSvg(getTacticalVehicleSvgDataUrl('THW'));
    const polVehicle = decodeSvg(getTacticalVehicleSvgDataUrl('POLIZEI'));

    expect(thwVehicle).toContain('THW');
    expect(polVehicle).toContain('POL');
    expect(thwVehicle).not.toBe(polVehicle);
  });

  it('supports all configured organizations for formation and vehicle symbols', () => {
    for (const organisation of organisations) {
      const formation = decodeSvg(getTacticalFormationSvgDataUrl(organisation, null));
      const vehicle = decodeSvg(getTacticalVehicleSvgDataUrl(organisation));

      expect(formation).toContain('<svg');
      expect(vehicle).toContain('<svg');
      expect(formation).toContain('x="10" y="64" width="236" height="128"');
      expect(vehicle).toContain('L10,192 L246,192');
    }
  });

  it('renders squad and zugtrupp variants with denominator and stroke width', () => {
    const squad = decodeSvg(
      getTacticalFormationSvgDataUrl('THW', {
        typ: 'squad',
        denominator: '1/2',
        strokeWidth: 7,
      }),
    );
    const zugtrupp = decodeSvg(
      getTacticalFormationSvgDataUrl('THW', {
        typ: 'zugtrupp',
      }),
    );

    expect(squad).toContain('1/2');
    expect(squad).toContain('stroke-width="7"');
    expect(zugtrupp).toContain('cy="86"');
  });
});
