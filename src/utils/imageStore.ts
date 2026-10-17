/**
 * Local image store for imported documents.
 * Images extracted from PDFs or downloaded from web pages are kept in IndexedDB
 * (not in the Markdown text, so localStorage never overflows) and referenced from
 * the Markdown with short relative paths like `images/manual-p3-1.png`.
 * That path is exactly where the image lands inside the exported ZIP bundle, so
 * the exported HTML and Markdown work offline next to their `images/` folder.
 */

import { useSyncExternalStore } from 'react';
import { imageRequestUrls } from './corsProxies';

export const IMAGE_DIR = 'images/';

const DB_NAME = 'mark2html_images';
const DB_STORE = 'images';
const DB_VERSION = 1;

interface StoredImage {
  path: string;
  blob: Blob;
  createdAt: number;
}

interface CachedImage extends StoredImage {
  objectUrl: string;
}

const cache = new Map<string, CachedImage>();
const listeners = new Set<() => void>();
let version = 0;
let dbPromise: Promise<IDBDatabase | null> | null = null;
let loadPromise: Promise<void> | null = null;

function notify() {
  version++;
  listeners.forEach((fn) => fn());
}

function openDb(): Promise<IDBDatabase | null> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        if (typeof indexedDB === 'undefined') return resolve(null);
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains(DB_STORE)) {
            req.result.createObjectStore(DB_STORE, { keyPath: 'path' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch {
        // Private mode / storage disabled: images live in memory for this session only
        resolve(null);
      }
    });
  }
  return dbPromise;
}

function runTx(mode: IDBTransactionMode, work: (store: IDBObjectStore) => void): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve) => {
        if (!db) return resolve();
        try {
          const tx = db.transaction(DB_STORE, mode);
          work(tx.objectStore(DB_STORE));
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
          tx.onabort = () => resolve();
        } catch {
          resolve();
        }
      })
  );
}

function putInCache(entry: StoredImage) {
  const previous = cache.get(entry.path);
  if (previous) URL.revokeObjectURL(previous.objectUrl);
  cache.set(entry.path, { ...entry, objectUrl: URL.createObjectURL(entry.blob) });
}

/** Loads every stored image into memory (once). Safe to call many times. */
export function loadImageStore(): Promise<void> {
  if (!loadPromise) {
    loadPromise = openDb().then(
      (db) =>
        new Promise<void>((resolve) => {
          if (!db) return resolve();
          try {
            const req = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).getAll();
            req.onsuccess = () => {
              for (const entry of req.result as StoredImage[]) {
                if (entry?.path && entry.blob && !cache.has(entry.path)) putInCache(entry);
              }
              notify();
              resolve();
            };
            req.onerror = () => resolve();
          } catch {
            resolve();
          }
        })
    );
  }
  return loadPromise;
}

