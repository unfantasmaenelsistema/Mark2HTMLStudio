/**
 * PDF -> Clean Markdown Importer
 * Extracts the text layer of a PDF 100% in the browser (pdf.js, no uploads)
 * and rebuilds a clean Markdown document from its layout:
 * - Headings inferred from font size (and bold standalone lines)
 * - Paragraphs re-joined across wrapped lines and page breaks (with de-hyphenation)
 * - Bullet / numbered lists (with nesting by indentation)
 * - Monospace runs as inline code, monospace blocks as fenced code
 * - Bold / italic emphasis and link annotations
 * - Repeated headers, footers and page numbers removed
 * - Embedded raster images extracted at their original resolution and placed
 *   where they appear in the reading order (saved as `images/…` files)
 */

import { blobFingerprint, saveImages, slugForImages, uniqueImagePath } from './imageStore';

export interface PdfTextRun {
  text: string;
  bold: boolean;
  italic: boolean;
  mono: boolean;
  link?: string;
}

export interface PdfLine {
  page: number;
  /** Distance from the top of the page to the baseline (PDF points) */
  top: number;
  x: number;
  endX: number;
  fontSize: number;
  runs: PdfTextRun[];
  /** X position where each table-like cell starts (split by wide gaps) */
  cells: number[];
  pageHeight: number;
  pageWidth: number;
}

export interface PdfImage {
  page: number;
  /** Bounding box on the page, from the top-left corner (PDF points) */
  top: number;
  bottom: number;
  x: number;
  endX: number;
  pageWidth: number;
  pageHeight: number;
  /** Real size of the embedded bitmap */
  pixelWidth: number;
  pixelHeight: number;
  blob: Blob;
  /** Markdown image target, assigned once the image has been saved */
  src?: string;
}

export interface PdfLayout {
  numPages: number;
  title?: string;
  lines: PdfLine[];
  images?: PdfImage[];
}

export interface PdfImportResult {
  markdown: string;
  title: string;
  stats: {
    pages: number;
    headings: number;
    paragraphs: number;
    listItems: number;
    codeBlocks: number;
    tables: number;
    images: number;
    removedHeaderFooterLines: number;
  };
}

// The legacy build ships polyfills (e.g. Math.sumPrecise) needed by browsers that are not bleeding-edge
type PdfjsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');

let pdfjsPromise: Promise<PdfjsModule> | null = null;

/** Lazy-loads pdf.js (and its worker) only when a PDF is actually imported */
function loadPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([
      import('pdfjs-dist/legacy/build/pdf.mjs'),
      import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
    ]).then(([pdfjs, worker]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      return pdfjs;
    });
    pdfjsPromise.catch(() => {
      pdfjsPromise = null;
    });
  }
  return pdfjsPromise;
}

const MONO_FONT_RE =
  /mono|courier|consol|menlo|monaco|inconsolata|hack\b|code|lucida\s?console|andale|fixed|typewriter|\bcmtt|nimbusmon/i;
const SYMBOL_FONT_RE = /symbol|dingbat|wingding|webding/i;
const BOLD_FONT_RE = /bold|black|heavy|semibold|demibold|extrabold|ultrabold|[-,]bd\b|\bbd\b/i;
const ITALIC_FONT_RE = /italic|oblique|[-,]it\b|\bit\b/i;

function stripSubsetPrefix(name: string): string {
  return name.replace(/^[A-Z]{6}\+/, '');
}

/**
 * Puts the lines of a page in reading order. Single-column pages are sorted
 * top-to-bottom; two-column layouts read the left column, then the right one.
 */
function orderPageLines(pageLines: PdfLine[], pageWidth: number): PdfLine[] {
  const byPosition = (p: PdfLine, q: PdfLine) => {
    const dy = p.top - q.top;
    return Math.abs(dy) > Math.min(p.fontSize, q.fontSize) * 0.45 ? dy : p.x - q.x;
  };
  const mid = pageWidth / 2;
  const left = pageLines.filter((l) => l.endX < mid + pageWidth * 0.03 && l.x < mid);
  const right = pageLines.filter((l) => l.x > mid - pageWidth * 0.03 && l.endX > mid);
  const twoColumns =
    left.length >= 5 &&
    right.length >= 5 &&
    (left.length + right.length) / pageLines.length > 0.7 &&
    right.filter((r) => left.some((l) => Math.abs(l.top - r.top) < l.fontSize * 0.5)).length > right.length * 0.3;

  if (!twoColumns) return [...pageLines].sort(byPosition);

  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const columnTop = Math.min(...[...left, ...right].map((l) => l.top));
  const columnBottom = Math.max(...[...left, ...right].map((l) => l.top));
  const rank = (l: PdfLine) => {
    if (leftSet.has(l)) return 1;
    if (rightSet.has(l)) return 2;
    if (l.top < columnTop) return 0;
    if (l.top > columnBottom) return 3;
    return 1;
  };
  return [...pageLines].sort((p, q) => rank(p) - rank(q) || byPosition(p, q));
}

// ---------------------------------------------------------------------------
// Embedded images
// ---------------------------------------------------------------------------

type Matrix = [number, number, number, number, number, number];

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

/** Decoded image as pdf.js hands it to the main thread */
interface PdfjsImageData {
  width: number;
  height: number;
  bitmap?: ImageBitmap;
  data?: Uint8ClampedArray | Uint8Array;
  kind?: number;
}

/** Images smaller than this on the page (points) are bullets, icons or rules */
const MIN_IMAGE_SIDE_PT = 24;
const MIN_IMAGE_SIDE_PX = 16;
/** Very large bitmaps are scaled down so the exported bundle stays reasonable */
const MAX_IMAGE_SIDE_PX = 4000;

function canDrawImages(): boolean {
  return typeof document !== 'undefined' || typeof OffscreenCanvas !== 'undefined';
}

function createCanvas(width: number, height: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  return new OffscreenCanvas(width, height);
}

async function canvasToBlob(canvas: HTMLCanvasElement | OffscreenCanvas, type: string, quality?: number): Promise<Blob | null> {
  if ('convertToBlob' in canvas) return canvas.convertToBlob({ type, quality }).catch(() => null);
  // toDataURL is synchronous: canvas.toBlob() callbacks are throttled to ~1 s each
  // when the tab is in the background, which made long PDFs take minutes
  try {
    const dataUrl = canvas.toDataURL(type, quality);
    const binary = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: dataUrl.slice(5, dataUrl.indexOf(';')) || type });
  } catch {
    return null;
  }
}

