/**
 * Utilities for extracting images and bundling them into a ZIP archive
 * with relative paths (`./images/image_1.png`) or embedded Base64.
 */

import JSZip from 'jszip';
import { DocumentConfig, DocumentTab } from '../types';
import { buildStandaloneHtml, TabExportItem } from './htmlExporter';
import { parseMarkdown } from './markdownParser';
import { fetchRemoteImage, getStoredImage, loadImageStore, normalizeImagePath } from './imageStore';

export interface ExtractedImage {
  originalSrc: string;
  filename: string;
  extension: string;
  mimeType: string;
  blobPromise: () => Promise<Blob | null>;
}

/**
 * Determine file extension and MIME type from Data URL or regular URL
 */
function getImageMeta(src: string, index: number): { extension: string; mimeType: string; filename: string } {
  if (src.startsWith('data:image/')) {
    const match = src.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,/);
    let ext = match ? match[1] : 'png';
    if (ext === 'svg+xml') ext = 'svg';
    if (ext === 'jpeg') ext = 'jpg';
    const mime = match ? `image/${match[1]}` : 'image/png';
    return {
      extension: ext,
      mimeType: mime,
      filename: `imagen_${index + 1}.${ext}`,
    };
  }

  // URL
  try {
    const parsed = new URL(src, window.location.href);
    const pathname = parsed.pathname;
    const dotIdx = pathname.lastIndexOf('.');
    if (dotIdx !== -1) {
      const ext = pathname.substring(dotIdx + 1).toLowerCase().split('?')[0].split('#')[0];
      if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico'].includes(ext)) {
        const cleanExt = ext === 'jpeg' ? 'jpg' : ext;
        return {
          extension: cleanExt,
          mimeType: cleanExt === 'svg' ? 'image/svg+xml' : `image/${cleanExt}`,
          filename: `imagen_${index + 1}.${cleanExt}`,
        };
      }
    }
  } catch {
    // fallback
  }

  return {
    extension: 'png',
    mimeType: 'image/png',
    filename: `imagen_${index + 1}.png`,
  };
}

/**
 * Convert base64 Data URL to Blob
 */
function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const byteString = atob(parts[1]);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i++) {
      uint8Array[i] = byteString.charCodeAt(i);
    }
    return new Blob([uint8Array], { type: mime });
  } catch (err) {
    console.error('Error converting Data URL to Blob:', err);
    return null;
  }
}

/**
 * Fetch remote image URL as Blob (directly, or through the CORS proxy)
 */
async function fetchImageAsBlob(url: string): Promise<Blob | null> {
  const blob = await fetchRemoteImage(url);
  if (!blob) console.warn(`Could not fetch remote image "${url}" (CORS or network)`);
  return blob;
}

/**
 * Scans markdown text and collects all image URLs / data-uris
 */
export function scanImagesInMarkdown(markdown: string): string[] {
  const sources: string[] = [];
  const seen = new Set<string>();

  // 1. Markdown syntax ![alt](src)
  const mdImgRegex = /!\[.*?\]\((.+?)(?:\s+"(?:.*?)")?\)/g;
  let match: RegExpExecArray | null;
  while ((match = mdImgRegex.exec(markdown)) !== null) {
    const src = match[1].trim();
    if (src && !seen.has(src)) {
      seen.add(src);
      sources.push(src);
    }
  }

  // 2. HTML syntax <img src="..."
  const htmlImgRegex = /<img\s+[^>]*?src=["']([^"']+)["']/gi;
  while ((match = htmlImgRegex.exec(markdown)) !== null) {
    const src = match[1].trim();
    if (src && !seen.has(src)) {
      seen.add(src);
      sources.push(src);
    }
  }

  return sources;
}

/**
 * Bundle project into a ZIP file with:
 * - index.html (or documento.html) referencing ./images/imagen_X.png
 * - images/ directory containing all extracted image assets
 * - README.txt explaining how to open offline
 * - documento.md with rewritten relative paths
 */
