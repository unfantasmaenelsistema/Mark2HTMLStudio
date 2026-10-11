import { marked, Renderer } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import { TocItem } from '../types';

export interface ParseResult {
  html: string;
  toc: TocItem[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function parseMarkdown(rawMarkdown: string): ParseResult {
  const toc: TocItem[] = [];
  const renderer = new Renderer();

  // Custom heading renderer to assign IDs and collect TOC items
  renderer.heading = ({ text, depth }: { text: string; depth: number; raw: string }) => {
    // Strip HTML tags for clean slug and toc text
    const cleanText = text.replace(/<[^>]+>/g, '');
    let slug = slugify(cleanText);
    if (!slug) {
      slug = `heading-${toc.length + 1}`;
    }

    // Ensure unique id
    let uniqueSlug = slug;
    let counter = 1;
    while (toc.some((item) => item.id === uniqueSlug)) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    // Save to TOC for levels 1, 2, 3
    if (depth <= 3) {
      toc.push({
        id: uniqueSlug,
        text: cleanText,
        level: depth,
      });
    }

    return `<h${depth} id="${uniqueSlug}" class="doc-heading doc-h${depth}">
      <a href="#${uniqueSlug}" class="doc-heading-anchor" aria-hidden="true">#</a>
      ${text}
    </h${depth}>`;
  };

  // Custom code renderer with highlight.js
  renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
    let highlighted = '';
    const validLanguage = lang && hljs.getLanguage(lang) ? lang : null;

    try {
      if (validLanguage) {
        highlighted = hljs.highlight(text, { language: validLanguage }).value;
      } else {
        highlighted = hljs.highlightAuto(text).value;
      }
    } catch {
      highlighted = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    const langLabel = validLanguage || lang || 'code';
    const rawAttr = encodeURIComponent(text);
    return `<div class="doc-code-wrapper">
      <div class="doc-code-header">
        <span class="doc-code-lang">${langLabel}</span>
        <button type="button" class="doc-copy-code-btn" data-code="${rawAttr}" title="Copiar código al portapapeles">
          <svg class="doc-copy-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          <span class="doc-copy-text">Copiar</span>
        </button>
      </div>
      <pre><code class="hljs language-${validLanguage || 'text'}">${highlighted}</code></pre>
    </div>`;
  };

  // Custom blockquote renderer supporting GitHub/CTF Admonitions: [!NOTE], [!TIP], [!WARNING], [!DANGER], [!CTF], [!FLAG], [!SUCCESS]
  renderer.blockquote = ({ text }: { text: string; tokens?: any }) => {
    const calloutMatch = text.match(
      /^\s*<p>\s*\[!(NOTE|TIP|HINT|IMPORTANT|WARNING|CAUTION|DANGER|CTF|FLAG|SECURITY|SUCCESS|INFO)\]\s*(?:<br\s*\/?>)?([\s\S]*?)<\/p>([\s\S]*)$/i
    );
    if (calloutMatch) {
      const type = calloutMatch[1].toUpperCase();
      const firstLineContent = calloutMatch[2].trim();
      const restContent = calloutMatch[3] || '';

      let calloutClass = 'doc-callout-note';
      let titleLabel = 'NOTA';
      let iconSvg = '';

      if (type === 'TIP' || type === 'HINT') {
        calloutClass = 'doc-callout-tip';
        titleLabel = 'CONSEJO';
        iconSvg = `<svg class="doc-callout-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>`;
      } else if (type === 'WARNING' || type === 'CAUTION' || type === 'IMPORTANT') {
        calloutClass = 'doc-callout-warning';
        titleLabel = 'ADVERTENCIA';
        iconSvg = `<svg class="doc-callout-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
      } else if (type === 'DANGER') {
        calloutClass = 'doc-callout-danger';
        titleLabel = 'PELIGRO';
        iconSvg = `<svg class="doc-callout-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
      } else if (type === 'CTF' || type === 'FLAG' || type === 'SECURITY') {
        calloutClass = 'doc-callout-ctf';
        titleLabel = type === 'FLAG' ? 'FLAG CAPTURADA' : 'RETO CTF · CIBERSEGURIDAD';
        iconSvg = `<svg class="doc-callout-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`;
      } else if (type === 'SUCCESS') {
        calloutClass = 'doc-callout-success';
        titleLabel = 'ÉXITO';
        iconSvg = `<svg class="doc-callout-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
      } else {
        calloutClass = 'doc-callout-note';
        titleLabel = 'NOTA';
        iconSvg = `<svg class="doc-callout-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
      }

      return `<div class="doc-callout ${calloutClass}">
        <div class="doc-callout-title">
          ${iconSvg}
          <span class="doc-callout-label">${titleLabel}</span>
        </div>
        <div class="doc-callout-content">
          ${firstLineContent ? `<p>${firstLineContent}</p>` : ''}
          ${restContent}
        </div>
      </div>`;
    }

    return `<blockquote>${text}</blockquote>`;
  };

  // Custom table renderer to ensure responsive container
  renderer.table = (token) => {
    const tableHtml = Renderer.prototype.table.call(renderer, token);
    return `<div class="doc-table-container">${tableHtml}</div>`;
  };

  // Custom image renderer with figure & caption support
  renderer.image = ({ href, title, text }) => {
    const titleAttr = title ? ` title="${title}"` : '';
    const altAttr = text ? ` alt="${text}"` : ' alt="Imagen"';
    const captionHtml = title
      ? `<figcaption class="doc-figcaption">${title}</figcaption>`
      : text && text !== 'Imagen' && text !== 'image'
      ? `<figcaption class="doc-figcaption">${text}</figcaption>`
      : '';

    return `<figure class="doc-figure align-center">
      <img src="${href}"${altAttr}${titleAttr} class="doc-image" loading="lazy" />
      ${captionHtml}
    </figure>`;
  };

  // Parse markdown
  const dirtyHtml = marked.parse(rawMarkdown, {
    renderer,
    gfm: true,
    breaks: true,
  }) as string;

  // Sanitize with DOMPurify while permitting styling classes and attributes
  const cleanHtml = DOMPurify.sanitize(dirtyHtml, {
    ADD_ATTR: [
      'target',
      'rel',
      'id',
      'class',
      'aria-hidden',
      'src',
      'alt',
      'width',
      'height',
      'style',
      'loading',
      'title',
      'viewBox',
      'fill',
      'stroke',
      'stroke-width',
      'stroke-linecap',
      'stroke-linejoin',
      'd',
      'points',
      'cx',
      'cy',
      'r',
      'x',
      'y',
      'x1',
      'y1',
      'x2',
      'y2',
      'rx',
      'ry',
      'data-code',
      'type',
    ],
    ADD_TAGS: [
      'span',
      'code',
      'pre',
      'div',
      'hr',
      'figure',
      'figcaption',
      'img',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'svg',
      'path',
      'line',
      'polyline',
      'polygon',
      'circle',
      'rect',
      'button',
    ],
  });

  return {
    html: cleanHtml,
    toc,
  };
}