/** Expands pdf.js raw pixel buffers (1-bit gray, RGB or RGBA) to RGBA */
function toRgba(img: PdfjsImageData): Uint8ClampedArray | null {
  const { width, height, data, kind } = img;
  if (!data) return null;
  const out = new Uint8ClampedArray(width * height * 4);
  if (kind === 3) {
    out.set(data.subarray(0, out.length));
  } else if (kind === 2) {
    for (let i = 0, j = 0; j < out.length; i += 3, j += 4) {
      out[j] = data[i];
      out[j + 1] = data[i + 1];
      out[j + 2] = data[i + 2];
      out[j + 3] = 255;
    }
  } else if (kind === 1) {
    const rowBytes = (width + 7) >> 3;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const bit = data[y * rowBytes + (x >> 3)] & (128 >> (x & 7));
        const v = bit ? 255 : 0;
        const j = (y * width + x) * 4;
        out[j] = out[j + 1] = out[j + 2] = v;
        out[j + 3] = 255;
      }
    }
  } else {
    return null;
  }
  return out;
}

/**
 * Encodes a decoded PDF image: PNG for diagrams, screenshots and transparency,
 * JPEG for photographs (many distinct colours) to keep files small.
 */
async function encodePdfImage(img: PdfjsImageData): Promise<Blob | null> {
  const { width, height } = img;
  if (!width || !height) return null;
  const source = createCanvas(width, height);
  const ctx = source.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!ctx) return null;
  if (img.bitmap) {
    ctx.drawImage(img.bitmap, 0, 0);
  } else {
    const rgba = toRgba(img);
    if (!rgba) return null;
    ctx.putImageData(new ImageData(rgba as Uint8ClampedArray<ArrayBuffer>, width, height), 0, 0);
  }

  // Transparency needs PNG
  const pixels = ctx.getImageData(0, 0, width, height).data;
  const step = Math.max(1, Math.floor((width * height) / 20000));
  let transparent = false;
  for (let p = 0; p < width * height && !transparent; p += step) {
    if (pixels[p * 4 + 3] < 250) transparent = true;
  }

  let target = source;
  const scale = Math.min(1, MAX_IMAGE_SIDE_PX / Math.max(width, height));
  if (scale < 1) {
    target = createCanvas(Math.round(width * scale), Math.round(height * scale));
    const tctx = target.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    tctx.imageSmoothingQuality = 'high';
    tctx.drawImage(source as CanvasImageSource, 0, 0, target.width, target.height);
  }
  const png = await canvasToBlob(target, 'image/png');
  if (transparent || !png || png.size < 120 * 1024) return png;
  // Photos and photo-like screenshots: JPEG is far lighter and looks the same.
  // Diagrams and text keep PNG unless JPEG saves most of the weight.
  const jpeg = await canvasToBlob(target, 'image/jpeg', 0.9);
  return jpeg && jpeg.size < png.size * 0.45 ? jpeg : png;
}

interface PdfjsPage {
  objs: { get(id: string, callback: (data: unknown) => void): unknown };
  commonObjs: { get(id: string, callback: (data: unknown) => void): unknown };
}

function resolvePdfObject(page: PdfjsPage, objId: string): Promise<PdfjsImageData | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 8000);
    try {
      const store = objId.startsWith('g_') ? page.commonObjs : page.objs;
      store.get(objId, (data) => {
        clearTimeout(timer);
        resolve((data as PdfjsImageData) || null);
      });
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}

/**
 * Walks a page's operator list tracking the transformation matrix, so every
 * painted image gets its real position on the page, then decodes its pixels.
 */
async function extractPageImages(
  pdfjs: PdfjsModule,
  page: PdfjsPage,
  operatorList: { fnArray: number[]; argsArray: unknown[] },
  viewport: { width: number; height: number; convertToViewportPoint(x: number, y: number): number[] },
  pageNum: number,
  sharedCache: Map<string, Promise<Blob | null>>
): Promise<PdfImage[]> {
  const OPS = pdfjs.OPS as Record<string, number>;
  const stack: Matrix[] = [];
  let ctm: Matrix = IDENTITY;
  let annotationDepth = 0;
  const found: { box: number[]; load: () => Promise<Blob | null>; w: number; h: number; key: string }[] = [];
  const pageCache = new Map<string, Promise<Blob | null>>();

  const place = (key: string, w: number, h: number, load: () => Promise<Blob | null>) => {
    const corners = [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ].map(([u, v]) => viewport.convertToViewportPoint(ctm[0] * u + ctm[2] * v + ctm[4], ctm[1] * u + ctm[3] * v + ctm[5]));
    const xs = corners.map((c) => c[0]);
    const ys = corners.map((c) => c[1]);
    const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    // Clip to the page; ignore images placed off-page
    box[0] = Math.max(0, box[0]);
    box[1] = Math.max(0, box[1]);
    box[2] = Math.min(viewport.width, box[2]);
    box[3] = Math.min(viewport.height, box[3]);
    if (box[2] - box[0] < MIN_IMAGE_SIDE_PT || box[3] - box[1] < MIN_IMAGE_SIDE_PT) return;
    if (w < MIN_IMAGE_SIDE_PX || h < MIN_IMAGE_SIDE_PX) return;
    // The same image painted twice on a page (e.g. tiling) is kept once
    if (found.some((f) => f.key === key)) return;
    found.push({ box, load, w, h, key });
  };

  const { fnArray, argsArray } = operatorList;
  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i];
    const args = argsArray[i] as unknown[] | null;
    if (fn === OPS.save || fn === OPS.beginGroup) {
      stack.push(ctm);
    } else if (fn === OPS.restore || fn === OPS.endGroup) {
      ctm = stack.pop() || IDENTITY;
    } else if (fn === OPS.transform && args) {
      ctm = multiply(ctm, args as Matrix);
    } else if (fn === OPS.paintFormXObjectBegin) {
      stack.push(ctm);
      const matrix = args?.[0] as Matrix | null;
      if (matrix && matrix.length === 6) ctm = multiply(ctm, matrix);
    } else if (fn === OPS.paintFormXObjectEnd) {
      ctm = stack.pop() || IDENTITY;
    } else if (fn === OPS.beginAnnotation) {
      annotationDepth++;
      stack.push(ctm);
    } else if (fn === OPS.endAnnotation) {
      annotationDepth = Math.max(0, annotationDepth - 1);
      ctm = stack.pop() || IDENTITY;
    } else if (annotationDepth === 0 && fn === OPS.paintImageXObject && args) {
      const objId = args[0] as string;
      const w = (args[1] as number) || 0;
      const h = (args[2] as number) || 0;
      const cache = objId.startsWith('g_') ? sharedCache : pageCache;
      place(objId, w, h, () => {
        if (!cache.has(objId)) {
          cache.set(objId, resolvePdfObject(page, objId).then((img) => (img ? encodePdfImage(img) : null)));
        }
        return cache.get(objId)!;
      });
    } else if (annotationDepth === 0 && fn === OPS.paintInlineImageXObject && args?.[0]) {
      const img = args[0] as PdfjsImageData;
      place(`inline-${i}`, img.width, img.height, () => encodePdfImage(img));
    }
  }

  const images: PdfImage[] = [];
  for (const f of found) {
    let blob: Blob | null = null;
    try {
      blob = await f.load();
    } catch {
      blob = null;
    }
    if (!blob) continue;
    images.push({
      page: pageNum,
      x: f.box[0],
      top: f.box[1],
      endX: f.box[2],
      bottom: f.box[3],
      pageWidth: viewport.width,
      pageHeight: viewport.height,
      pixelWidth: f.w,
      pixelHeight: f.h,
      blob,
    });
  }
  return images;
}

