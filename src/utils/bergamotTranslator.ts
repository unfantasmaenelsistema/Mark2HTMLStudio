/**
 * Bergamot (Firefox Translations engine) running in the page via WebAssembly.
 * Works in Firefox, Chrome, Edge and Safari. The EN -> ES model (~21 MB) is
 * downloaded once from Mozilla's Bergamot model storage and kept in the
 * browser's Cache Storage; the text being translated never leaves the device.
 */

const MODEL_CACHE = 'mark2html-bergamot-models-v1';

export type BergamotStatus = (message: string) => void;

interface BergamotBatchTranslator {
  translate(request: { from: string; to: string; text: string; html: boolean }): Promise<{ target: { text: string } }>;
  delete(): Promise<void>;
}

let translatorPromise: Promise<BergamotBatchTranslator> | null = null;
let statusListener: BergamotStatus | undefined;

export function isBergamotSupported(): boolean {
  return (
    typeof WebAssembly === 'object' &&
    typeof (WebAssembly as { instantiateStreaming?: unknown }).instantiateStreaming === 'function' &&
    typeof Worker !== 'undefined' &&
    typeof fetch === 'function'
  );
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

async function sha256Matches(buffer: ArrayBuffer, expectedHex?: string): Promise<boolean> {
  if (!expectedHex || !crypto?.subtle) return true;
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', buffer));
  const expected = hexToBytes(expectedHex);
  return digest.length === expected.length && digest.every((b, i) => b === expected[i]);
}

async function createTranslator(): Promise<BergamotBatchTranslator> {
  const { BatchTranslator, TranslatorBacking } = await import('@browsermt/bergamot-translator/translator.js');

  /** Model downloads with progress reporting, integrity check and persistent cache */
  class CachedBacking extends TranslatorBacking {
    private sizes = new Map<string, number>();
    private loaded = new Map<string, number>();

    private report() {
      const total = [...this.sizes.values()].reduce((a, b) => a + b, 0);
      const done = [...this.loaded.values()].reduce((a, b) => a + b, 0);
      if (!total) return;
      const mb = (n: number) => (n / 1048576).toFixed(1);
      statusListener?.(
        `Descargando modelo de traducción EN→ES (solo la primera vez): ${mb(done)} / ${mb(total)} MB`
      );
    }

    /** Network first, cached copy when offline (the base class reads it on construction) */
    async loadModelRegistery() {
      const url = 'https://bergamot.s3.amazonaws.com/models/index.json';
      let registry: Record<string, unknown>;
      try {
        const response = await fetch(url, { credentials: 'omit' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();
        registry = JSON.parse(text);
        try {
          await (await caches.open(MODEL_CACHE)).put(url, new Response(text));
        } catch {
          // Cache Storage unavailable
        }
      } catch (err) {
        const cached = typeof caches !== 'undefined' ? await (await caches.open(MODEL_CACHE)).match(url) : undefined;
        if (!cached) throw err;
        registry = await cached.json();
      }
      return Object.entries(registry).map(([key, files]) => ({ from: key.slice(0, 2), to: key.slice(2, 4), files }));
    }

    async fetch(url: string, checksum?: string): Promise<ArrayBuffer> {
      let cache: Cache | null = null;
      try {
        cache = typeof caches !== 'undefined' ? await caches.open(MODEL_CACHE) : null;
        const cached = await cache?.match(url);
        if (cached) {
          const buffer = await cached.arrayBuffer();
          if (await sha256Matches(buffer, checksum)) return buffer;
          await cache?.delete(url);
        }
      } catch {
        cache = null; // Cache Storage unavailable (private mode...): download every time
      }

      if (!this.sizes.size) {
        const registry = (await this.registry) as { files: Record<string, { name?: string; size?: number }> }[];
        for (const entry of registry) {
          for (const file of Object.values(entry.files)) {
            if (file?.name && file.size) this.sizes.set(file.name, file.size);
          }
        }
        // Only count the files of the model being downloaded
        for (const name of [...this.sizes.keys()]) if (!name.includes('/enes/')) this.sizes.delete(name);
      }

      const response = await fetch(url, { credentials: 'omit' });
      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status} al descargar ${url}`);

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        this.loaded.set(url, received);
        this.report();
      }
      const bytes = new Uint8Array(received);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      const buffer = bytes.buffer;

      if (!(await sha256Matches(buffer, checksum))) {
        throw new Error(`El archivo descargado no supera la verificación de integridad: ${url}`);
      }
      try {
        await cache?.put(url, new Response(buffer.slice(0)));
      } catch {
        // Quota exceeded: keep working without persisting
      }
      return buffer;
    }
  }

  const options = { workers: 1, batchSize: 8, downloadTimeout: 0, pivotLanguage: null };
  return new BatchTranslator(options, new CachedBacking(options)) as BergamotBatchTranslator;
}

function getTranslator(): Promise<BergamotBatchTranslator> {
  if (!translatorPromise) {
    translatorPromise = createTranslator();
    translatorPromise.catch(() => {
      translatorPromise = null;
    });
  }
  return translatorPromise;
}

/**
 * Translates an HTML fragment EN -> ES. The first call loads the WASM engine
 * and the language model; later calls reuse them.
 */
export async function bergamotTranslateHtml(html: string, onStatus?: BergamotStatus): Promise<string> {
  statusListener = onStatus;
  const translator = await getTranslator();
  const response = await translator.translate({ from: 'en', to: 'es', text: html, html: true });
  return response.target.text;
}

/** Loads the engine and model ahead of time (reports download progress) */
export async function prepareBergamot(onStatus?: BergamotStatus): Promise<void> {
  await bergamotTranslateHtml('Hello', onStatus);
}
