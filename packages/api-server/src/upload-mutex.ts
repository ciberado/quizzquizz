/**
 * Async mutex for serialising concurrent bank uploads + in-process reloads.
 *
 * Uploads queue on a promise chain so they execute one-at-a-time:
 *   upload A → (write + reload) → upload B → (write + reload) → …
 *
 * The admin POST /api/question-banks/reload endpoint is intentionally NOT
 * subject to this mutex — it is a separate administrative operation.
 */

let chain: Promise<void> = Promise.resolve();

/**
 * Acquire the upload mutex by appending `fn` to the promise chain.
 * Returns the resolved value of `fn`.  Errors in `fn` propagate to
 * the caller but do NOT poison the chain for subsequent uploads.
 */
export function withUploadMutex<T>(fn: () => Promise<T>): Promise<T> {
  // Capture the current tail of the chain so `fn` runs after it.
  const ticket = chain.then(fn);
  // Extend the chain with a settled version so later callers always
  // queue correctly even if `fn` throws.
  chain = ticket.then(
    () => undefined,
    () => undefined,
  );
  return ticket;
}