/**
 * Reads the PDF text layer into positioned lines with style information.
 * `pdfjsLib` can be injected (used by tests / Node); in the browser it is lazy-loaded.
 */
export async function extractPdfLayout(
  data: ArrayBuffer | Uint8Array,
  onProgress?: (page: number, total: number) => void,
  pdfjsLib?: PdfjsModule,
  options: { images?: boolean } = {}
): Promise<PdfLayout> {
  const wantImages = options.images !== false && canDrawImages();
  const pdfjs = pdfjsLib || (await loadPdfjs());
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const loadingTask = pdfjs.getDocument({
    data: bytes,
    fontExtraProperties: true,
  });
  const doc = await loadingTask.promise;

  try {
    let title: string | undefined;
    try {
      const meta = await doc.getMetadata();
      const info = meta.info as Record<string, unknown> | undefined;
      if (info && typeof info.Title === 'string') title = info.Title.trim();
    } catch {
      // Metadata is optional
    }

    const lines: PdfLine[] = [];
    const images: PdfImage[] = [];
    const sharedImageCache = new Map<string, Promise<Blob | null>>();

    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      onProgress?.(pageNum, doc.numPages);
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1 });
      const pageHeight = viewport.height;
      const pageWidth = viewport.width;
      const [offsetX, offsetY] = [viewport.viewBox[0], viewport.viewBox[1]];

      // Loading the operator list resolves font objects so we can read real font names
      // (and tells us where every image is painted)
      let operatorList: { fnArray: number[]; argsArray: unknown[] } | null = null;
      try {
        operatorList = await page.getOperatorList();
      } catch {
        // Fallback to generic font families only
      }

      if (wantImages && operatorList) {
        try {
          images.push(
            ...(await extractPageImages(pdfjs, page as unknown as PdfjsPage, operatorList, viewport, pageNum, sharedImageCache))
          );
        } catch (err) {
          console.warn(`No se pudieron extraer las imágenes de la página ${pageNum}:`, err);
        }
      }

      const textContent = await page.getTextContent();
      const styles = textContent.styles as Record<string, { fontFamily?: string }>;

      const fontCache = new Map<string, { bold: boolean; italic: boolean; mono: boolean }>();
      const fontInfo = (fontName: string) => {
        let info = fontCache.get(fontName);
        if (info) return info;
        let realName = '';
        let boldFlag = false;
        let italicFlag = false;
        try {
          const font = page.commonObjs.get(fontName) as
            | { name?: string; bold?: boolean; black?: boolean; italic?: boolean }
            | undefined;
          if (font) {
            realName = stripSubsetPrefix(font.name || '');
            boldFlag = !!(font.bold || font.black);
            italicFlag = !!font.italic;
          }
        } catch {
          // Font not resolved
        }
        const family = styles[fontName]?.fontFamily || '';
        const isSymbol = SYMBOL_FONT_RE.test(realName);
        info = {
          bold: boldFlag || BOLD_FONT_RE.test(realName),
          italic: italicFlag || ITALIC_FONT_RE.test(realName),
          mono: !isSymbol && (MONO_FONT_RE.test(realName) || (!realName && family === 'monospace')),
        };
        fontCache.set(fontName, info);
        return info;
      };

      // Link annotations (external URLs only)
      const linkRects: { rect: number[]; url: string }[] = [];
      try {
        const annotations = await page.getAnnotations();
        for (const annot of annotations as Array<{ subtype?: string; url?: string; rect?: number[] }>) {
          if (annot.subtype === 'Link' && annot.url && annot.rect && /^(https?:|mailto:)/i.test(annot.url)) {
            linkRects.push({ rect: annot.rect, url: annot.url });
          }
        }
      } catch {
        // Annotations are optional
      }

      /** Splits an item's text into pieces covered (or not) by link annotations */
      const splitByLinks = (
        str: string,
        x: number,
        y: number,
        width: number,
        size: number
      ): { text: string; link?: string }[] => {
        const cy = y + size * 0.3;
        const hits = linkRects
          .map(({ rect, url }) => ({
            x1: Math.min(rect[0], rect[2]),
            x2: Math.max(rect[0], rect[2]),
            y1: Math.min(rect[1], rect[3]),
            y2: Math.max(rect[1], rect[3]),
            url,
          }))
          .filter((r) => cy >= r.y1 - 1 && cy <= r.y2 + 1 && r.x2 > x + 1 && r.x1 < x + width - 1)
          .sort((p, q) => p.x1 - q.x1);
        if (!hits.length || width <= 0) return [{ text: str }];

        const charW = width / str.length;
        const snap = (idx: number) => {
          idx = Math.max(0, Math.min(str.length, idx));
          for (let d = 0; d <= 3; d++) {
            for (const cand of [idx - d, idx + d]) {
              if (cand <= 0 || cand >= str.length) return Math.max(0, Math.min(str.length, cand));
              if (/\s/.test(str[cand]) !== /\s/.test(str[cand - 1])) return cand;
            }
          }
          return idx;
        };

        const pieces: { text: string; link?: string }[] = [];
        let cursor = 0;
        for (const hit of hits) {
          const start = Math.max(cursor, snap(Math.round((hit.x1 - x) / charW)));
          const stop = snap(Math.round((hit.x2 - x) / charW));
          if (stop <= start) continue;
          if (start > cursor) pieces.push({ text: str.slice(cursor, start) });
          pieces.push({ text: str.slice(start, stop), link: hit.url });
          cursor = stop;
        }
        if (cursor < str.length) pieces.push({ text: str.slice(cursor) });
        return pieces.filter((p) => p.text);
      };

      const pageLines: PdfLine[] = [];
      let current: PdfLine | null = null;
      let currentBaseline = 0;
      let sizeChars = new Map<number, number>();
      let monoSizeChars = new Map<number, number>();

      const flush = () => {
        if (current && current.runs.some((r) => r.text.trim())) {
          // Dominant font size = the one carrying the most characters
          let best = -1;
          for (const [size, count] of sizeChars.size ? sizeChars : monoSizeChars) {
            if (count > best) {
              best = count;
              current.fontSize = size;
            }
          }
          pageLines.push(current);
        }
        current = null;
        sizeChars = new Map();
        monoSizeChars = new Map();
      };

      for (const rawItem of textContent.items) {
        if (!('str' in rawItem)) continue;
        const item = rawItem;
        const [a, b, c, d, e, f] = item.transform as number[];
        // Skip vertical / rotated text (watermarks, margin labels)
        if (Math.abs(b) > 0.01 || Math.abs(c) > 0.01) {
          if (item.hasEOL) flush();
          continue;
        }
        const fontSize = Math.abs(d) || Math.abs(a) || 10;
        const x = e - offsetX;
        const baseline = f - offsetY;

        // Whitespace-only items are synthetic spacers: the real gap is measured from positions
        if (!item.str.trim()) {
          if (item.hasEOL) flush();
          continue;
        }

        const style = fontInfo(item.fontName);

        if (current) {
          const line: PdfLine = current;
          const sameBaseline = Math.abs(baseline - currentBaseline) <= Math.max(line.fontSize, fontSize) * 0.45;
          const jumpedBack = x < line.endX - Math.max(line.fontSize, fontSize) * 1.5;
          if (!sameBaseline || jumpedBack) flush();
        }

        if (!current) {
          current = {
            page: pageNum,
            top: pageHeight - baseline,
            x,
            endX: x,
            fontSize,
            runs: [],
            cells: [x],
            pageHeight,
            pageWidth,
          };
          currentBaseline = baseline;
        }

        const line: PdfLine = current;
        const gap = x - line.endX;
        const lastRun = line.runs[line.runs.length - 1];
        if (lastRun && !/\s$/.test(lastRun.text) && !/^\s/.test(item.str)) {
          const em = Math.min(line.fontSize, fontSize);
          if (lastRun.mono && style.mono) {
            // Keep alignment inside code: approximate the gap in monospace characters
            if (gap > em * 0.15) lastRun.text += ' '.repeat(Math.max(1, Math.round(gap / (fontSize * 0.6))));
          } else if (gap > em * 0.9) {
            // Wide horizontal gaps usually separate table cells
            lastRun.text += '\t';
            line.cells.push(x);
          } else if (gap > em * 0.15) {
            lastRun.text += ' ';
          }
        }

        for (const piece of splitByLinks(item.str, e, f, item.width, fontSize)) {
          const prevRun = line.runs[line.runs.length - 1];
          if (
            prevRun &&
            prevRun.bold === style.bold &&
            prevRun.italic === style.italic &&
            prevRun.mono === style.mono &&
            prevRun.link === piece.link
          ) {
            prevRun.text += piece.text;
          } else {
            line.runs.push({ text: piece.text, ...style, link: piece.link });
          }
        }

        line.endX = Math.max(line.endX, x + item.width);
        const rounded = Math.round(fontSize * 10) / 10;
        // Inline code is often set smaller: it should not decide the line's size
        const sizeMap = style.mono ? monoSizeChars : sizeChars;
        if (item.str.trim()) sizeMap.set(rounded, (sizeMap.get(rounded) || 0) + item.str.trim().length);

        if (item.hasEOL) flush();
      }
      flush();
      lines.push(...orderPageLines(pageLines, pageWidth));
      page.cleanup();
    }

    return { numPages: doc.numPages, title, lines, images };
  } finally {
    await loadingTask.destroy();
  }
}

