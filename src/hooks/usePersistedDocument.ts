import { useState, useEffect, useRef, useCallback } from 'react';
import { DocumentConfig, DocumentTab } from '../types';
import { DEFAULT_DOCUMENT_CONFIG } from '../utils/presets';
import { SAMPLE_DOCUMENTS } from '../utils/sampleDocuments';

const STORAGE_KEY_MARKDOWN_LEGACY = 'mark2html_doc_markdown_v1';
const STORAGE_KEY_TABS = 'mark2html_doc_tabs_v2';
const STORAGE_KEY_ACTIVE_TAB = 'mark2html_doc_active_tab_v2';
const STORAGE_KEY_CONFIG = 'mark2html_doc_config_v1';
const DEBOUNCE_MS = 400;

export interface UsePersistedDocumentReturn {
  tabs: DocumentTab[];
  setTabs: (tabs: DocumentTab[] | ((prev: DocumentTab[]) => DocumentTab[])) => void;
  activeTabId: string;
  setActiveTabId: (id: string) => void;
  activeTab: DocumentTab;
  markdown: string;
  setMarkdown: (value: string | ((prev: string) => string)) => void;
  addTab: (title?: string, initialContent?: string) => string;
  loadMdFileIntoNewTab: (file: File) => Promise<string>;
  updateTabTitle: (id: string, newTitle: string) => void;
  removeTab: (id: string) => void;
  reorderTabs: (newTabs: DocumentTab[]) => void;
  documentConfig: DocumentConfig;
  setDocumentConfig: (value: DocumentConfig | ((prev: DocumentConfig) => DocumentConfig)) => void;
  lastSaved: Date | null;
  resetToDefaults: () => void;
  importWorkspace: (backupData: any) => boolean;
}

export interface WorkspaceBackup {
  version: number;
  timestamp: string;
  tabs: DocumentTab[];
  activeTabId?: string;
  documentConfig: DocumentConfig;
}

