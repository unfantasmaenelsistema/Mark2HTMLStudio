/**
 * Utility to fetch and convert any web URL or raw text into clean Markdown.
 * Supports:
 * - Direct Markdown URLs (.md, raw.githubusercontent.com, pastebin, etc.)
 * - HTML web pages (stripping navigation, scripts, ads, headers and converting main article to clean Markdown)
 * - Public intermediaries (corsProxies.ts) when the site blocks the browser (CORS)
 * - Images (lazy-loaded, srcset, relative paths...) downloaded into the local
 *   image store and referenced as `images/…` so they travel with the export
 */

import { formatMarkdown } from './markdownFormatter';
import { fetchPageText } from './corsProxies';
import {
  blobFingerprint,
  extensionForMime,
  fetchRemoteImage,
  saveImages,
  slugForImages,
  uniqueImagePath,
} from './imageStore';

/** Tiny inline GIF/SVG placeholders used by lazy-loading scripts */
function isPlaceholderSrc(src: string): boolean {
  return (
    !src ||
    (src.startsWith('data:') && src.length < 400) ||
    /(^|[/_.-])(blank|spacer|placeholder|lazy[-_]?load(ing)?)([/_.-]|$)/i.test(src)
  );
}

/** Picks the largest candidate of a srcset attribute */
function largestFromSrcset(srcset: string | null): string {
  if (!srcset) return '';
  let best = '';
  let bestScore = -1;
  for (const part of srcset.split(/,\s+(?=\S)/)) {
    const [url, descriptor = '1x'] = part.trim().split(/\s+/);
    const value = parseFloat(descriptor);
    const score = Number.isNaN(value) ? 0 : value * (descriptor.endsWith('w') ? 1 : 1000);
    if (url && score > bestScore) {
      best = url;
      bestScore = score;
    }
  }
  return best;
}

/** Real image URL of an <img>, looking past lazy-loading placeholders */
function pickImageSrc(el: HTMLElement): string {
  const lazy =
    el.getAttribute('data-src') ||
    el.getAttribute('data-lazy-src') ||
    el.getAttribute('data-original') ||
    el.getAttribute('data-url') ||
    largestFromSrcset(el.getAttribute('data-srcset') || el.getAttribute('data-lazy-srcset'));
  const src = el.getAttribute('src') || '';
  if (lazy && isPlaceholderSrc(src)) return lazy;
  // Inside <picture>, the <source> candidates often carry the full-size version
  const parent = el.parentElement;
  const pictureSource =
    parent && parent.tagName.toLowerCase() === 'picture'
      ? largestFromSrcset(parent.querySelector('source[srcset]')?.getAttribute('srcset') || null)
      : '';
  return (
    largestFromSrcset(el.getAttribute('srcset')) || pictureSource || (!isPlaceholderSrc(src) ? src : '') || lazy || src
  );
}