// ---------------------------------------------------------------------------
// Layout -> Markdown
// ---------------------------------------------------------------------------

const LIGATURES: Record<string, string> = {
  'ﬀ': 'ff',
  'ﬁ': 'fi',
  'ﬂ': 'fl',
  'ﬃ': 'ffi',
  'ﬄ': 'ffl',
  'ﬅ': 'st',
  'ﬆ': 'st',
};

function cleanText(text: string): string {
  return text
    .replace(/[ﬀ-ﬆ]/g, (ch) => LIGATURES[ch] || ch)
    .replace(/­/g, '') // soft hyphen
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F�]/g, '')
    .replace(/[  -   　]/g, ' ')
    .replace(/[​-‍⁠﻿]/g, '');
}

const BULLET_RE = /^\s*([•●▪■◦○‣∙·►▸▹➢➤✓✔❖◆◇□☐-]|[–—*])\s+/;
const BULLET_ALONE_RE = /^\s*([•●▪■◦○‣∙·►▸▹➢➤✓✔❖◆◇□☐])\s*/;
const NUMBERED_RE = /^\s*(\d{1,3})[.)]\s+/;
const LETTERED_RE = /^\s*([a-zA-Z]|[ivxIVX]{1,4})[)]\s+/;
const PAGE_NUMBER_RE =
  /^(?:(?:page|p[áa]gina|p[áa]g\.?|p\.)\s*)?[-–—]?\s*\d{1,4}\s*[-–—]?(?:\s*(?:of|de|\/)\s*\d{1,4})?$/i;

function lineText(line: PdfLine): string {
  return line.runs.map((r) => r.text).join('');
}

function roundSize(size: number): number {
  return Math.round(size * 2) / 2;
}

