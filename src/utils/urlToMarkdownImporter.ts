/**
 * Utility to fetch and convert any web URL or raw text into clean Markdown.
 * Supports:
 * - Direct Markdown URLs (.md, raw.githubusercontent.com, pastebin, etc.)
 * - HTML web pages (stripping navigation, scripts, ads, headers and converting main article to clean Markdown)
 * - Safe proxy fallback for CORS restrictions
 */

import { formatMarkdown } from './markdownFormatter';

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
      let href = el.getAttribute('href') || '';
      if (href && baseUrl && !href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('#')) {
        try {
          href = new URL(href, baseUrl).href;
        } catch {}
      }
      const label = childrenText.trim() || href;
      return href ? `[${label}](${href})` : label;
    }

    case 'img': {
      let src = el.getAttribute('src') || '';
      if (src && baseUrl && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
        try {
          src = new URL(src, baseUrl).href;
        } catch {}
      }
      const alt = el.getAttribute('alt') || 'Imagen';
      const title = el.getAttribute('title');
      return src ? `\n\n![${alt}](${src}${title ? ` "${title}"` : ''})\n\n` : '';
    }

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
export async function fetchUrlAsCleanMarkdown(url: string): Promise<{
  title: string;
  markdown: string;
  isDirectMarkdown: boolean;
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

  let textContent = '';
  let contentType = '';

  // Try direct fetch first
  try {
    const res = await fetch(targetUrl);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    contentType = res.headers.get('content-type') || '';
    textContent = await res.text();
  } catch (directErr) {
    // If blocked by CORS, use reliable public CORS proxy (allorigins)
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
    const proxyRes = await fetch(proxyUrl);
    if (!proxyRes.ok) throw new Error(`No se pudo acceder a la URL indicada (${proxyRes.status}).`);
    contentType = proxyRes.headers.get('content-type') || '';
    textContent = await proxyRes.text();
  }

  const isMarkdown =
    targetUrl.endsWith('.md') ||
    targetUrl.endsWith('.markdown') ||
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

  return {
    title: inferredTitle || 'Documento Importado',
    markdown: formatted.formatted,
    isDirectMarkdown: isMarkdown,
  };
}