export async function createZipBundleWithImages({
  baseFilename,
  tabs,
  activeTabId,
  config,
  onProgress,
}: {
  baseFilename: string;
  tabs: DocumentTab[];
  activeTabId: string;
  config: DocumentConfig;
  onProgress?: (message: string, percent: number) => void;
}): Promise<Blob> {
  const zip = new JSZip();
  const imagesFolder = zip.folder('images');

  onProgress?.('Analizando imágenes en el documento...', 10);
  await loadImageStore();

  // Collect all image sources from all tabs
  const allImageSrcs = new Set<string>();
  tabs.forEach((tab) => {
    scanImagesInMarkdown(tab.content).forEach((src) => allImageSrcs.add(src));
  });

  const uniqueSrcs = Array.from(allImageSrcs);
  const srcToLocalPathMap = new Map<string, string>();
  // Imported images (PDF / URL) already use their final `images/…` path
  const usedNames = new Set(
    uniqueSrcs.filter((src) => getStoredImage(src)).map((src) => normalizeImagePath(src).replace(/^images\//, ''))
  );
  let storedCount = 0;

  // Extract each image and save to ZIP folder
  let processed = 0;
  for (let i = 0; i < uniqueSrcs.length; i++) {
    const originalSrc = uniqueSrcs[i];

    onProgress?.(`Procesando imagen ${i + 1} de ${uniqueSrcs.length}...`, 10 + Math.round((i / Math.max(uniqueSrcs.length, 1)) * 50));

    const stored = getStoredImage(originalSrc);
    if (stored && imagesFolder) {
      const name = normalizeImagePath(originalSrc).replace(/^images\//, '');
      imagesFolder.file(name, stored);
      storedCount++;
      processed++;
      continue;
    }

    const meta = getImageMeta(originalSrc, i);
    let n = i + 1;
    while (usedNames.has(meta.filename)) meta.filename = `imagen_${++n}.${meta.extension}`;
    usedNames.add(meta.filename);
    const localRelPath = `images/${meta.filename}`;

    try {
      let blob: Blob | null = null;
      if (originalSrc.startsWith('data:image/')) {
        blob = dataUrlToBlob(originalSrc);
      } else {
        blob = await fetchImageAsBlob(originalSrc);
      }

      if (blob && imagesFolder) {
        imagesFolder.file(meta.filename, blob);
        srcToLocalPathMap.set(originalSrc, localRelPath);
      } else {
        // If image could not be fetched due to CORS, keep original URL
        console.warn(`Manteniendo URL externa para: ${originalSrc}`);
      }
    } catch (e) {
      console.warn(`Error al empacar imagen ${originalSrc}:`, e);
    }
    processed++;
  }

  onProgress?.('Actualizando rutas relativas en Markdown y HTML...', 65);

  // Function to replace image sources in a text string
  const replaceImageSources = (text: string): string => {
    let result = text;
    srcToLocalPathMap.forEach((localPath, originalSrc) => {
      // Replace in markdown syntax: (originalSrc) -> (./images/...)
      result = result.split(`(${originalSrc})`).join(`(./${localPath})`);
      // Markdown with a title: (originalSrc "Title")
      result = result.split(`(${originalSrc} "`).join(`(./${localPath} "`);
      // Replace with quotes: ("originalSrc") -> ("./images/...")
      result = result.split(`"${originalSrc}"`).join(`"./${localPath}"`);
      // Replace with single quotes: ('originalSrc') -> ('./images/...')
      result = result.split(`'${originalSrc}'`).join(`'./${localPath}'`);
    });
    return result;
  };

  // Build modified tabs with local paths
  const rewrittenTabs: DocumentTab[] = tabs.map((tab) => ({
    ...tab,
    content: replaceImageSources(tab.content),
  }));

  // Parse HTML with local paths
  const parsedTabsData: TabExportItem[] = rewrittenTabs.map((tab) => {
    const res = parseMarkdown(tab.content);
    return {
      id: tab.id,
      title: tab.title,
      html: res.html,
      toc: res.toc,
    };
  });

  const activeRewrittenParsed =
    parsedTabsData.find((t) => t.id === activeTabId) || parsedTabsData[0];

  const fullHtml = buildStandaloneHtml(
    activeRewrittenParsed?.html || '',
    config,
    activeRewrittenParsed?.toc || [],
    parsedTabsData
  );

  onProgress?.('Añadiendo archivos HTML y Markdown al paquete...', 80);

  // Add HTML and Markdown to ZIP
  zip.file(`${baseFilename}.html`, fullHtml);
  zip.file(`${baseFilename}.md`, rewrittenTabs.find((t) => t.id === activeTabId)?.content || '');

  // Add a helpful README
  const readmeContent = `# Paquete Completo: ${config.documentTitle || baseFilename}
Generado con Mark2HTML Studio (https://unfantasmaenelsistema.com)

## Contenido de esta carpeta:
- **${baseFilename}.html**: Documento web principal interactivo listo para abrir offline en cualquier navegador.
- **${baseFilename}.md**: Archivo Markdown con las rutas relativas vinculadas a la carpeta "images/".
- **images/**: Carpeta que contiene todas las imágenes (${srcToLocalPathMap.size + storedCount} archivo(s)) descargadas y organizadas localmente.

## Cómo usarlo:
1. Descomprime este archivo ZIP en tu ordenador.
2. Abre "${baseFilename}.html" directamente con Google Chrome, Firefox, Safari o Edge.
3. Todas las imágenes cargarán instantáneamente sin depender de conexión a Internet ni de enlaces externos.
`;
  zip.file('LEEME.txt', readmeContent);

  onProgress?.('Comprimiendo archivo ZIP...', 90);

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  onProgress?.('¡Paquete ZIP listo!', 100);
  return zipBlob;
}
