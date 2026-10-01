/**
 * Dependency-free UUID v4 generator.
 *
 * Used for `client_event_id`, the backend's idempotency key. It does not need
 * to be cryptographically strong — only unique per device — so `Math.random`
 * is enough and avoids adding a dependency. `crypto.randomUUID` is used when
 * the runtime provides it.
 */
export function generateUuid(): string {
  const cryptoObject = (
    globalThis as unknown as { crypto?: { randomUUID?: () => string } }
  ).crypto;

  if (typeof cryptoObject?.randomUUID === 'function') {
    return cryptoObject.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
