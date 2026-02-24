export function iconPath(kind: 'einheit' | 'fahrzeug', key: string | null): string {
  const fallback = kind === 'einheit' ? 'bergung' : 'mtw';
  const safeKey = key || fallback;
  return `piktogramme/${kind}/${safeKey}.svg`;
}