/** Normalizes `./images/x.png` and `images/x.png` to the store key */
export function normalizeImagePath(src: string): string {
  return src.trim().replace(/^\.\//, '');
}

export function isStoredImagePath(src: string): boolean {
  return cache.has(normalizeImagePath(src));
}

export function getStoredImage(src: string): Blob | null {
  return cache.get(normalizeImagePath(src))?.blob || null;
}

export function getStoredImageCount(): number {
  return cache.size;
}

export async function saveImages(entries: { path: string; blob: Blob }[]): Promise<void> {
  if (!entries.length) return;
  const now = Date.now();
  const records = entries.map((e) => ({ path: normalizeImagePath(e.path), blob: e.blob, createdAt: now }));
  records.forEach(putInCache);
  notify();
  await runTx('readwrite', (store) => records.forEach((r) => store.put(r)));
}

/** Returns a file path under `images/` that is not used yet, e.g. `images/manual-p3-1.png` */
export function uniqueImagePath(baseName: string, extension: string, taken?: Set<string>): string {
  const safeBase =
    baseName
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'imagen';
  let candidate = `${IMAGE_DIR}${safeBase}.${extension}`;
  let n = 2;
  while (cache.has(candidate) || taken?.has(candidate)) {
    candidate = `${IMAGE_DIR}${safeBase}-${n++}.${extension}`;
  }
  taken?.add(candidate);
  return candidate;
}

/** Short slug used to prefix the images of one imported document */
export function slugForImages(text: string): string {
  return (
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/\.[a-z0-9]{2,4}$/, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .split('-')
      .slice(0, 5)
      .join('-')
      .slice(0, 40) || 'documento'
  );
}

export function extensionForMime(mime: string): string {
  const sub = (mime.split('/')[1] || '').split(';')[0].trim().toLowerCase();
  if (sub === 'jpeg' || sub === 'pjpeg') return 'jpg';
  if (sub === 'svg+xml') return 'svg';
  if (sub === 'x-icon' || sub === 'vnd.microsoft.icon') return 'ico';
  return /^(png|jpg|gif|webp|avif|bmp|svg|ico)$/.test(sub) ? sub : 'png';
}

/** Detects the image type from its first bytes (servers often send a wrong Content-Type) */
export async function sniffImageMime(blob: Blob): Promise<string | null> {
  const head = new Uint8Array(await blob.slice(0, 64).arrayBuffer());
  const ascii = String.fromCharCode(...head);
  if (head[0] === 0x89 && ascii.slice(1, 4) === 'PNG') return 'image/png';
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg';
  if (ascii.startsWith('GIF8')) return 'image/gif';
  if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') return 'image/webp';
  if (ascii.slice(4, 12) === 'ftypavif' || ascii.slice(4, 12) === 'ftypavis') return 'image/avif';
  if (ascii.startsWith('BM')) return 'image/bmp';
  if (head[0] === 0 && head[1] === 0 && head[2] === 1 && head[3] === 0) return 'image/x-icon';
  if (/^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(ascii) || /<svg[\s>]/i.test(ascii)) {
    return 'image/svg+xml';
  }
  return null;
}

/** Content hash used to store identical images only once */
export async function blobFingerprint(blob: Blob): Promise<string> {
  try {
    const digest = await crypto.subtle.digest('SHA-1', await blob.arrayBuffer());
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // crypto.subtle needs a secure context
    return `${blob.type}:${blob.size}`;
  }
}

const STORED_SRC_RE =/(\ssrc=)(["'])((?:\.\/)?images\/[^"']+)\2/g;

/** Points `src="images/…"` attributes at in-memory object URLs (for the live preview) */
export function resolveStoredImagesInHtml(html: string): string {
  if (!cache.size || !html.includes('images/')) return html;
  return html.replace(STORED_SRC_RE, (match, attr, quote, src) => {
    const entry = cache.get(normalizeImagePath(src));
    return entry ? `${attr}${quote}${entry.objectUrl}${quote}` : match;
  });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Embeds stored images as Base64 so a single downloaded .html file is self-contained */
export async function inlineStoredImagesInHtml(html: string): Promise<string> {
  await loadImageStore();
  if (!cache.size || !html.includes('images/')) return html;
  const dataUrls = new Map<string, string>();
  for (const match of html.matchAll(STORED_SRC_RE)) {
    const key = normalizeImagePath(match[3]);
    const entry = cache.get(key);
    if (entry && !dataUrls.has(key)) dataUrls.set(key, await blobToDataUrl(entry.blob));
  }
  return html.replace(STORED_SRC_RE, (match, attr, quote, src) => {
    const dataUrl = dataUrls.get(normalizeImagePath(src));
    return dataUrl ? `${attr}${quote}${dataUrl}${quote}` : match;
  });
}

/** Paths of stored images referenced by some Markdown text */
export function storedImagesReferencedIn(texts: string[]): string[] {
  const found = new Set<string>();
  for (const text of texts) {
    if (!text.includes('images/')) continue;
    for (const path of cache.keys()) {
      if (text.includes(path)) found.add(path);
    }
  }
  return [...found];
}

/** Serializes referenced images for a workspace backup (.markstudio.json) */
export async function exportImagesAsDataUrls(texts: string[]): Promise<Record<string, string>> {
  await loadImageStore();
  const out: Record<string, string> = {};
  for (const path of storedImagesReferencedIn(texts)) {
    out[path] = await blobToDataUrl(cache.get(path)!.blob);
  }
  return out;
}

export async function importImagesFromDataUrls(images: unknown): Promise<number> {
  if (!images || typeof images !== 'object') return 0;
  const entries: { path: string; blob: Blob }[] = [];
  for (const [path, dataUrl] of Object.entries(images as Record<string, unknown>)) {
    if (typeof dataUrl !== 'string' || !/^data:image\//.test(dataUrl)) continue;
    if (!/^(\.\/)?images\/[^/\\]+$/.test(path)) continue;
    try {
      entries.push({ path, blob: await (await fetch(dataUrl)).blob() });
    } catch {
      // Skip corrupted entries
    }
  }
  await saveImages(entries);
  return entries.length;
}

/**
 * Deletes images that no tab references anymore. Only images older than `minAgeMs`
 * are removed, so a recent undo in the editor can still bring an image back.
 */
export async function pruneUnreferencedImages(texts: string[], minAgeMs = 24 * 60 * 60 * 1000): Promise<void> {
  await loadImageStore();
  const used = new Set(storedImagesReferencedIn(texts));
  const now = Date.now();
  const stale = [...cache.values()].filter((e) => !used.has(e.path) && now - e.createdAt > minAgeMs);
  if (!stale.length) return;
  stale.forEach((e) => {
    URL.revokeObjectURL(e.objectUrl);
    cache.delete(e.path);
  });
  notify();
  await runTx('readwrite', (store) => stale.forEach((e) => store.delete(e.path)));
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Re-renders the caller whenever images are added, loaded or removed */
export function useImageStoreVersion(): number {
  return useSyncExternalStore(subscribe, () => version);
}

const MAX_REMOTE_IMAGE_BYTES = 25 * 1024 * 1024;

async function fetchAsImage(url: string, signal?: AbortSignal): Promise<Blob | null> {
  const res = await fetch(url, { mode: 'cors', signal });
  if (!res.ok) return null;
  const blob = await res.blob();
  if (!blob.size || blob.size > MAX_REMOTE_IMAGE_BYTES) return null;
  // Trust the bytes over the Content-Type header (proxies often send text/plain)
  const sniffed = await sniffImageMime(blob);
  if (sniffed) return blob.type === sniffed ? blob : new Blob([blob], { type: sniffed });
  return null;
}

/**
 * Downloads a remote image: directly when the server allows CORS, otherwise through
 * the public image proxy (corsProxies.ts). Returns null if it is not an image.
 */
export async function fetchRemoteImage(url: string, timeoutMs = 20000): Promise<Blob | null> {
  if (url.startsWith('data:')) {
    try {
      return await fetchAsImage(url);
    } catch {
      return null;
    }
  }
  for (const candidate of imageRequestUrls(url)) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const blob = await fetchAsImage(candidate, controller.signal);
      if (blob) return blob;
    } catch {
      // CORS or network error: try the next candidate
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}
