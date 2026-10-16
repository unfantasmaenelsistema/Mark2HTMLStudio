/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { HeaderNav } from './components/HeaderNav';
import { MarkdownEditor } from './components/MarkdownEditor';
import { PreviewPane } from './components/PreviewPane';
import { StyleSettings } from './components/StyleSettings';
import { ExportModal } from './components/ExportModal';
import { TemplatesModal } from './components/TemplatesModal';
import { PrivacyModal } from './components/PrivacyModal';
import { InsertImageModal } from './components/InsertImageModal';
import { ImportUrlModal } from './components/ImportUrlModal';
import { ImportPdfModal } from './components/ImportPdfModal';
import { importPdfAsMarkdown } from './utils/pdfToMarkdownImporter';
import { parseMarkdown } from './utils/markdownParser';
import { buildStandaloneHtml } from './utils/htmlExporter';
import { usePersistedDocument } from './hooks/usePersistedDocument';
import { Check, Minimize2, Eye } from 'lucide-react';

export default function App() {
  // Persisted Document state (auto-saved & restored via localStorage hook with 30s timer & multi-tabs)
  const {
    tabs,
    activeTabId,
    setActiveTabId,
    activeTab,
    markdown,
    setMarkdown,
    addTab,
    loadMdFileIntoNewTab,
    updateTabTitle,
    removeTab,
    documentConfig,
    setDocumentConfig,
    lastSaved,
    importWorkspace,
  } = usePersistedDocument();

  // UI state
  const [activeView, setActiveView] = useState<'split' | 'editor' | 'preview'>('split');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState<boolean>(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState<boolean>(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState<boolean>(false);
  const [isImportUrlModalOpen, setIsImportUrlModalOpen] = useState<boolean>(false);
  const [isImportPdfModalOpen, setIsImportPdfModalOpen] = useState<boolean>(false);
  const [isReadMode, setIsReadMode] = useState<boolean>(false);
  const [isZenMode, setIsZenMode] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Show toast notification helper
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Parse each tab's markdown client-side
  const parsedTabsData = useMemo(() => {
    return tabs.map((tab) => {
      const res = parseMarkdown(tab.content);
      return {
        id: tab.id,
        title: tab.title,
        html: res.html,
        toc: res.toc,
      };
    });
  }, [tabs]);

  // Active tab's parsed data
  const activeParsedTab = useMemo(() => {
    return (
      parsedTabsData.find((t) => t.id === activeTabId) ||
      parsedTabsData[0] || {
        id: 'tab-1',
        title: 'Documento Principal',
        html: '',
        toc: [],
      }
    );
  }, [parsedTabsData, activeTabId]);

  // Generate complete HTML string (including multi-tab interactive nav and panels)
  const fullHtmlCode = useMemo(() => {
    return buildStandaloneHtml(
      activeParsedTab.html,
      documentConfig,
      activeParsedTab.toc,
      parsedTabsData
    );
  }, [activeParsedTab, documentConfig, parsedTabsData]);

  const isPdfFile = (file: File) => file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

  // Converts a PDF dropped or picked in the editor to Markdown
  const convertPdfFile = async (file: File) => {
    showToast(`Convirtiendo "${file.name}" a Markdown...`);
    try {
      return await importPdfAsMarkdown(file);
    } catch (err: any) {
      console.error('Error importing PDF:', err);
      showToast(err?.message || 'No se pudo convertir el PDF.');
      return null;
    }
  };

  // Handle local file upload into active tab
  const handleFileUpload = async (file: File) => {
    if (isPdfFile(file)) {
      const result = await convertPdfFile(file);
      if (!result) return;
      setMarkdown(result.markdown);
      updateTabTitle(activeTabId, result.title);
      showToast(`PDF "${file.name}" convertido a Markdown (${result.stats.pages} páginas)`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text !== undefined) {
        setMarkdown(text);
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        updateTabTitle(activeTabId, nameWithoutExt);
        showToast(`Archivo "${file.name}" cargado en "${nameWithoutExt}"`);
      }
    };
    reader.onerror = () => {
      alert('Error al leer el archivo local.');
    };
    reader.readAsText(file);
  };

  // Handle loading a file into a brand new tab
  const handleLoadFileIntoNewTab = async (file: File) => {
    if (isPdfFile(file)) {
      const result = await convertPdfFile(file);
      if (!result) return;
      addTab(result.title, result.markdown);
      showToast(`PDF "${file.name}" convertido como nueva pestaña.`);
      return;
    }
    try {
      await loadMdFileIntoNewTab(file);
      showToast(`Archivo "${file.name}" cargado como nueva pestaña.`);
    } catch {
      showToast('Error al procesar el archivo para nueva pestaña.');
    }
  };

  // Handle importing an entire workspace backup (.json / .markstudio.json)
  const handleImportWorkspace = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) return;
        const parsed = JSON.parse(text);
        const success = importWorkspace(parsed);
        if (success) {
          showToast(`Proyecto "${file.name}" importado con éxito.`);
        } else {
          showToast('El archivo JSON no contiene una estructura de proyecto válida.');
        }
      } catch (err) {
        console.error('Error parsing workspace file:', err);
        showToast('Error al procesar el archivo JSON de proyecto.');
      }
    };
    reader.onerror = () => {
      showToast('Error al leer el archivo de proyecto.');
    };
    reader.readAsText(file);
  };

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // Copy HTML shortcut
  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(fullHtmlCode);
      showToast('Código HTML copiado al portapapeles');
    } catch {
      showToast('Error al copiar al portapapeles');
    }
  };

  // Handle template selection
  const handleSelectTemplate = (templateMarkdown: string, title: string) => {
    setMarkdown(templateMarkdown);
    updateTabTitle(activeTabId, title);
    setDocumentConfig((prev) => ({
      ...prev,
      documentTitle: title,
    }));
    showToast(`Plantilla "${title}" cargada en pestaña activa`);
  };

  // Handle URL / PDF import (new tab or replace active tab)
  const handleImportDocument = (
    importedMarkdown: string,
    title: string,
    shouldCreateTab: boolean,
    fallbackTitle = 'URL Importada'
  ) => {
    const finalTitle = title || fallbackTitle;
    if (shouldCreateTab) {
      addTab(finalTitle, importedMarkdown);
      showToast(`Contenido importado como nueva pestaña "${finalTitle}"`);
    } else {
      setMarkdown(importedMarkdown);
      updateTabTitle(activeTabId, finalTitle);
      showToast(`Pestaña activa actualizada con contenido de "${finalTitle}"`);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        setIsExportModalOpen(true);
      }
      // Alt + Z toggles Zen Mode
      if (e.altKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        setIsZenMode((prev) => !prev);
      }
      // Escape exits Zen Mode
      if (e.key === 'Escape') {
        setIsZenMode(false);
      }
      // Alt + R or Ctrl+Shift+F toggles Read Mode
      if (
        (e.altKey && e.key.toLowerCase() === 'r') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f')
      ) {
        e.preventDefault();
        setIsReadMode((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 text-slate-900 font-sans">
      {/* Read Mode: Fullscreen rendered preview with zero UI clutter */}
      {isReadMode ? (
        <main className="h-full w-full overflow-hidden">
          <PreviewPane
            contentHtml={activeParsedTab.html}
            toc={activeParsedTab.toc}
            config={documentConfig}
            onPrint={handlePrint}
            onCopyHtml={handleCopyHtml}
            fullHtmlCode={fullHtmlCode}
            isReadMode={true}
            onExitReadMode={() => setIsReadMode(false)}
            onOpenExport={() => setIsExportModalOpen(true)}
            tabsData={parsedTabsData}
            activeTabId={activeTabId}
            onSelectTab={setActiveTabId}
          />
        </main>
      ) : (
        /* Standard Workspace with Header, Editor and Customization Drawer */
        <>
          {/* Top Navigation (hidden in Zen Mode for distraction-free editing) */}
          {!isZenMode && (
            <HeaderNav
              onOpenExport={() => setIsExportModalOpen(true)}
              onOpenPrivacy={() => setIsPrivacyModalOpen(true)}
              onOpenTemplates={() => setIsTemplatesModalOpen(true)}
              onOpenImportUrl={() => setIsImportUrlModalOpen(true)}
              onOpenImportPdf={() => setIsImportPdfModalOpen(true)}
              onImportWorkspace={handleImportWorkspace}
              activeView={activeView}
              onChangeView={setActiveView}
              documentTitle={documentConfig.documentTitle}
              onTitleChange={(title) =>
                setDocumentConfig((prev) => ({ ...prev, documentTitle: title }))
              }
              isSidebarOpen={isSidebarOpen}
              onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
              onToggleReadMode={() => setIsReadMode(true)}
              isZenMode={isZenMode}
              onToggleZenMode={() => setIsZenMode((prev) => !prev)}
              lastSaved={lastSaved}
            />
          )}

          {/* Main Workspace */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* Editor & Preview Workspace Container */}
            <div className="flex-1 flex overflow-hidden">
              {/* Markdown Editor Panel (takes 100% in Zen Mode or editor view) */}
              {(isZenMode || activeView === 'split' || activeView === 'editor') && (
                <div
                  className={`h-full ${
                    isZenMode || activeView === 'editor' ? 'w-full' : 'w-1/2'
                  } transition-all`}
                >
                  <MarkdownEditor
                    markdown={markdown}
                    onChange={setMarkdown}
                    onFileUpload={handleFileUpload}
                    lastSaved={lastSaved}
                    onOpenImageModal={() => setIsImageModalOpen(true)}
                    onNotify={showToast}
                    isZenMode={isZenMode}
                    onToggleZenMode={() => setIsZenMode((prev) => !prev)}
                    tabs={tabs}
                    activeTabId={activeTabId}
                    onSelectTab={setActiveTabId}
                    onAddTab={() => {
                      addTab();
                      showToast('Nueva pestaña creada');
                    }}
                    onLoadFileIntoNewTab={handleLoadFileIntoNewTab}
                    onUpdateTabTitle={updateTabTitle}
                    onRemoveTab={(id) => {
                      removeTab(id);
                      showToast('Pestaña eliminada');
                    }}
                    onClear={() => {
                      if (
                        window.confirm(
                          `¿Vaciar el contenido de la pestaña "${activeTab.title}"?`
                        )
                      ) {
                        setMarkdown('');
                      }
                    }}
                  />
                </div>
              )}

              {/* Live Preview Panel (hidden in Zen Mode) */}
              {!isZenMode && (activeView === 'split' || activeView === 'preview') && (
                <div
                  className={`h-full ${
                    activeView === 'split' ? 'w-1/2' : 'w-full'
                  } transition-all`}
                >
                  <PreviewPane
                    contentHtml={activeParsedTab.html}
                    toc={activeParsedTab.toc}
                    config={documentConfig}
                    onPrint={handlePrint}
                    onCopyHtml={handleCopyHtml}
                    fullHtmlCode={fullHtmlCode}
                    onOpenExport={() => setIsExportModalOpen(true)}
                    tabsData={parsedTabsData}
                    activeTabId={activeTabId}
                    onSelectTab={setActiveTabId}
                  />
                </div>
              )}
            </div>

            {/* Customization Drawer / Inspector (hidden in Zen Mode) */}
            {!isZenMode && isSidebarOpen && (
              <StyleSettings
                config={documentConfig}
                onChange={setDocumentConfig}
                onClose={() => setIsSidebarOpen(false)}
              />
            )}
          </div>
        </>
      )}

      {/* Zen Mode Floating Exit Pill */}
      {isZenMode && (
        <div className="fixed top-4 right-6 z-50 flex items-center gap-2 bg-slate-900/90 hover:bg-slate-900 text-white backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-2xl border border-slate-700/80 transition-all text-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="text-slate-400 font-mono text-[10px] hidden sm:inline">
            Modo Zen (Esc / Alt+Z)
          </span>
          <span className="w-px h-3 bg-slate-700 hidden sm:inline" />
          <button
            type="button"
            onClick={() => setIsZenMode(false)}
            className="flex items-center gap-1.5 text-indigo-300 hover:text-white font-medium transition-colors"
            title="Salir del Modo Zen"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Salir</span>
          </button>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white text-xs px-3.5 py-2 rounded-lg shadow-xl flex items-center gap-2 border border-slate-700 animate-in slide-in-from-bottom-2 duration-150">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Insert Image Modal */}
      <InsertImageModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onInsert={(snippet) => {
          setMarkdown((prev) => prev + snippet);
          showToast('Imagen insertada en el documento');
        }}
      />

      {/* Import URL as Clean Markdown Modal */}
      <ImportUrlModal
        isOpen={isImportUrlModalOpen}
        onClose={() => setIsImportUrlModalOpen(false)}
        onImport={(md, title, newTab) => handleImportDocument(md, title, newTab, 'URL Importada')}
      />

      {/* Import PDF as Clean Markdown Modal */}
      <ImportPdfModal
        isOpen={isImportPdfModalOpen}
        onClose={() => setIsImportPdfModalOpen(false)}
        onImport={(md, title, newTab) => handleImportDocument(md, title, newTab, 'PDF Importado')}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        fullHtmlCode={fullHtmlCode}
        rawMarkdown={markdown}
        config={documentConfig}
        onPrint={handlePrint}
        hasMultipleTabs={tabs.length > 1}
        tabCount={tabs.length}
        tabs={tabs}
        activeTabId={activeTabId}
      />

      {/* Templates Modal */}
      <TemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />

      {/* Privacy Guarantee Modal */}
      <PrivacyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />
    </div>
  );
}
