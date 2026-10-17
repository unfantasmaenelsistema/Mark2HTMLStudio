import React, { useRef, useState, useMemo, useEffect } from 'react';
import { DocumentConfig, TocItem } from '../types';
import { generateDocumentCss } from '../utils/cssGenerator';
import { inlineStoredImagesInHtml } from '../utils/imageStore';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Copy,
  Printer,
  FileCode,
  LayoutTemplate,
  Check,
  Download,
  ArrowLeft,
  BookOpen,
} from 'lucide-react';

export interface TabPreviewData {
  id: string;
  title: string;
  html: string;
  toc: TocItem[];
}

interface PreviewPaneProps {
  contentHtml: string;
  toc: TocItem[];
  config: DocumentConfig;
  onPrint: () => void;
  onCopyHtml: () => void;
  fullHtmlCode: string;
  isReadMode?: boolean;
  onExitReadMode?: () => void;
  onOpenExport?: () => void;
  tabsData?: TabPreviewData[];
  activeTabId?: string;
  onSelectTab?: (id: string) => void;
}

export const PreviewPane: React.FC<PreviewPaneProps> = ({
  contentHtml,
  toc,
  config,
  onPrint,
  onCopyHtml,
  fullHtmlCode,
  isReadMode = false,
  onExitReadMode,
  onOpenExport,
  tabsData,
  activeTabId,
  onSelectTab,
}) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(100);
  const [viewMode, setViewMode] = useState<'paper' | 'web' | 'source'>('paper');
  const [copiedSource, setCopiedSource] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Dynamic CSS
  const generatedCss = useMemo(() => {
    return generateDocumentCss(config);
  }, [config]);

  // Sync fullscreen state
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Delegate click for inline code-copy buttons inside the preview
  const handleContentClick = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    const copyBtn = target.closest('.doc-copy-code-btn') as HTMLButtonElement | null;
    if (copyBtn) {
      e.preventDefault();
      e.stopPropagation();
      const codeData = copyBtn.getAttribute('data-code');
      if (codeData) {
        const decoded = decodeURIComponent(codeData);
        navigator.clipboard.writeText(decoded).then(() => {
          copyBtn.classList.add('copied');
          const textEl = copyBtn.querySelector('.doc-copy-text');
          if (textEl) textEl.textContent = '¡Copiado!';
          setTimeout(() => {
            copyBtn.classList.remove('copied');
            if (textEl) textEl.textContent = 'Copiar';
          }, 2000);
        });
      }
    }
  };

  // Handle scroll progress in Read Mode
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const diff = scrollHeight - clientHeight;
    if (diff > 0) {
      setReadProgress(Math.min(100, Math.max(0, (scrollTop / diff) * 100)));
    }
  };

  // Keyboard shortcut: Esc to exit read mode
  useEffect(() => {
    if (!isReadMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onExitReadMode?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReadMode, onExitReadMode]);

  const handleCopySource = async () => {
    // Imported images live in the local store: embed them so the copied HTML is complete
    navigator.clipboard.writeText(await inlineStoredImagesInHtml(fullHtmlCode));
    setCopiedSource(true);
    setTimeout(() => setCopiedSource(false), 2000);
  };

  return (
    <div className={`h-full flex flex-col ${isReadMode ? 'bg-slate-50' : 'bg-slate-100'} overflow-hidden relative`}>
      {/* Dynamic Style Injection for the preview container */}
      <style>{generatedCss}</style>

      {/* Read Mode: Top Progress Bar & Floating Minimal HUD */}
      {isReadMode ? (
        <>
          {/* Scroll progress indicator */}
          <div className="fixed top-0 left-0 right-0 h-1 bg-slate-200/80 z-50">
            <div
              className="h-full bg-indigo-600 transition-all duration-100"
              style={{ width: `${readProgress}%` }}
            />
          </div>

          {/* Floating Read HUD */}
          <div className="fixed top-4 right-6 z-50 flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-lg text-xs animate-in fade-in slide-in-from-top-2 duration-200">
            <button
              type="button"
              onClick={onExitReadMode}
              className="flex items-center gap-1.5 font-semibold text-slate-800 hover:text-indigo-600 transition-colors pr-2.5 border-r border-slate-200"
              title="Salir del Modo Lectura (tecla Esc)"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Salir</span>
              <kbd className="text-[10px] bg-slate-100 border border-slate-300 px-1 py-0.2 rounded text-slate-600 font-mono">
                Esc
              </kbd>
            </button>

            <div className="flex items-center gap-1 text-slate-600 pr-2 border-r border-slate-200">
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.max(60, prev - 15))}
                className="p-1 hover:text-slate-900 transition-colors"
                title="Reducir zoom"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[11px] w-8 text-center">{zoom}%</span>
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.min(150, prev + 15))}
                className="p-1 hover:text-slate-900 transition-colors"
                title="Aumentar zoom"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="p-1.5 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors"
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5 text-indigo-600" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              type="button"
              onClick={onPrint}
              className="p-1.5 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors"
              title="Imprimir documento"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>

            {onOpenExport && (
              <button
                type="button"
                onClick={onOpenExport}
                className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-2.5 py-1 rounded-lg transition-colors ml-1 shadow-2xs"
                title="Exportar documento a HTML o PDF"
              >
                <Download className="w-3 h-3" />
                <span>Exportar</span>
              </button>
            )}
          </div>
        </>
      ) : (
        /* Standard Preview Control Bar */
        <div className="border-b border-slate-200 bg-white/90 backdrop-blur-xs px-4 py-2 flex items-center justify-between gap-3 shrink-0 z-10">
          {/* Mode selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('paper')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors ${
                viewMode === 'paper'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Vista simulada de hoja A4 / Impresión"
            >
              <LayoutTemplate className="w-3.5 h-3.5" />
              <span>Hoja de Impresión</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('web')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors ${
                viewMode === 'web'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Vista fluida de página web"
            >
              <span>Página Web</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('source')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors ${
                viewMode === 'source'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Ver código HTML compilado"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Código HTML</span>
            </button>
          </div>

          {/* Zoom & Quick Actions */}
          <div className="flex items-center gap-2">
            {viewMode !== 'source' && (
              <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 text-xs text-slate-600">
                <button
                  type="button"
                  onClick={() => setZoom((prev) => Math.max(60, prev - 15))}
                  className="p-1 hover:text-slate-900 transition-colors"
                  title="Reducir zoom"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[11px] w-9 text-center">{zoom}%</span>
                <button
                  type="button"
                  onClick={() => setZoom((prev) => Math.min(150, prev + 15))}
                  className="p-1 hover:text-slate-900 transition-colors"
                  title="Aumentar zoom"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(100)}
                  className="p-1 hover:text-slate-900 transition-colors border-l border-slate-200 ml-0.5"
                  title="Ajustar al 100%"
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="text-xs text-slate-600 hover:text-slate-900 p-1.5 rounded hover:bg-slate-200/60 transition-colors flex items-center gap-1"
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5 text-indigo-600" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{isFullscreen ? 'Ventana' : 'Pantalla completa'}</span>
            </button>

            <button
              type="button"
              onClick={onPrint}
              className="text-xs text-slate-600 hover:text-slate-900 p-1.5 rounded hover:bg-slate-200/60 transition-colors flex items-center gap-1"
              title="Imprimir documento / Vista preliminar"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            <button
              type="button"
              onClick={onCopyHtml}
              className="text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50/80 hover:bg-indigo-100/80 border border-indigo-200 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 font-medium"
              title="Copiar HTML al portapapeles"
            >
              <Copy className="w-3 h-3" />
              <span className="hidden sm:inline">Copiar HTML</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Preview Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-auto p-4 md:p-8 flex justify-center items-start ${
          isReadMode ? 'pt-8 md:pt-12' : ''
        }`}
      >
        {viewMode === 'source' ? (
          /* HTML Source View */
          <div className="w-full max-w-4xl bg-slate-900 text-slate-100 rounded-xl overflow-hidden shadow-md flex flex-col h-full border border-slate-800">
            <div className="bg-slate-800/90 px-4 py-2 border-b border-slate-700 flex items-center justify-between text-xs">
              <span className="font-mono text-slate-300">documento.html (Compilado y estructurado)</span>
              <button
                type="button"
                onClick={handleCopySource}
                className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded transition-colors"
              >
                {copiedSource ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSource ? '¡Copiado!' : 'Copiar Todo'}</span>
              </button>
            </div>
            <pre className="p-4 font-mono text-xs overflow-auto flex-1 leading-relaxed text-slate-300 select-all">
              <code>{fullHtmlCode}</code>
            </pre>
          </div>
        ) : (
          /* Visual Document Simulation */
          <div
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease',
            }}
            className="w-full flex justify-center pb-12"
          >
            <div
              id="exportable-document-canvas"
              ref={previewRef}
              className={`doc-root transition-all ${
                viewMode === 'paper'
                  ? 'shadow-xl rounded-md border border-slate-300/80 min-h-[1050px]'
                  : 'w-full shadow-xs'
              }`}
              style={{
                width: viewMode === 'paper' ? '794px' : '100%', // 794px is standard 96dpi A4 width
                backgroundColor: config.style.backgroundColor,
                color: config.style.textColor,
              }}
            >
              <div className="doc-container">
                {/* 1. Header component */}
                {config.header.enabled && (
                  <header className="doc-header">
                    <div className="doc-header-inner">
                      <div className="doc-header-brand">
                        {config.header.logoUrl && (
                          <img
                            src={config.header.logoUrl}
                            alt={config.header.title || 'Logo'}
                            className="doc-header-logo"
                          />
                        )}
                        <div className="doc-header-titles">
                          {config.header.title && (
                            <h1 className="doc-header-title">{config.header.title}</h1>
                          )}
                          {config.header.subtitle && (
                            <p className="doc-header-subtitle">{config.header.subtitle}</p>
                          )}
                        </div>
                      </div>

                      {config.header.linkUrl && config.header.linkText && (
                        <div className="doc-header-meta">
                          <a
                            href={config.header.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="doc-header-link"
                          >
                            {config.header.linkText}
                          </a>
                        </div>
                      )}
                    </div>
                  </header>
                )}

                {/* 2. Interactive Multi-Tab Navigation Bar in Preview */}
                {tabsData && tabsData.length > 1 && config.tabs?.enabled !== false && (
                  <nav className="doc-tabs-nav" role="tablist" aria-label="Pestañas del documento">
                    {tabsData.map((tab) => {
                      const isActive = (activeTabId || tabsData[0]?.id) === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          role="tab"
                          id={`preview-tab-btn-${tab.id}`}
                          aria-selected={isActive}
                          className={`doc-tab-btn ${isActive ? 'active' : ''}`}
                          onClick={() => onSelectTab?.(tab.id)}
                          title={`Ver pestaña: ${tab.title}`}
                        >
                          <span>{tab.title}</span>
                        </button>
                      );
                    })}
                  </nav>
                )}

                {/* 3. Table of Contents */}
                {config.style.includeTableOfContents && (tabsData ? (tabsData.find((t) => t.id === activeTabId)?.toc || tabsData[0]?.toc || []) : toc).length > 0 && (
                  <nav className="doc-toc" aria-label="Índice de contenidos">
                    <div className="doc-toc-title">Índice de Contenidos</div>
                    <ul className="doc-toc-list">
                      {(tabsData ? (tabsData.find((t) => t.id === activeTabId)?.toc || tabsData[0]?.toc || []) : toc).map((item) => (
                        <li key={item.id} className={`doc-toc-item level-${item.level}`}>
                          <a href={`#${item.id}`} className="doc-toc-link">
                            {item.text}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                )}

                {/* 4. Main Markdown Body Content */}
                <main
                  className="doc-content"
                  onClick={handleContentClick}
                  dangerouslySetInnerHTML={{
                    __html: tabsData
                      ? (tabsData.find((t) => t.id === activeTabId)?.html || tabsData[0]?.html || contentHtml)
                      : contentHtml,
                  }}
                />

                {/* 4. Footer component */}
                {config.footer.enabled && (
                  <footer className="doc-footer">
                    <div className="doc-footer-inner">
                      <div className="doc-footer-meta">
                        {config.footer.copyrightText && (
                          <span>{config.footer.copyrightText}</span>
                        )}
                        {config.footer.disclaimerText && (
                          <div style={{ opacity: 0.75, fontSize: '0.75rem' }}>
                            {config.footer.disclaimerText}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {config.footer.linkUrl && config.footer.linkText && (
                          <a
                            href={config.footer.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="doc-footer-link"
                          >
                            {config.footer.linkText}
                          </a>
                        )}

                        {config.footer.pageNumberText && (
                          <span className="doc-footer-badge">
                            {config.footer.pageNumberText}
                          </span>
                        )}
                      </div>
                    </div>
                  </footer>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
