import React from 'react';
import {
  Download,
  ShieldCheck,
  FileText,
  Sparkles,
  SlidersHorizontal,
  Eye,
  Code2,
  ExternalLink,
  BookOpen,
  Upload,
  Globe,
  Maximize2,
  FileEdit,
} from 'lucide-react';
import { SITE_URL, SITE_NAME } from '../assets/logo';

interface HeaderNavProps {
  onOpenExport: () => void;
  onOpenPrivacy: () => void;
  onOpenTemplates: () => void;
  onOpenImportUrl?: () => void;
  onOpenImportPdf?: () => void;
  onImportWorkspace?: (file: File) => void;
  activeView: 'split' | 'editor' | 'preview';
  onChangeView: (view: 'split' | 'editor' | 'preview') => void;
  documentTitle: string;
  onTitleChange: (newTitle: string) => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onToggleReadMode: () => void;
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
  lastSaved?: Date | null;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  onOpenExport,
  onOpenPrivacy,
  onOpenTemplates,
  onOpenImportUrl,
  onOpenImportPdf,
  onImportWorkspace,
  activeView,
  onChangeView,
  documentTitle,
  onTitleChange,
  isSidebarOpen,
  onToggleSidebar,
  onToggleReadMode,
  isZenMode,
  onToggleZenMode,
  lastSaved,
}) => {
  return (
    <header className="border-b border-slate-200/90 bg-white/95 backdrop-blur-sm sticky top-0 z-30 select-none shadow-2xs">
      {/* Row 1: Brand Logo, Document Title & Primary Action Controls */}
      <div className="h-14 px-4 sm:px-6 flex items-center justify-between gap-3">
        {/* Left: Brand Identity & Document Rename */}
        <div className="flex items-center gap-3 min-w-0">
          <a
            href={SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 shrink-0 group hover:opacity-90 transition-opacity"
            title={`Visitar ${SITE_NAME} (${SITE_URL})`}
          >
            <img
              src={`${import.meta.env.BASE_URL}icono.png`}
              alt={SITE_NAME}
              className="w-8 h-8 object-contain drop-shadow-xs group-hover:scale-105 transition-transform"
            />
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 tracking-tight text-sm leading-none flex items-center gap-1.5">
                <span>Mark2HTML</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-indigo-100 text-indigo-700 leading-none">
                  Studio
                </span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium group-hover:text-indigo-600 transition-colors whitespace-nowrap hidden sm:flex items-center gap-0.5 mt-0.5">
                <span>unfantasmaenelsistema.com</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
              </span>
            </div>
          </a>

          <span className="text-slate-200 hidden md:inline">|</span>

          {/* Document Title Input */}
          <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/90 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 border border-slate-200/70 rounded-lg px-2.5 py-1 transition-all max-w-[200px] sm:max-w-[300px] md:max-w-[360px]">
            <FileEdit className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={documentTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Nombre del documento..."
              className="text-xs sm:text-sm font-semibold text-slate-800 bg-transparent outline-none w-full truncate"
              title="Haz clic para renombrar el documento"
            />
          </div>

          {/* Auto-save status */}
          {lastSaved && (
            <span
              className="text-[11px] text-emerald-600 hidden xl:inline-flex items-center gap-1.5 font-medium select-none bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60 shrink-0"
              title={`Guardado automático en localStorage: en tiempo real y recurrente cada 30 segundos (Último: ${lastSaved.toLocaleTimeString()})`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
              <span>Guardado {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </span>
          )}
        </div>

        {/* Right: Zen Mode, Read Mode, Personalizar, Exportar */}
        <div className="flex items-center gap-2 shrink-0">
          {onToggleZenMode && (
            <button
              type="button"
              onClick={onToggleZenMode}
              className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 whitespace-nowrap shadow-2xs ${
                isZenMode
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-600'
              }`}
              title="Modo Zen (Alt+Z) — Edición a pantalla completa, sin distracciones, tipografía centrada y margen generoso"
            >
              <Maximize2 className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">Modo Zen</span>
              <kbd className="hidden md:inline text-[9px] px-1 py-0.2 bg-slate-100 text-slate-500 rounded border border-slate-200">
                Alt+Z
              </kbd>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleReadMode}
            className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-2xs"
            title="Modo Lectura a pantalla completa"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden md:inline">Modo Lectura</span>
          </button>

          <button
            type="button"
            onClick={onToggleSidebar}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 whitespace-nowrap shadow-2xs ${
              isSidebarOpen
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
            }`}
            title="Personalizar diseño, encabezado, metadatos y pie de página"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Personalizar</span>
          </button>

          <button
            type="button"
            onClick={onOpenExport}
            className="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 shadow-sm hover:shadow transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            title="Exportar documento a HTML autónomo, Paquete ZIP o PDF de alta calidad"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* Row 2: Secondary Workspace Tools Subbar (Zero overlapping, crystal clear layout) */}
      <div className="h-10 px-4 sm:px-6 bg-slate-50/80 border-t border-slate-200/70 flex items-center justify-between gap-3 overflow-x-auto scrollbar-none text-xs">
        {/* Left Subbar Tools */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Segmented View Switcher */}
          <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg border border-slate-200 font-medium text-slate-600 shadow-2xs">
            <button
              type="button"
              onClick={() => onChangeView('editor')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all whitespace-nowrap text-[11px] ${
                activeView === 'editor'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'hover:text-slate-900'
              }`}
              title="Mostrar solo el editor de código Markdown"
            >
              <Code2 className="w-3 h-3 text-slate-500" />
              <span>Editor</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeView('split')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all whitespace-nowrap text-[11px] ${
                activeView === 'split'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'hover:text-slate-900'
              }`}
              title="Vista dividida: Editor a la izquierda y Vista Previa a la derecha"
            >
              <FileText className="w-3 h-3 text-slate-500" />
              <span>Dividido</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeView('preview')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all whitespace-nowrap text-[11px] ${
                activeView === 'preview'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'hover:text-slate-900'
              }`}
              title="Mostrar solo la vista previa del documento HTML"
            >
              <Eye className="w-3 h-3 text-slate-500" />
              <span>Vista Previa</span>
            </button>
          </div>

          <span className="w-px h-4 bg-slate-200 mx-1 shrink-0" />

          {/* Templates CTA */}
          <button
            type="button"
            onClick={onOpenTemplates}
            className="text-xs font-medium text-slate-700 hover:text-slate-900 px-2.5 py-1 rounded-md hover:bg-white border border-transparent hover:border-slate-200 transition-all flex items-center gap-1.5 whitespace-nowrap"
            title="Cargar plantillas prediseñadas (Writeup CTF, Documentación técnica, Cheat Sheet, etc.)"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Plantillas</span>
          </button>

          {/* Import URL */}
          {onOpenImportUrl && (
            <button
              type="button"
              onClick={onOpenImportUrl}
              className="text-xs font-medium text-indigo-700 hover:text-indigo-900 px-2.5 py-1 rounded-md bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200 transition-all flex items-center gap-1.5 whitespace-nowrap shadow-2xs"
              title="Importar cualquier página web, artículo o URL de GitHub directamente a Markdown limpio"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-600" />
              <span>Importar URL</span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-600 text-white uppercase tracking-wider">
                Nuevo
              </span>
            </button>
          )}

          {/* Import PDF */}
          {onOpenImportPdf && (
            <button
              type="button"
              onClick={onOpenImportPdf}
              className="text-xs font-medium text-rose-700 hover:text-rose-900 px-2.5 py-1 rounded-md bg-rose-50/80 hover:bg-rose-100 border border-rose-200 transition-all flex items-center gap-1.5 whitespace-nowrap shadow-2xs"
              title="Convertir un PDF a Markdown limpio (procesado 100% en tu navegador)"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              <span>Importar PDF</span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-600 text-white uppercase tracking-wider">
                Nuevo
              </span>
            </button>
          )}

          {/* Import Workspace File (.json) */}
          {onImportWorkspace && (
            <label
              className="text-xs font-medium text-slate-700 hover:text-slate-900 px-2.5 py-1 rounded-md hover:bg-white border border-transparent hover:border-slate-200 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              title="Importar proyecto completo o copia de seguridad (.json / .markstudio.json)"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Importar Proyecto</span>
              <input
                type="file"
                accept=".json,.markstudio.json"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    onImportWorkspace(e.target.files[0]);
                    e.target.value = '';
                  }
                }}
              />
            </label>
          )}

          {/* 100% Client Privacy Badge */}
          <button
            type="button"
            onClick={onOpenPrivacy}
            className="text-xs font-medium text-emerald-700 hover:text-emerald-800 px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all flex items-center gap-1.5 whitespace-nowrap shadow-2xs"
            title="Conoce cómo funciona la privacidad: 100% en el navegador, sin servidores ni almacenamiento externo"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>100% Cliente</span>
          </button>
        </div>

        {/* Right Subbar: Web link & Keyboard hints */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-500 font-sans shadow-2xs">Ctrl+S</kbd>
              <span>Guardar</span>
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-500 font-sans shadow-2xs">Alt+Z</kbd>
              <span>Zen</span>
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-500 font-sans shadow-2xs">Shift+Alt+F</kbd>
              <span>Formatear</span>
            </span>
          </div>

          <a
            href={SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-slate-600 hover:text-indigo-600 px-2.5 py-1 rounded-md hover:bg-white border border-transparent hover:border-slate-200 transition-colors flex items-center gap-1.5 whitespace-nowrap"
            title="Abrir web oficial de Un Fantasma en el Sistema"
          >
            <ExternalLink className="w-3 h-3 text-slate-400" />
            <span>unfantasmaenelsistema.com</span>
          </a>
        </div>
      </div>
    </header>
  );
};
