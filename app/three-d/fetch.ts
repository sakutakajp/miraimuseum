/** Bound stalled downloads; remove timeout and forwarded abort listener on every exit. */
export async function assetBytes(url: string, signal: AbortSignal, priority: RequestPriority = 'auto') {
  signal.throwIfAborted();
  const request = new AbortController();
  const cancel = () => request.abort(signal.reason);
  signal.addEventListener('abort', cancel, { once: true });
  const timeout = setTimeout(() => request.abort(new DOMException('Asset timeout', 'TimeoutError')), 30000);
  try {
    const response = await fetch(url, { signal: request.signal, priority });
    if (!response.ok) throw new Error(`Asset unavailable: ${url} (${response.status})`);
    const bytes = await response.arrayBuffer(); signal.throwIfAborted(); return bytes;
  } finally { clearTimeout(timeout); signal.removeEventListener('abort', cancel); }
}
