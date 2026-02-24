export class AppError extends Error {
  public readonly code: string;

  public constructor(message: string, code = 'APP_ERROR') {
    super(message);
    this.code = code;
  }
}

export function toSafeError(error: unknown): { message: string; code?: string } {
  if (error instanceof AppError) {
    return { message: error.message, code: error.code };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: 'Unbekannter Fehler' };
}
