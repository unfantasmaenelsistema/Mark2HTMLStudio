/**
 * Public CORS fallbacks used by "Importar URL".
 * A browser can only read another site when that site allows it (CORS). Pages and
 * images are always requested directly first; only when the site blocks the
 * browser are they requested through a public intermediary, in this order:
 *
 * - Pages:  Jina Reader (r.jina.ai, returns the page HTML) → allorigins.
 * - Images: wsrv.nl (open-source image cache/proxy).
 *
 * Public proxies come and go (allorigins answered HTTP 522 for most sites in
 * October 2026), so every attempt has a timeout and the next one is tried.
 */

export interface PageFetchResult {
  text: string;
  contentType: string;
  /** Who answered: the site itself or the name of the intermediary */
  via: string;
}

interface PageAttempt {
  name: string;
  timeoutMs: number;
  request: (url: string, plainText: boolean) => { url: string; init?: RequestInit };
  /** Real content type when the intermediary does not forward the site's one */
  contentType?: (plainText: boolean) => string;
}

const PAGE_ATTEMPTS: PageAttempt[] = [
  {
    name: 'acceso directo',
    timeoutMs: 15000,
    request: (url) => ({ url }),
  },
  {
    name: 'Jina Reader',
    timeoutMs: 45000,
    request: (url, plainText) => ({
      url: `https://r.jina.ai/${url}`,
      // HTML keeps headings, tables and <img> for our own cleaner; plain text
      // returns raw Markdown files untouched
      init: { headers: { 'X-Return-Format': plainText ? 'text' : 'html' } },
    }),
    // Jina always answers text/plain, even with HTML inside
    contentType: (plainText) => (plainText ? 'text/plain' : 'text/html'),
  },
  {
    name: 'allorigins',
    timeoutMs: 15000,
    request: (url) => ({ url: `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` }),
  },
];

function describeFailure(name: string, err: unknown, status?: number): string {
  if (status === 429) return `${name}: demasiadas peticiones seguidas (HTTP 429)`;
  if (status === 404 || status === 410) return `${name}: la página no existe (HTTP ${status})`;
  if (status === 422) return `${name}: no pudo abrir esa dirección (HTTP 422)`;
  if (status) return `${name}: HTTP ${status}`;
  if (err instanceof DOMException && err.name === 'AbortError') return `${name}: no respondió a tiempo`;
  return `${name}: bloqueado por el navegador (CORS) o sin conexión`;
}

async function fetchWithTimeout(url: string, timeoutMs: number, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Downloads a page as text: directly when the site allows it, otherwise through
 * the public intermediaries. Throws a readable Spanish error listing each attempt.
 */
export async function fetchPageText(
  url: string,
  options: { plainText?: boolean; onAttempt?: (name: string) => void } = {}
): Promise<PageFetchResult> {
  const failures: string[] = [];
  for (const attempt of PAGE_ATTEMPTS) {
    const { url: requestUrl, init } = attempt.request(url, !!options.plainText);
    options.onAttempt?.(attempt.name);
    try {
      const res = await fetchWithTimeout(requestUrl, attempt.timeoutMs, init);
      if (!res.ok) {
        failures.push(describeFailure(attempt.name, null, res.status));
        // The site itself says the page does not exist: no intermediary will find it
        if (attempt === PAGE_ATTEMPTS[0] && (res.status === 404 || res.status === 410)) break;
        continue;
      }
      const text = await res.text();
      if (!text.trim()) {
        failures.push(`${attempt.name}: respuesta vacía`);
        continue;
      }
      const contentType = attempt.contentType?.(!!options.plainText) || res.headers.get('content-type') || '';
      return { text, contentType, via: attempt.name };
    } catch (err) {
      failures.push(describeFailure(attempt.name, err));
    }
  }
  throw new Error(
    `No se pudo leer la página. Resultado de cada intento:\n• ${failures.join(
      '\n• '
    )}\nComprueba que la dirección es correcta y pública, o vuelve a intentarlo en un minuto.`
  );
}

/** Candidate URLs to download an image: the image itself, then the image proxy */
export function imageRequestUrls(url: string): string[] {
  if (!/^https?:/i.test(url)) return [url];
  return [url, `https://wsrv.nl/?url=${encodeURIComponent(url)}`];
}