function absolutize(url: string, baseUrl: string): string {
  if (!url || !baseUrl || /^(https?:|data:|mailto:|tel:|#)/i.test(url)) return url;
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}

function markdownUrl(url: string): string {
  return url.replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29');
}

const IMAGE_FILE_RE = /\.(png|jpe?g|gif|webp|avif|svg|bmp)(\?|#|$)/i;

/**
 * Clean and convert raw HTML string into clean Markdown without external bloat
 */
export function htmlToCleanMarkdown(htmlContent: string, baseUrl?: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');

  // Remove scripts, styles, iframes, nav, footer, headers, ads
  const unwantedSelectors = [
    'script',
    'style',
    'noscript',
    'iframe',
    'nav',
    'header',
    'footer',
    'aside',
    '.sidebar',
    '.nav',
    '.menu',
    '.ad',
    '.ads',
    '.advertisement',
    '#cookie-banner',
    '#cookie-notice',
    '.cookie-consent',
    '.social-share',
    '.comments',
  ];

  unwantedSelectors.forEach((sel) => {
    doc.querySelectorAll(sel).forEach((el) => el.remove());
  });

  // Target the best content container
  const candidate =
    doc.querySelector('article') ||
    doc.querySelector('main') ||
    doc.querySelector('[role="main"]') ||
    doc.querySelector('.markdown-body') ||
    doc.querySelector('.content') ||
    doc.querySelector('.post-content') ||
    doc.querySelector('.article-content') ||
    doc.body;

  if (!candidate) return '';

  return nodeToMarkdown(candidate, baseUrl || '').trim();
}

/**
 * Recursive DOM to Markdown converter
 */
function nodeToMarkdown(node: Node, baseUrl: string): string {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    // collapse excessive spaces
    return text.replace(/\s+/g, ' ');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  // Child nodes processed
  const childrenText = Array.from(el.childNodes)
    .map((child) => nodeToMarkdown(child, baseUrl))
    .join('');

  switch (tag) {
    case 'h1':
      return `\n\n# ${childrenText.trim()}\n\n`;
    case 'h2':
      return `\n\n## ${childrenText.trim()}\n\n`;
    case 'h3':
      return `\n\n### ${childrenText.trim()}\n\n`;
    case 'h4':
      return `\n\n#### ${childrenText.trim()}\n\n`;
    case 'h5':
      return `\n\n##### ${childrenText.trim()}\n\n`;
    case 'h6':
      return `\n\n###### ${childrenText.trim()}\n\n`;

    case 'p':
      return `\n\n${childrenText.trim()}\n\n`;

    case 'strong':
    case 'b':
      return childrenText.trim() ? `**${childrenText.trim()}**` : '';

    case 'em':
    case 'i':
      return childrenText.trim() ? `*${childrenText.trim()}*` : '';

    case 'code': {
      // Check if inside pre
      if (el.parentElement && el.parentElement.tagName.toLowerCase() === 'pre') {
        return childrenText;
      }
      return `\`${childrenText.trim()}\``;
    }

    case 'pre': {
      const codeChild = el.querySelector('code');
      const langClass = codeChild?.className?.match(/language-([a-z0-9_-]+)/i);
      const lang = langClass ? langClass[1] : '';
      const rawCode = el.textContent || '';
      return `\n\n\`\`\`${lang}\n${rawCode.trim()}\n\`\`\`\n\n`;
    }

    case 'blockquote': {
      const lines = childrenText.trim().split('\n');
      const quoted = lines.map((line) => `> ${line}`).join('\n');
      return `\n\n${quoted}\n\n`;
    }

    case 'ul': {
      let listMd = '\n\n';
      el.querySelectorAll(':scope > li').forEach((li) => {
        const itemText = Array.from(li.childNodes)
          .map((c) => nodeToMarkdown(c, baseUrl))
          .join('')
          .trim();
        listMd += `- ${itemText}\n`;
      });
      return `${listMd}\n`;
    }

    case 'ol': {
      let listMd = '\n\n';
      let idx = 1;
      el.querySelectorAll(':scope > li').forEach((li) => {
        const itemText = Array.from(li.childNodes)
          .map((c) => nodeToMarkdown(c, baseUrl))
          .join('')
          .trim();
        listMd += `${idx}. ${itemText}\n`;
        idx++;
      });
      return `${listMd}\n`;
    }

    case 'li':
      return childrenText;

    case 'a': {
      const href = absolutize(el.getAttribute('href') || '', baseUrl);
      const label = childrenText.trim() || href;
      if (label.includes('![')) {
        // A thumbnail linking to its own full-size file: the image is enough
        if (!href || href.startsWith('#') || IMAGE_FILE_RE.test(href)) return childrenText;
        return `[${label}](${markdownUrl(href)})`;
      }
      return href ? `[${label}](${href})` : label;
    }

    case 'img': {
      const src = absolutize(pickImageSrc(el).trim(), baseUrl);
      if (!src || isPlaceholderSrc(src)) return '';
      // Tracking pixels
      const w = parseInt(el.getAttribute('width') || '', 10);
      const h = parseInt(el.getAttribute('height') || '', 10);
      if ((w > 0 && w <= 2) || (h > 0 && h <= 2)) return '';
      const alt = (el.getAttribute('alt') || 'Imagen').replace(/[[\]\s]+/g, ' ').trim() || 'Imagen';
      const title = (el.getAttribute('title') || '').replace(/"/g, "'").trim();
      const image = `![${alt}](${markdownUrl(src)}${title ? ` "${title}"` : ''})`;
      // Inside a link the image must stay inline so the link syntax is not broken
      return el.closest('a') ? image : `\n\n${image}\n\n`;
    }

    case 'figcaption':
      return childrenText.trim() ? `\n\n*${childrenText.trim()}*\n\n` : '';

    case 'hr':
      return '\n\n---\n\n';

    case 'br':
      return '\n';

    case 'table': {
      // Basic table extraction
      const rows = el.querySelectorAll('tr');
      if (rows.length === 0) return childrenText;

      let tableMd = '\n\n';
      let colCount = 0;

      rows.forEach((tr, rIdx) => {
        const cells = tr.querySelectorAll('th, td');
        if (cells.length > 0) {
          colCount = Math.max(colCount, cells.length);
          const rowText = Array.from(cells)
            .map((c) => (c.textContent || '').trim().replace(/\|/g, '\\|'))
            .join(' | ');
          tableMd += `| ${rowText} |\n`;

          if (rIdx === 0) {
            const separator = Array.from({ length: cells.length })
              .map(() => ':---')
              .join(' | ');
            tableMd += `| ${separator} |\n`;
          }
        }
      });

      return `${tableMd}\n`;
    }

    default:
      return childrenText;
  }
}

/**
 * Fetch URL and return clean Markdown
 */
export async function fetchUrlAsCleanMarkdown(
  url: string,
  options: { downloadImages?: boolean; onProgress?: (message: string) => void } = {}
): Promise<{
  title: string;
  markdown: string;
  isDirectMarkdown: boolean;
  images: { saved: number; failed: number };
}> {
  // Normalize URL
  let targetUrl = url.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = `https://${targetUrl}`;
  }

  // Auto-rewrite GitHub blob URLs to raw.githubusercontent.com for high fidelity
  if (targetUrl.includes('github.com') && targetUrl.includes('/blob/')) {
    targetUrl = targetUrl
      .replace('github.com', 'raw.githubusercontent.com')
      .replace('/blob/', '/');
  }

  const looksLikeMarkdownFile = /\.(md|markdown)(\?|#|$)/i.test(targetUrl);

  // Directly when the site allows it; otherwise through a public intermediary
  const page = await fetchPageText(targetUrl, {
    plainText: looksLikeMarkdownFile,
    onAttempt: (name) =>
      options.onProgress?.(name === 'acceso directo' ? 'Descargando la página...' : `La web bloquea el acceso directo; probando con ${name}...`),
  });
  const textContent = page.text;
  const contentType = page.contentType;

  const isMarkdown =
    looksLikeMarkdownFile ||
    targetUrl.includes('raw.githubusercontent.com') ||
    contentType.includes('text/markdown') ||
    contentType.includes('text/plain');

  let resultMarkdown = '';
  let inferredTitle = '';

  // Extract candidate title from URL or content
  try {
    const urlObj = new URL(targetUrl);
    const lastSeg = urlObj.pathname.split('/').filter(Boolean).pop() || 'documento';
    inferredTitle = lastSeg.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  } catch {
    inferredTitle = 'Documento Importado';
  }

  if (isMarkdown) {
    resultMarkdown = textContent;
  } else {
    // It's HTML: clean and convert
    resultMarkdown = htmlToCleanMarkdown(textContent, targetUrl);

    // Extract title from HTML if possible
    const titleMatch = textContent.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      inferredTitle = titleMatch[1].trim();
    }
  }

  // Clean and format with prettier/beautifier
  const formatted = await formatMarkdown(resultMarkdown);
  const title = inferredTitle || 'Documento Importado';

  const localized =
    options.downloadImages === false
      ? { markdown: formatted.formatted, saved: 0, failed: 0 }
      : await localizeMarkdownImages(formatted.formatted, targetUrl, slugForImages(title), options.onProgress);

  return {
    title,
    markdown: localized.markdown,
    isDirectMarkdown: isMarkdown,
    images: { saved: localized.saved, failed: localized.failed },
  };
}

const MD_IMAGE_RE = /!\[([^\]]*)\]\(\s*<?([^\s)>]+)>?((?:\s+"[^"]*")?)\s*\)/g;

/**
 * Downloads every image referenced by the Markdown into the local image store and
 * rewrites its target to `images/…`. Images that cannot be downloaded keep their
 * absolute URL (relative ones are resolved against the page address).
 */
export async function localizeMarkdownImages(
  markdown: string,
  baseUrl: string,
  slug: string,
  onProgress?: (message: string) => void
): Promise<{ markdown: string; saved: number; failed: number }> {
  const sources = [...new Set([...markdown.matchAll(MD_IMAGE_RE)].map((m) => m[2]))];
  if (!sources.length) return { markdown, saved: 0, failed: 0 };

  const replacements = new Map<string, string>();
  const taken = new Set<string>();
  const toSave: { path: string; blob: Blob }[] = [];
  const pathByFingerprint = new Map<string, string>();
  let done = 0;
  let failed = 0;

  const queue = [...sources];
  const worker = async () => {
    while (queue.length) {
      const src = queue.shift()!;
      const absolute = absolutize(src, baseUrl);
      const blob = /^(https?:|data:image\/)/i.test(absolute) ? await fetchRemoteImage(absolute) : null;
      done++;
      onProgress?.(`Descargando imágenes: ${done} de ${sources.length}...`);
      if (!blob) {
        failed++;
        if (absolute !== src) replacements.set(src, markdownUrl(absolute));
        continue;
      }
      // The same picture under several URLs (thumb, ?size=…) is stored once
      const fingerprint = await blobFingerprint(blob);
      const existing = pathByFingerprint.get(fingerprint);
      if (existing) {
        replacements.set(src, existing);
        continue;
      }
      let name = '';
      if (!absolute.startsWith('data:')) {
        try {
          name = decodeURIComponent(new URL(absolute).pathname.split('/').pop() || '').replace(/\.[a-z0-9]{2,5}$/i, '');
        } catch {
          name = '';
        }
      }
      const label = /[a-z]{3,}/i.test(name) && name.length <= 40 ? name : `${sources.indexOf(src) + 1}`;
      const path = uniqueImagePath(`${slug}-${label}`, extensionForMime(blob.type), taken);
      toSave.push({ path, blob });
      pathByFingerprint.set(fingerprint, path);
      replacements.set(src, path);
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, sources.length) }, worker));
  await saveImages(toSave);

  const rewritten = markdown.replace(MD_IMAGE_RE, (match, alt, src, title) => {
    const target = replacements.get(src);
    return target ? `![${alt}](${target}${title})` : match;
  });
  return { markdown: rewritten, saved: toSave.length, failed };
}
