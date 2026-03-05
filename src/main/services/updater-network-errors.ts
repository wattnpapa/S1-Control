/**
 * Detects offline-like network error messages.
 */
export function isOfflineLikeError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('internet_disconnected') ||
    lower.includes('net::err_internet_disconnected') ||
    lower.includes('enotfound') ||
    lower.includes('eai_again') ||
    lower.includes('etimedout') ||
    lower.includes('econnrefused') ||
    lower.includes('ehostunreach') ||
    lower.includes('network')
  );
}