/** Escapes characters that would otherwise be read as Markdown syntax in plain prose */
function escapeInline(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\*/g, '\\*')
    .replace(/(^|[^A-Za-z0-9])_|_(?=[^A-Za-z0-9]|$)/g, (m) => m.replace('_', '\\_'))
    .replace(/`/g, '\\`')
    .replace(/<(?=[A-Za-z/!?])/g, '\\<')
    .replace(/\[(?=[^\]]*\]\()/g, '\\[');
}

function escapeLineStart(text: string): string {
  return text
    .replace(/^(\s*)(#{1,6}\s)/, '$1\\$2')
    .replace(/^(\s*)>/, '$1\\>')
    .replace(/^(\s*)([-+]\s)/, '$1\\$2')
    .replace(/^(\s*)(\d+)([.)]\s)/, '$1$2\\$3')
    .replace(/^(\s*)(={3,}|-{3,})\s*$/, '$1\\$2');
}

function wrapCode(text: string): string {
  const longest = Math.max(0, ...(text.match(/`+/g) || []).map((m) => m.length));
  const fence = '`'.repeat(longest + 1);
  const pad = text.startsWith('`') || text.endsWith('`') ? ' ' : '';
  return `${fence}${pad}${text}${pad}${fence}`;
}

/** Renders styled runs to inline Markdown (bold, italic, code, links) */
function renderRuns(runs: PdfTextRun[], options: { plain?: boolean } = {}): string {
  // Merge consecutive runs sharing style; whitespace-only runs join the previous run
  const merged: PdfTextRun[] = [];
  for (const run of runs) {
    const text = cleanText(run.text);
    if (!text) continue;
    const prev = merged[merged.length - 1];
    if (
      prev &&
      (!text.trim() ||
        (prev.bold === run.bold && prev.italic === run.italic && prev.mono === run.mono && prev.link === run.link))
    ) {
      prev.text += text;
    } else {
      merged.push({ ...run, text });
    }
  }

  const allBold = merged.every((r) => !r.text.trim() || r.bold);
  const allItalic = merged.every((r) => !r.text.trim() || r.italic);

  let out = '';
  for (const run of merged) {
    const match = run.text.match(/^(\s*)([\s\S]*?)(\s*)$/);
    const [, lead, core, trail] = match || ['', '', run.text, ''];
    if (!core) {
      out += run.text;
      continue;
    }
    if (options.plain) {
      out += lead + core + trail;
      continue;
    }
    let piece: string;
    if (run.mono) {
      piece = wrapCode(core);
    } else {
      piece = escapeInline(core);
      // Whole-line emphasis (e.g. a bold paragraph) is applied once by the caller
      if (run.bold && !allBold) piece = `**${piece}**`;
      if (run.italic && !allItalic) piece = `*${piece}*`;
    }
    if (run.link) {
      const label = piece.replace(/\]/g, '\\]');
      piece = core === run.link || core === run.link.replace(/\/$/, '') ? `<${run.link}>` : `[${label}](${run.link.replace(/\)/g, '%29').replace(/ /g, '%20')})`;
    }
    out += lead + piece + trail;
  }

  out = out.replace(/\*\*(\s*)\*\*/g, '$1').replace(/\s+/g, ' ');
  if (!options.plain && merged.some((r) => r.text.trim())) {
    const core = out.trim();
    const hasNonMono = merged.some((r) => r.text.trim() && !r.mono);
    if (hasNonMono && allBold && allItalic) return `***${core}***`;
    if (hasNonMono && allBold) return `**${core}**`;
    if (hasNonMono && allItalic) return `*${core}*`;
    return core;
  }
  return out.trim();
}

interface Block {
  type: 'heading' | 'paragraph' | 'list' | 'code' | 'table' | 'image';
  level?: number;
  ordered?: boolean;
  indent?: number;
  marker?: string;
  lines: PdfLine[];
  image?: PdfImage;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** Removes running headers/footers and lone page numbers in the page margins */
function removeHeadersAndFooters(lines: PdfLine[], numPages: number): { lines: PdfLine[]; removed: number } {
  const inMargin = (l: PdfLine) => l.top < l.pageHeight * 0.1 || l.top > l.pageHeight * 0.9;
  const keyOf = (l: PdfLine) =>
    lineText(l).toLowerCase().replace(/\d+/g, '#').replace(/\s+/g, ' ').trim();

  const pagesByKey = new Map<string, Set<number>>();
  for (const l of lines) {
    if (!inMargin(l)) continue;
    const key = keyOf(l);
    if (!key) continue;
    if (!pagesByKey.has(key)) pagesByKey.set(key, new Set());
    pagesByKey.get(key)!.add(l.page);
  }
  const minPages = Math.max(2, Math.ceil(numPages * 0.5));

  let removed = 0;
  const kept = lines.filter((l) => {
    if (!inMargin(l)) return true;
    const text = lineText(l).trim();
    const repeated = numPages >= 2 && (pagesByKey.get(keyOf(l))?.size || 0) >= minPages;
    if (repeated || PAGE_NUMBER_RE.test(text)) {
      removed++;
      return false;
    }
    return true;
  });
  return { lines: kept, removed };
}

function isCodeLine(line: PdfLine): boolean {
  const meaningful = line.runs.filter((r) => r.text.trim());
  return meaningful.length > 0 && meaningful.every((r) => r.mono);
}

function cellCount(line: PdfLine): number {
  return cleanText(lineText(line)).trim().split(/\t+/).length;
}

/** Two rows belong to the same table when their cells start at the same columns */
function cellsAligned(row: PdfLine, header: PdfLine): boolean {
  const tolerance = Math.max(row.fontSize, header.fontSize) * 1.5;
  const matches = row.cells.filter((x) => header.cells.some((hx) => Math.abs(hx - x) <= tolerance)).length;
  return matches >= Math.max(2, row.cells.length - 1);
}

function isBoldLine(line: PdfLine): boolean {
  const meaningful = line.runs.filter((r) => r.text.trim());
  return meaningful.length > 0 && meaningful.every((r) => r.bold);
}

/** Splits a leading list marker from a line (handles bullets rendered as a separate glyph run) */
function detectListMarker(line: PdfLine): { ordered: boolean; marker: string; stripped: PdfLine } | null {
  const text = cleanText(lineText(line));
  let match = text.match(BULLET_RE) || text.match(BULLET_ALONE_RE);
  let ordered = false;
  let marker = '-';
  if (!match) {
    match = text.match(NUMBERED_RE);
    if (match) {
      ordered = true;
      marker = `${match[1]}.`;
    }
  }
  if (!match) {
    const lettered = text.match(LETTERED_RE);
    if (lettered) {
      match = lettered;
      marker = `- ${lettered[1]})`;
    }
  }
  if (!match) return null;
  // A lone "-" or "*" glued to a word is not a bullet (e.g. "-v flag")
  if (!ordered && /^[–—*-]$/.test(match[1]) && text.trim().length < 3) return null;

  let toStrip = match[0].length;
  const runs: PdfTextRun[] = [];
  for (const run of line.runs) {
    const cleaned = cleanText(run.text);
    if (toStrip <= 0) {
      runs.push(run);
      continue;
    }
    if (cleaned.length <= toStrip) {
      toStrip -= cleaned.length;
      continue;
    }
    runs.push({ ...run, text: cleaned.slice(toStrip) });
    toStrip = 0;
  }
  if (!runs.some((r) => r.text.trim())) return null;
  return { ordered, marker, stripped: { ...line, runs } };
}

/** Joins wrapped lines, removing end-of-line hyphenation */
function joinParagraph(parts: string[]): string {
  let out = '';
  for (const part of parts) {
    const piece = part.trim();
    if (!piece) continue;
    if (!out) {
      out = piece;
    } else if (/[A-Za-zÀ-ÿ]-$/.test(out) && /^[a-zà-ÿ]/.test(piece)) {
      out = out.slice(0, -1) + piece;
    } else {
      out += ' ' + piece;
    }
  }
  return out;
}

export function buildMarkdownFromLayout(layout: PdfLayout, fileName = 'Documento PDF'): PdfImportResult {
  const { lines: contentLines, removed } = removeHeadersAndFooters(layout.lines, layout.numPages);

  const stats = {
    pages: layout.numPages,
    headings: 0,
    paragraphs: 0,
    listItems: 0,
    codeBlocks: 0,
    tables: 0,
    images: 0,
    removedHeaderFooterLines: removed,
  };

  // Body font size: the size carrying the most characters
  const sizeWeights = new Map<number, number>();
  for (const l of contentLines) {
    if (isCodeLine(l)) continue;
    const size = roundSize(l.fontSize);
    sizeWeights.set(size, (sizeWeights.get(size) || 0) + lineText(l).trim().length);
  }
  let bodySize = 10;
  let bestWeight = -1;
  for (const [size, weight] of sizeWeights) {
    if (weight > bestWeight) {
      bestWeight = weight;
      bodySize = size;
    }
  }

  // Heading levels from font sizes noticeably larger than body text
  const headingSizes = [...sizeWeights.keys()]
    .filter((s) => s >= bodySize * 1.12)
    .sort((a, b) => b - a);
  const headingLevelForSize = (size: number): number => {
    const idx = headingSizes.indexOf(roundSize(size));
    return idx === -1 ? 0 : Math.min(idx + 1, 4);
  };
  const boldHeadingLevel = headingSizes.length ? Math.min(headingSizes.length + 1, 4) : 2;

  // Typical baseline-to-baseline spacing of body text
  const leadings: number[] = [];
  for (let i = 1; i < contentLines.length; i++) {
    const prev = contentLines[i - 1];
    const cur = contentLines[i];
    if (prev.page !== cur.page) continue;
    const delta = cur.top - prev.top;
    if (delta > prev.fontSize * 0.9 && delta < prev.fontSize * 2.2) leadings.push(delta);
  }
  const typicalLeading = median(leadings) || bodySize * 1.25;

  const blocks: Block[] = [];
  let prevLine: PdfLine | null = null;

  const headingCandidate = (line: PdfLine, text: string): number => {
    if (isCodeLine(line)) return 0;
    const trimmed = text.trim();
    if (trimmed.length > 160 || trimmed.length < 2 || !/[A-Za-zÀ-ÿ0-9]/.test(trimmed)) return 0;
    const sizeLevel = headingLevelForSize(line.fontSize);
    if (sizeLevel) return sizeLevel;
    return 0;
  };

  for (let i = 0; i < contentLines.length; i++) {
    const line = contentLines[i];
    const next = contentLines[i + 1];
    const text = cleanText(lineText(line));
    if (!text.trim()) continue;

    const last = blocks[blocks.length - 1];
    const samePage = prevLine && prevLine.page === line.page;
    const delta = prevLine && samePage ? line.top - prevLine.top : Infinity;
    const lineSize = Math.max(line.fontSize, prevLine?.fontSize || 0);
    const closeToPrev = samePage
      ? delta > -lineSize * 0.5 && delta <= Math.max(typicalLeading * 1.3, lineSize * 1.45)
      : false;

    // 1. Tables: consecutive lines split by wide gaps into the same number of cells
    const cells = cellCount(line);
    if (cells >= 2 && !isCodeLine(line)) {
      const rowGap = typicalLeading * 2.6;
      const continuesTable =
        last &&
        last.type === 'table' &&
        samePage &&
        delta <= rowGap &&
        cells <= cellCount(last.lines[0]) &&
        cellsAligned(line, last.lines[0]);
      const startsTable =
        next &&
        next.page === line.page &&
        next.top - line.top <= rowGap &&
        cellCount(next) >= 2 &&
        cellCount(next) <= cells &&
        cellsAligned(next, line);
      if (continuesTable) {
        last.lines.push(line);
        prevLine = line;
        continue;
      }
      if (startsTable) {
        blocks.push({ type: 'table', lines: [line] });
        stats.tables++;
        prevLine = line;
        continue;
      }
    }

    // 2. Code blocks (monospace lines)
    if (isCodeLine(line)) {
      if (last && last.type === 'code' && prevLine && (samePage ? delta < typicalLeading * 3.5 : true)) {
        last.lines.push(line);
      } else {
        blocks.push({ type: 'code', lines: [line] });
        stats.codeBlocks++;
      }
      prevLine = line;
      continue;
    }

    // 3. Headings (by font size)
    const level = headingCandidate(line, text);
    if (level) {
      if (
        last &&
        last.type === 'heading' &&
        last.level === level &&
        closeToPrev &&
        roundSize(prevLine!.fontSize) === roundSize(line.fontSize)
      ) {
        last.lines.push(line); // wrapped heading
      } else {
        blocks.push({ type: 'heading', level, lines: [line] });
        stats.headings++;
      }
      prevLine = line;
      continue;
    }

    // 4. Bold standalone lines at body size act as minor headings
    const trimmed = text.trim();
    const nextIsSeparate =
      !next ||
      next.page !== line.page ||
      next.top - line.top > typicalLeading * 1.3 ||
      !isBoldLine(next);
    if (
      isBoldLine(line) &&
      roundSize(line.fontSize) >= bodySize &&
      trimmed.length <= 90 &&
      !/[.,;]$/.test(trimmed) &&
      !detectListMarker(line) &&
      (!closeToPrev || !last || last.type === 'heading' || last.type === 'code') &&
      nextIsSeparate
    ) {
      blocks.push({ type: 'heading', level: boldHeadingLevel, lines: [line] });
      stats.headings++;
      prevLine = line;
      continue;
    }

    // 5. List items
    const list = detectListMarker(line);
    if (list) {
      const listBlocks = [...blocks].reverse();
      const prevList = last && last.type === 'list' ? last : null;
      let indent = 0;
      if (prevList) {
        const sameGroup = listBlocks.filter((b, idx) => b.type === 'list' && listBlocks.slice(0, idx).every((x) => x.type === 'list'));
        const baseX = Math.min(...sameGroup.map((b) => b.lines[0].x));
        indent = Math.max(0, Math.min(3, Math.round((line.x - baseX) / (bodySize * 1.4))));
      }
      blocks.push({ type: 'list', ordered: list.ordered, marker: list.marker, indent, lines: [list.stripped] });
      stats.listItems++;
      prevLine = line;
      continue;
    }

    // 6. Continuation of a list item (wrapped text indented under the item)
    if (last && last.type === 'list' && closeToPrev && line.x > last.lines[0].x - bodySize * 0.5) {
      last.lines.push(line);
      prevLine = line;
      continue;
    }

    // 7. Paragraph text
    if (last && last.type === 'paragraph' && prevLine) {
      const prevText = lineText(prevLine).trim();
      const prevEndsSentence = /[.!?:;»"”)]$/.test(prevText);
      const indentedStart = line.x > prevLine.x + bodySize * 0.8 && prevEndsSentence;
      const prevShort = prevLine.endX < prevLine.pageWidth * 0.55 && prevEndsSentence && line.x <= prevLine.x + 1;
      const crossPageContinuation =
        !samePage && prevLine.page === line.page - 1 && !prevEndsSentence && /^[a-zà-ÿ(]/.test(trimmed);
      const sameSize = Math.abs(line.fontSize - prevLine.fontSize) < 1;
      // Indentation changes mark a new block (quote, list without glyph bullets...),
      // except the first-line indent of a paragraph that is being continued
      const shiftedRight = samePage && line.x > prevLine.x + bodySize * 0.8;
      const shiftedLeft = samePage && line.x < prevLine.x - bodySize * 0.8 && last.lines.length > 1;
      if (
        ((closeToPrev && !indentedStart && !prevShort && !shiftedRight && !shiftedLeft) || crossPageContinuation) &&
        sameSize
      ) {
        last.lines.push(line);
        prevLine = line;
        continue;
      }
    }

    blocks.push({ type: 'paragraph', lines: [line] });
    stats.paragraphs++;
    prevLine = line;
  }

  // Lists whose bullets are drawn as shapes (e.g. browsers' "Save as PDF") have no
  // bullet glyph: detect indented paragraphs made of several short items.
  const pageLeft = new Map<number, number>();
  {
    const counts = new Map<number, Map<number, number>>();
    for (const l of contentLines) {
      if (roundSize(l.fontSize) !== bodySize) continue;
      if (!counts.has(l.page)) counts.set(l.page, new Map());
      const m = counts.get(l.page)!;
      const key = Math.round(l.x);
      m.set(key, (m.get(key) || 0) + 1);
    }
    for (const [page, m] of counts) {
      let best = -1;
      for (const [x, count] of m) {
        if (count > best || (count === best && x < pageLeft.get(page)!)) {
          best = count;
          pageLeft.set(page, x);
        }
      }
    }
  }
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.type !== 'paragraph' || block.lines.length < 2) continue;
    const left = pageLeft.get(block.lines[0].page);
    if (left === undefined || block.lines.some((l) => l.x < left + bodySize * 1.2)) continue;
    const maxEnd = Math.max(...block.lines.map((l) => l.endX));
    const items: PdfLine[][] = [[]];
    block.lines.forEach((l, idx) => {
      items[items.length - 1].push(l);
      const endsShort = l.endX < maxEnd - bodySize * 4;
      if (endsShort && idx < block.lines.length - 1) items.push([]);
    });
    if (items.length < 2) continue;
    const listBlocks: Block[] = items.map((itemLines) => ({
      type: 'list',
      ordered: false,
      marker: '-',
      indent: 0,
      lines: itemLines,
    }));
    blocks.splice(i, 1, ...listBlocks);
    stats.paragraphs--;
    stats.listItems += listBlocks.length;
    i += listBlocks.length - 1;
  }

  // Images go right before the first block that starts below them in reading order
  // (same page and same column), or before the next page's content
  const placedImages = (layout.images || []).filter((img) => img.src);
  if (placedImages.length) {
    const textBlocks = blocks.slice();
    const slots = new Map<number, PdfImage[]>();
    for (const img of [...placedImages].sort((a, b) => a.page - b.page || a.top - b.top || a.x - b.x)) {
      let idx = textBlocks.findIndex((b) => {
        const first = b.lines[0];
        if (first.page !== img.page) return first.page > img.page;
        const sameColumn = first.x < img.endX && first.endX > img.x;
        return sameColumn && first.top >= img.bottom - first.fontSize * 0.3;
      });
      if (idx === -1) idx = textBlocks.length;
      if (!slots.has(idx)) slots.set(idx, []);
      slots.get(idx)!.push(img);
    }
    for (const idx of [...slots.keys()].sort((a, b) => b - a)) {
      const imageBlocks: Block[] = slots.get(idx)!.map((image) => ({ type: 'image', lines: [], image }));
      const at = idx >= textBlocks.length ? blocks.length : blocks.indexOf(textBlocks[idx]);
      blocks.splice(at, 0, ...imageBlocks);
    }
    stats.images = placedImages.length;
  }

  // Render blocks
  const out: string[] = [];
  let firstHeading = '';
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const prev = blocks[i - 1];
    const sameList =
      prev &&
      prev.type === 'list' &&
      block.type === 'list' &&
      (prev.indent !== block.indent || prev.ordered === block.ordered);
    const separator = sameList ? '\n' : '\n\n';

    let rendered = '';
    if (block.type === 'image') {
      rendered = `![Imagen](${block.image!.src})`;
    } else if (block.type === 'heading') {
      const text = joinParagraph(block.lines.map((l) => renderRuns(l.runs, { plain: true })));
      if (!firstHeading) firstHeading = text;
      rendered = `${'#'.repeat(block.level || 2)} ${text.replace(/\s*#+\s*$/, '')}`;
    } else if (block.type === 'code') {
      const minX = Math.min(...block.lines.map((l) => l.x));
      const charWidth = (median(block.lines.map((l) => l.fontSize)) || bodySize) * 0.6;
      const codeLines: string[] = [];
      block.lines.forEach((l, idx) => {
        if (idx > 0) {
          const prevL = block.lines[idx - 1];
          const gap = prevL.page === l.page ? l.top - prevL.top : 0;
          const blanks = Math.min(2, Math.max(0, Math.round(gap / (l.fontSize * 1.25)) - 1));
          for (let b = 0; b < blanks; b++) codeLines.push('');
        }
        const indent = ' '.repeat(Math.max(0, Math.round((l.x - minX) / charWidth)));
        codeLines.push(indent + cleanText(lineText(l)).replace(/\s+$/, ''));
      });
      const body = codeLines.join('\n');
      const fence = /```/.test(body) ? '~~~~' : '```';
      rendered = `${fence}\n${body}\n${fence}`;
    } else if (block.type === 'table') {
      const rows = block.lines.map((l) =>
        cleanText(lineText(l))
          .trim()
          .split(/\t+/)
          .map((cell) => escapeInline(cell.trim()).replace(/\|/g, '\\|'))
      );
      const cols = Math.max(...rows.map((r) => r.length));
      const fmt = (r: string[]) => `| ${[...r, ...Array(cols - r.length).fill('')].join(' | ')} |`;
      rendered = [fmt(rows[0]), `|${' --- |'.repeat(cols)}`, ...rows.slice(1).map(fmt)].join('\n');
    } else if (block.type === 'list') {
      const text = joinParagraph(block.lines.map((l) => renderRuns(l.runs)));
      const pad = '  '.repeat(block.indent || 0);
      rendered = `${pad}${block.marker} ${text}`;
    } else {
      const text = joinParagraph(block.lines.map((l) => renderRuns(l.runs)));
      rendered = escapeLineStart(text);
    }

    if (!rendered.trim()) continue;
    out.push((out.length ? separator : '') + rendered);
  }

  const markdown = out.join('').replace(/\n{3,}/g, '\n\n').trim() + '\n';

  const cleanFileName = fileName.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').trim() || 'Documento PDF';
  const metaTitle = layout.title && !/^(untitled|sin t[íi]tulo|microsoft word|document\d*)/i.test(layout.title) && !/\.(docx?|pdf|odt|tex)$/i.test(layout.title)
    ? layout.title
    : '';
  const title = metaTitle || firstHeading.replace(/[*_`]/g, '').slice(0, 80) || cleanFileName;

  return { markdown, title, stats };
}

/**
 * Full pipeline: PDF file -> clean Markdown.
 * Throws a user-friendly error for encrypted or image-only (scanned) PDFs.
 */
export async function importPdfAsMarkdown(
  file: File,
  onProgress?: (page: number, total: number) => void
): Promise<PdfImportResult> {
  const buffer = await file.arrayBuffer();
  let layout: PdfLayout;
  try {
    layout = await extractPdfLayout(buffer, onProgress);
  } catch (err: any) {
    if (err?.name === 'PasswordException') {
      throw new Error('El PDF está protegido con contraseña. Desbloquéalo antes de importarlo.');
    }
    if (err?.name === 'InvalidPDFException') {
      throw new Error('El archivo no es un PDF válido o está dañado.');
    }
    throw new Error(`No se pudo leer el PDF: ${err?.message || err}`);
  }

  layout.images = await saveExtractedImages(layout, file.name);

  const totalChars = layout.lines.reduce((acc, l) => acc + lineText(l).trim().length, 0);
  if (totalChars === 0 && !layout.images.length) {
    throw new Error(
      'El PDF no contiene capa de texto (parece escaneado o compuesto solo por imágenes). Necesitaría OCR para extraer el contenido.'
    );
  }

  return buildMarkdownFromLayout(layout, file.name);
}

/**
 * Drops decorative images (logos repeated in every page header/footer), stores the
 * rest in the local image store and assigns each one its `images/…` path.
 * The same bitmap used several times is saved once and shared.
 */
async function saveExtractedImages(layout: PdfLayout, fileName: string): Promise<PdfImage[]> {
  const images = layout.images || [];
  if (!images.length) return [];

  const keys = await Promise.all(images.map((img) => blobFingerprint(img.blob)));
  const pagesByKey = new Map<string, Set<number>>();
  keys.forEach((key, i) => {
    if (!pagesByKey.has(key)) pagesByKey.set(key, new Set());
    pagesByKey.get(key)!.add(images[i].page);
  });
  const repeatThreshold = Math.max(3, Math.ceil(layout.numPages * 0.5));

  const slug = slugForImages(fileName);
  const taken = new Set<string>();
  const pathByKey = new Map<string, string>();
  const perPage = new Map<number, number>();
  const toSave: { path: string; blob: Blob }[] = [];
  const kept: PdfImage[] = [];

  images.forEach((img, i) => {
    const key = keys[i];
    const pages = pagesByKey.get(key)!.size;
    const inMargin = img.bottom < img.pageHeight * 0.15 || img.top > img.pageHeight * 0.85;
    // Page backgrounds / templates (often one for odd and one for even pages)
    const fullPage = (img.endX - img.x) * (img.bottom - img.top) >= img.pageWidth * img.pageHeight * 0.8;
    if (pages >= repeatThreshold || (pages >= 3 && inMargin) || (pages >= 2 && fullPage)) return;

    let path = pathByKey.get(key);
    if (!path) {
      const n = (perPage.get(img.page) || 0) + 1;
      perPage.set(img.page, n);
      const ext = img.blob.type === 'image/jpeg' ? 'jpg' : 'png';
      path = uniqueImagePath(`${slug}-p${img.page}-${n}`, ext, taken);
      pathByKey.set(key, path);
      toSave.push({ path, blob: img.blob });
    }
    kept.push({ ...img, src: path });
  });

  await saveImages(toSave);
  return kept;
}
