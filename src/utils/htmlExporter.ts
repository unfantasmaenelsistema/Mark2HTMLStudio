import { DocumentConfig, TocItem } from '../types';
import { generateDocumentCss } from './cssGenerator';

export interface TabExportItem {
  id: string;
  title: string;
  html: string;
  toc?: TocItem[];
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function buildStandaloneHtml(
  contentHtml: string,
  config: DocumentConfig,
  toc: TocItem[],
  tabsData?: TabExportItem[]
): string {
  const { header, footer, style, documentTitle } = config;
  const css = generateDocumentCss(config);

  const hasMultipleTabs = Boolean(tabsData && tabsData.length > 1 && config.tabs?.enabled !== false);

  // Table of Contents HTML helper
  const renderTocHtml = (items: TocItem[] | undefined) => {
    if (!style.includeTableOfContents || !items || items.length === 0) return '';
    const listItems = items
      .map(
        (item) => `
      <li class="doc-toc-item level-${item.level}">
        <a href="#${item.id}" class="doc-toc-link">${escapeHtml(item.text)}</a>
      </li>`
      )
      .join('');

    return `
    <nav class="doc-toc" aria-label="Índice de contenidos">
      <div class="doc-toc-title">Índice de Contenidos</div>
      <ul class="doc-toc-list">
        ${listItems}
      </ul>
    </nav>`;
  };

  const singleTocHtml = renderTocHtml(toc);

  // Header HTML
  let headerHtml = '';
  if (header.enabled) {
    const logoImg = header.logoUrl
      ? `<img src="${header.logoUrl}" alt="${escapeHtml(header.title || 'Logo')}" class="doc-header-logo" />`
      : '';
    const titleEl = header.title
      ? `<h1 class="doc-header-title">${escapeHtml(header.title)}</h1>`
      : '';
    const subtitleEl = header.subtitle
      ? `<p class="doc-header-subtitle">${escapeHtml(header.subtitle)}</p>`
      : '';
    const linkEl =
      header.linkUrl && header.linkText
        ? `<a href="${header.linkUrl}" class="doc-header-link" target="_blank" rel="noopener noreferrer">${escapeHtml(header.linkText)}</a>`
        : '';

    headerHtml = `
    <header class="doc-header">
      <div class="doc-header-inner">
        <div class="doc-header-brand">
          ${logoImg}
          <div class="doc-header-titles">
            ${titleEl}
            ${subtitleEl}
          </div>
        </div>
        ${linkEl ? `<div class="doc-header-meta">${linkEl}</div>` : ''}
      </div>
    </header>`;
  }

  // Footer HTML
  let footerHtml = '';
  if (footer.enabled) {
    const copyrightEl = footer.copyrightText
      ? `<span>${escapeHtml(footer.copyrightText)}</span>`
      : '';
    const linkEl =
      footer.linkUrl && footer.linkText
        ? `<a href="${footer.linkUrl}" class="doc-footer-link" target="_blank" rel="noopener noreferrer">${escapeHtml(footer.linkText)}</a>`
        : '';
    const pageNumEl = footer.pageNumberText
      ? `<span class="doc-footer-badge">${escapeHtml(footer.pageNumberText)}</span>`
      : '';
    const disclaimerEl = footer.disclaimerText
      ? `<div style="opacity: 0.75; font-size: 0.75rem;">${escapeHtml(footer.disclaimerText)}</div>`
      : '';

    footerHtml = `
    <footer class="doc-footer">
      <div class="doc-footer-inner">
        <div class="doc-footer-meta">
          ${copyrightEl}
          ${disclaimerEl}
        </div>
        <div style="display: flex; align-items: center; gap: 1rem;">
          ${linkEl}
          ${pageNumEl}
        </div>
      </div>
    </footer>`;
  }

  // Multi-tab HTML generation
  let mainBodyHtml = '';
  if (hasMultipleTabs && tabsData) {
    const tabsNavButtons = tabsData
      .map(
        (tab, idx) => `
        <button
          type="button"
          role="tab"
          id="tab-btn-${tab.id}"
          class="doc-tab-btn ${idx === 0 ? 'active' : ''}"
          aria-selected="${idx === 0 ? 'true' : 'false'}"
          aria-controls="tab-panel-${tab.id}"
          data-tab-id="${tab.id}"
        >
          <span>${escapeHtml(tab.title)}</span>
        </button>`
      )
      .join('');

    const tabsPanels = tabsData
      .map((tab, idx) => {
        const tabToc = renderTocHtml(tab.toc);
        return `
        <section
          role="tabpanel"
          id="tab-panel-${tab.id}"
          aria-labelledby="tab-btn-${tab.id}"
          class="doc-tab-panel ${idx === 0 ? 'active' : ''}"
          data-tab-title="${escapeHtml(tab.title)}"
          ${idx === 0 ? '' : 'hidden style="display: none;"'}
        >
          ${tabToc}
          <div class="doc-content">
            ${tab.html}
          </div>
        </section>`;
      })
      .join('');

    mainBodyHtml = `
    <nav class="doc-tabs-nav" role="tablist" aria-label="Pestañas del documento">
      ${tabsNavButtons}
    </nav>
    <div class="doc-tabs-container">
      ${tabsPanels}
    </div>`;
  } else {
    mainBodyHtml = `
    ${singleTocHtml}
    <main class="doc-content">
      ${contentHtml}
    </main>`;
  }

  const effects = config.effects || {
    enableCodeCopy: true,
    enableReadingProgress: true,
    enableImageZoom: true,
    enableBackToTop: true,
    enableSmoothScroll: true,
  };

  const progressBarHtml = effects.enableReadingProgress
    ? '<div id="doc-scroll-progress" aria-hidden="true"></div>'
    : '';

  const backToTopHtml = effects.enableBackToTop
    ? '<button id="doc-back-to-top" title="Volver arriba" aria-label="Volver arriba">↑</button>'
    : '';

  const lightboxHtml = effects.enableImageZoom
    ? '<div id="doc-lightbox-overlay" aria-hidden="true"><img id="doc-lightbox-img" src="" alt="Ampliación" /></div>'
    : '';

  // Embedded self-contained vanilla JS
  const scriptContent = `
    document.addEventListener('DOMContentLoaded', function () {
      // 1. Copy Buttons for Code Blocks
      ${effects.enableCodeCopy ? `
      document.querySelectorAll('.doc-code-wrapper').forEach(function (wrapper) {
        var existingBtn = wrapper.querySelector('.doc-copy-code-btn');
        var header = wrapper.querySelector('.doc-code-header');
        var code = wrapper.querySelector('pre code');
        if (!code) return;

        var btn = existingBtn;
        if (!btn && header) {
          btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'doc-copy-code-btn';
          btn.innerHTML = '<span class="doc-copy-text">Copiar</span>';
          header.appendChild(btn);
        }

        if (btn) {
          btn.addEventListener('click', function () {
            var codeData = btn.getAttribute('data-code');
            var textToCopy = codeData ? decodeURIComponent(codeData) : code.innerText;
            navigator.clipboard.writeText(textToCopy).then(function () {
              btn.classList.add('copied');
              var textSpan = btn.querySelector('.doc-copy-text') || btn.querySelector('span');
              if (textSpan) textSpan.innerText = '¡Copiado!';
              setTimeout(function () {
                btn.classList.remove('copied');
                if (textSpan) textSpan.innerText = 'Copiar';
              }, 2000);
            }).catch(function (err) {
              console.error('Error al copiar:', err);
            });
          });
        }
      });
      ` : ''}

      // 2. Scroll Progress & Back-to-Top Button
      var progressBar = document.getElementById('doc-scroll-progress');
      var backBtn = document.getElementById('doc-back-to-top');

      window.addEventListener('scroll', function () {
        var winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        var height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        if (progressBar && height > 0) {
          var scrolled = (winScroll / height) * 100;
          progressBar.style.width = scrolled + '%';
        }
        if (backBtn) {
          if (winScroll > 350) {
            backBtn.classList.add('visible');
          } else {
            backBtn.classList.remove('visible');
          }
        }
      });

      if (backBtn) {
        backBtn.addEventListener('click', function () {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      }

      // 3. Image Lightbox Zoom
      ${effects.enableImageZoom ? `
      var overlay = document.getElementById('doc-lightbox-overlay');
      var lightImg = document.getElementById('doc-lightbox-img');

      if (overlay && lightImg) {
        document.querySelectorAll('.doc-image, .doc-figure img').forEach(function (img) {
          img.classList.add('doc-image-zoomable');
          img.addEventListener('click', function () {
            lightImg.src = img.src;
            overlay.classList.add('active');
          });
        });

        overlay.addEventListener('click', function () {
          overlay.classList.remove('active');
        });

        document.addEventListener('keydown', function (e) {
          if (e.key === 'Escape' && overlay.classList.contains('active')) {
            overlay.classList.remove('active');
          }
        });
      }
      ` : ''}

      // 4. Tab Switching Logic
      ${hasMultipleTabs ? `
      var tabBtns = document.querySelectorAll('.doc-tab-btn');
      var tabPanels = document.querySelectorAll('.doc-tab-panel');

      function activateTab(tabId) {
        tabBtns.forEach(function (btn) {
          var isMatch = btn.getAttribute('data-tab-id') === tabId;
          btn.classList.toggle('active', isMatch);
          btn.setAttribute('aria-selected', isMatch ? 'true' : 'false');
        });
        tabPanels.forEach(function (panel) {
          var isMatch = panel.id === 'tab-panel-' + tabId;
          panel.classList.toggle('active', isMatch);
          if (isMatch) {
            panel.removeAttribute('hidden');
            panel.style.display = 'block';
          } else {
            panel.setAttribute('hidden', 'true');
            panel.style.display = 'none';
          }
        });
      }

      tabBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var targetId = btn.getAttribute('data-tab-id');
          if (targetId) {
            activateTab(targetId);
            if (history.replaceState) {
              history.replaceState(null, null, '#tab-' + targetId);
            }
          }
        });
      });

      // Handle URL hash deep-link on load
      if (window.location.hash && window.location.hash.indexOf('#tab-') === 0) {
        var hashId = window.location.hash.substring(5);
        if (document.getElementById('tab-panel-' + hashId)) {
          activateTab(hashId);
        }
      }
      ` : ''}
    });
  `;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(documentTitle || 'Documento Convertido')}</title>
  <meta name="generator" content="Mark2HTML Studio">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=Outfit:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
${css}
  </style>
</head>
<body class="doc-root">
  ${progressBarHtml}
  <div class="doc-container">
    ${headerHtml}
    ${mainBodyHtml}
    ${footerHtml}
  </div>
  ${backToTopHtml}
  ${lightboxHtml}
  <script>
${scriptContent}
  </script>
</body>
</html>`;
}

export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
