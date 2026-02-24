export function readError(err: unknown): string {
  if (typeof err === 'object' && err && 'message' in err) {
    return String((err as { message: string }).message);
  }
  return 'Fehler';
}