export function usePersistedDocument(): UsePersistedDocumentReturn {
  // Initialize tabs from localStorage with backward compatibility
  const [tabs, setTabs] = useState<DocumentTab[]>(() => {
    try {
      const storedTabs = localStorage.getItem(STORAGE_KEY_TABS);
      if (storedTabs) {
        const parsed = JSON.parse(storedTabs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }

      // Check legacy single markdown storage
      const legacyMd = localStorage.getItem(STORAGE_KEY_MARKDOWN_LEGACY);
      if (legacyMd !== null && legacyMd.trim().length > 0) {
        return [
          {
            id: 'tab-1',
            title: 'Documento Principal',
            content: legacyMd,
          },
        ];
      }
    } catch (e) {
      console.warn('Error reading tabs from localStorage:', e);
    }

    return [
      {
        id: 'tab-1',
        title: 'Documento Principal',
        content: SAMPLE_DOCUMENTS[0].content,
      },
    ];
  });

  // Active tab ID
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    try {
      const storedId = localStorage.getItem(STORAGE_KEY_ACTIVE_TAB);
      if (storedId) {
        return storedId;
      }
    } catch {
      // ignore
    }
    return tabs[0]?.id || 'tab-1';
  });

  // Ensure activeTabId always points to an existing tab
  useEffect(() => {
    if (!tabs.some((t) => t.id === activeTabId)) {
      if (tabs.length > 0) {
        setActiveTabId(tabs[0].id);
      }
    }
  }, [tabs, activeTabId]);

  // Active tab helper
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0] || {
    id: 'tab-1',
    title: 'Documento Principal',
    content: '',
  };

  const markdown = activeTab.content;

  const setMarkdown = useCallback(
    (valueOrFn: string | ((prev: string) => string)) => {
      setTabs((prevTabs) => {
        return prevTabs.map((tab) => {
          if (tab.id === activeTabId) {
            const newContent =
              typeof valueOrFn === 'function' ? valueOrFn(tab.content) : valueOrFn;
            return { ...tab, content: newContent };
          }
          return tab;
        });
      });
    },
    [activeTabId]
  );

  // Initialize config from localStorage or fallback to defaults
  const [documentConfig, setDocumentConfig] = useState<DocumentConfig>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (stored) {
        const parsed = JSON.parse(stored);
        const parsedHeader = parsed.header || {};
        const parsedFooter = parsed.footer || {};

        const isLegacyPlaceholder =
          parsedHeader.title === 'Acme Corporation' || !parsedHeader.logoUrl;

        return {
          ...DEFAULT_DOCUMENT_CONFIG,
          ...parsed,
          header: {
            ...DEFAULT_DOCUMENT_CONFIG.header,
            ...parsedHeader,
            logoUrl: isLegacyPlaceholder
              ? DEFAULT_DOCUMENT_CONFIG.header.logoUrl
              : parsedHeader.logoUrl,
            title: isLegacyPlaceholder
              ? DEFAULT_DOCUMENT_CONFIG.header.title
              : parsedHeader.title,
            linkUrl: isLegacyPlaceholder
              ? DEFAULT_DOCUMENT_CONFIG.header.linkUrl
              : parsedHeader.linkUrl,
            linkText: isLegacyPlaceholder
              ? DEFAULT_DOCUMENT_CONFIG.header.linkText
              : parsedHeader.linkText,
            subtitle: isLegacyPlaceholder
              ? DEFAULT_DOCUMENT_CONFIG.header.subtitle
              : parsedHeader.subtitle,
          },
          footer: {
            ...DEFAULT_DOCUMENT_CONFIG.footer,
            ...parsedFooter,
            copyrightText: isLegacyPlaceholder
              ? DEFAULT_DOCUMENT_CONFIG.footer.copyrightText
              : parsedFooter.copyrightText,
            linkUrl: isLegacyPlaceholder
              ? DEFAULT_DOCUMENT_CONFIG.footer.linkUrl
              : parsedFooter.linkUrl,
            linkText: isLegacyPlaceholder
              ? DEFAULT_DOCUMENT_CONFIG.footer.linkText
              : parsedFooter.linkText,
          },
          style: {
            ...DEFAULT_DOCUMENT_CONFIG.style,
            ...(parsed.style || {}),
          },
          effects: {
            ...DEFAULT_DOCUMENT_CONFIG.effects,
            ...(parsed.effects || {}),
          },
          tabs: {
            ...DEFAULT_DOCUMENT_CONFIG.tabs,
            ...(parsed.tabs || {}),
          },
        };
      }
    } catch (e) {
      console.warn('Error reading config from localStorage:', e);
    }
    return DEFAULT_DOCUMENT_CONFIG;
  });

  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  // References to always hold the freshest state for the 30s recurring timer & beforeunload
  const tabsRef = useRef<DocumentTab[]>(tabs);
  const activeTabIdRef = useRef<string>(activeTabId);
  const configRef = useRef<DocumentConfig>(documentConfig);

  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);

  useEffect(() => {
    configRef.current = documentConfig;
  }, [documentConfig]);

  // Core save helper function
  const saveToStorage = useCallback(
    (currentTabs: DocumentTab[], currentActiveId: string, cfgToSave: DocumentConfig) => {
      try {
        localStorage.setItem(STORAGE_KEY_TABS, JSON.stringify(currentTabs));
        localStorage.setItem(STORAGE_KEY_ACTIVE_TAB, currentActiveId);
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(cfgToSave));

        // Legacy compatibility
        const currentActive =
          currentTabs.find((t) => t.id === currentActiveId) || currentTabs[0];
        if (currentActive) {
          localStorage.setItem(STORAGE_KEY_MARKDOWN_LEGACY, currentActive.content);
        }

        setLastSaved(new Date());
      } catch (e) {
        console.error('Failed to save document state to localStorage:', e);
      }
    },
    []
  );

  // 1. Debounced auto-save on state change (fires 400ms after user stops typing)
  useEffect(() => {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      saveToStorage(tabs, activeTabId, documentConfig);
    }, DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [tabs, activeTabId, documentConfig, saveToStorage]);

  // 2. Periodic 30-second recurring timer for reinforced data preservation
  useEffect(() => {
    const PERIODIC_SAVE_INTERVAL_MS = 30000; // 30 seconds

    const intervalId = window.setInterval(() => {
      saveToStorage(tabsRef.current, activeTabIdRef.current, configRef.current);
    }, PERIODIC_SAVE_INTERVAL_MS);

    // Also flush on page unload / tab switch
    const handleBeforeUnload = () => {
      saveToStorage(tabsRef.current, activeTabIdRef.current, configRef.current);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveToStorage]);

  // Actions for tabs management
  const addTab = useCallback((title?: string, initialContent?: string): string => {
    const newId = `tab-${Date.now()}`;
    const newTitle = title || `Pestaña ${tabsRef.current.length + 1}`;
    const newContent =
      initialContent !== undefined
        ? initialContent
        : `# ${newTitle}\n\nEscribe aquí el contenido en formato Markdown para esta pestaña...`;

    const newTab: DocumentTab = {
      id: newId,
      title: newTitle,
      content: newContent,
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
    return newId;
  }, []);

  const loadMdFileIntoNewTab = useCallback(
    (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = (e.target?.result as string) || '';
          // Derive title from clean file name
          const cleanName = file.name.replace(/\.(md|markdown|txt)$/i, '').trim();
          const title =
            cleanName.charAt(0).toUpperCase() + cleanName.slice(1).replace(/[-_]/g, ' ');

          const newId = addTab(title, content);
          resolve(newId);
        };
        reader.onerror = (err) => reject(err);
        reader.readAsText(file);
      });
    },
    [addTab]
  );

  const updateTabTitle = useCallback((id: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setTabs((prev) =>
      prev.map((tab) => (tab.id === id ? { ...tab, title: trimmed } : tab))
    );
  }, []);

  const removeTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        if (prev.length <= 1) return prev; // Keep at least one tab
        const filtered = prev.filter((tab) => tab.id !== id);
        if (activeTabId === id) {
          // Switch to adjacent tab
          const remainingIndex = Math.max(
            0,
            prev.findIndex((t) => t.id === id) - 1
          );
          setActiveTabId(filtered[remainingIndex]?.id || filtered[0].id);
        }
        return filtered;
      });
    },
    [activeTabId]
  );

  const reorderTabs = useCallback((newTabs: DocumentTab[]) => {
    setTabs(newTabs);
  }, []);

  const resetToDefaults = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY_TABS);
      localStorage.removeItem(STORAGE_KEY_ACTIVE_TAB);
      localStorage.removeItem(STORAGE_KEY_MARKDOWN_LEGACY);
      localStorage.removeItem(STORAGE_KEY_CONFIG);
    } catch (e) {
      console.warn('Error clearing localStorage:', e);
    }
    const defaultTabs: DocumentTab[] = [
      {
        id: 'tab-1',
        title: 'Documento Principal',
        content: SAMPLE_DOCUMENTS[0].content,
      },
    ];
    setTabs(defaultTabs);
    setActiveTabId('tab-1');
    setDocumentConfig(DEFAULT_DOCUMENT_CONFIG);
    setLastSaved(new Date());
  }, []);

  const importWorkspace = useCallback((backupData: any): boolean => {
    try {
      if (!backupData || typeof backupData !== 'object') {
        return false;
      }
      // If backup has tabs array
      if (Array.isArray(backupData.tabs) && backupData.tabs.length > 0) {
        const validatedTabs: DocumentTab[] = backupData.tabs.map((t: any, idx: number) => ({
          id: typeof t.id === 'string' && t.id ? t.id : `tab-${Date.now()}-${idx}`,
          title: typeof t.title === 'string' && t.title.trim() ? t.title.trim() : `Pestaña ${idx + 1}`,
          content: typeof t.content === 'string' ? t.content : '',
        }));

        const newActiveId =
          backupData.activeTabId && validatedTabs.some((t) => t.id === backupData.activeTabId)
            ? backupData.activeTabId
            : validatedTabs[0].id;

        setTabs(validatedTabs);
        setActiveTabId(newActiveId);

        if (backupData.documentConfig && typeof backupData.documentConfig === 'object') {
          setDocumentConfig((prev) => ({
            ...DEFAULT_DOCUMENT_CONFIG,
            ...backupData.documentConfig,
            header: {
              ...DEFAULT_DOCUMENT_CONFIG.header,
              ...(backupData.documentConfig.header || {}),
            },
            footer: {
              ...DEFAULT_DOCUMENT_CONFIG.footer,
              ...(backupData.documentConfig.footer || {}),
            },
            style: {
              ...DEFAULT_DOCUMENT_CONFIG.style,
              ...(backupData.documentConfig.style || {}),
            },
            effects: {
              ...DEFAULT_DOCUMENT_CONFIG.effects,
              ...(backupData.documentConfig.effects || {}),
            },
            tabs: {
              ...DEFAULT_DOCUMENT_CONFIG.tabs,
              ...(backupData.documentConfig.tabs || {}),
            },
          }));
        }

        const now = new Date();
        setLastSaved(now);

        // Immediate persistence
        try {
          localStorage.setItem(STORAGE_KEY_TABS, JSON.stringify(validatedTabs));
          localStorage.setItem(STORAGE_KEY_ACTIVE_TAB, newActiveId);
          if (backupData.documentConfig) {
            localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(backupData.documentConfig));
          }
        } catch (e) {
          console.warn('Error saving imported workspace to localStorage:', e);
        }

        return true;
      }
      return false;
    } catch (err) {
      console.error('Error importing workspace:', err);
      return false;
    }
  }, []);

  return {
    tabs,
    setTabs,
    activeTabId,
    setActiveTabId,
    activeTab,
    markdown,
    setMarkdown,
    addTab,
    loadMdFileIntoNewTab,
    updateTabTitle,
    removeTab,
    reorderTabs,
    documentConfig,
    setDocumentConfig,
    lastSaved,
    resetToDefaults,
    importWorkspace,
  };
}
