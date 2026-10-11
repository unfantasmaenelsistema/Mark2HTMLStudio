import React, { useState } from 'react';
import {
  DocumentConfig,
  FontOption,
  Alignment,
  SpacingScale,
  PageFormat,
} from '../types';
import { THEME_PRESETS, DEFAULT_DOCUMENT_CONFIG } from '../utils/presets';
import { GHOST_LOGO_BASE64, SITE_NAME, SITE_URL } from '../assets/logo';
import {
  Palette,
  Layout,
  PanelBottom,
  Code2,
  Image as ImageIcon,
  RotateCcw,
  Upload,
  X,
  Check,
} from 'lucide-react';

interface StyleSettingsProps {
  config: DocumentConfig;
  onChange: (newConfig: DocumentConfig) => void;
  onClose: () => void;
}

export const StyleSettings: React.FC<StyleSettingsProps> = ({
  config,
  onChange,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'theme' | 'header' | 'footer' | 'advanced'>('theme');

  const updateStyle = (patch: Partial<DocumentConfig['style']>) => {
    onChange({
      ...config,
      style: {
        ...config.style,
        ...patch,
      },
    });
  };

  const updateHeader = (patch: Partial<DocumentConfig['header']>) => {
    onChange({
      ...config,
      header: {
        ...config.header,
        ...patch,
      },
    });
  };

  const updateFooter = (patch: Partial<DocumentConfig['footer']>) => {
    onChange({
      ...config,
      footer: {
        ...config.footer,
        ...patch,
      },
    });
  };

  const updateEffects = (patch: Partial<DocumentConfig['effects']>) => {
    onChange({
      ...config,
      effects: {
        ...config.effects,
        ...patch,
      },
    });
  };

  const applyPreset = (presetKey: string) => {
    const preset = THEME_PRESETS[presetKey];
    if (preset) {
      onChange({
        ...config,
        style: {
          ...config.style,
          ...preset.style,
          themePreset: presetKey as DocumentConfig['style']['themePreset'],
        },
      });
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          updateHeader({ logoUrl: event.target.result as string });
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const resetToDefaults = () => {
    if (window.confirm('¿Deseas restaurar todas las opciones de estilo a los valores predeterminados?')) {
      onChange({
        ...DEFAULT_DOCUMENT_CONFIG,
        documentTitle: config.documentTitle,
      });
    }
  };

  const ACCENT_COLORS = [
    { name: 'Rojo Carmesí (Red Team)', value: '#ef4444' },
    { name: 'Verde Fósforo (Terminal)', value: '#00ff66' },
    { name: 'Cian Ciberdefensa (SOC)', value: '#06b6d4' },
    { name: 'Índigo', value: '#4f46e5' },
    { name: 'Cian / Sky', value: '#0284c7' },
    { name: 'Esmeralda', value: '#059669' },
    { name: 'Púrpura Neón', value: '#a855f7' },
    { name: 'Ámbar Alerta', value: '#d97706' },
    { name: 'Pizarra Profundo', value: '#1e293b' },
    { name: 'Negro Puro', value: '#000000' },
  ];

  return (
    <aside className="w-80 md:w-96 bg-white border-l border-slate-200 flex flex-col h-full shadow-lg z-20 shrink-0">
      {/* Header with Title & Close button */}
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Personalizar Documento</h2>
          <p className="text-xs text-slate-500">Estilos, cabecera y pie de salida</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={resetToDefaults}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            title="Restablecer valores por defecto"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            title="Cerrar panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-50/80 p-1 gap-1 shrink-0 text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('theme')}
          className={`py-2 px-1 rounded flex flex-col items-center gap-1 transition-colors ${
            activeTab === 'theme' ? 'bg-white text-indigo-600 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Tema</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('header')}
          className={`py-2 px-1 rounded flex flex-col items-center gap-1 transition-colors ${
            activeTab === 'header' ? 'bg-white text-indigo-600 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layout className="w-3.5 h-3.5" />
          <span>Cabecera</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('footer')}
          className={`py-2 px-1 rounded flex flex-col items-center gap-1 transition-colors ${
            activeTab === 'footer' ? 'bg-white text-indigo-600 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <PanelBottom className="w-3.5 h-3.5" />
          <span>Pie</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('advanced')}
          className={`py-2 px-1 rounded flex flex-col items-center gap-1 transition-colors ${
            activeTab === 'advanced' ? 'bg-white text-indigo-600 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>CSS / TOC</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-slate-700">
        {/* ===================== TAB 1: THEME & STYLE ===================== */}
        {activeTab === 'theme' && (
          <div className="space-y-6">
            {/* Presets */}
            <div>
              <label className="font-semibold text-slate-800 block mb-2">
                Temas Predefinidos
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(THEME_PRESETS).map(([key, item]) => {
                  const isSelected = config.style.themePreset === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => applyPreset(key)}
                      className={`text-left p-2.5 rounded-lg border transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-500'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="font-semibold text-slate-900 text-xs flex items-center justify-between">
                        <span>{item.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-tight">
                        {item.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Typography */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="font-semibold text-slate-800 block">
                Familia Tipográfica
              </label>
              <select
                value={config.style.fontFamily}
                onChange={(e) => updateStyle({ fontFamily: e.target.value as FontOption })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="plus-jakarta">Plus Jakarta Sans (Moderna y Limpia)</option>
                <option value="outfit">Outfit (Geométrica / Técnica)</option>
                <option value="lora">Lora (Serifa Clásica / Académica)</option>
                <option value="jetbrains-mono">JetBrains Mono (Monospace)</option>
                <option value="system">Sistema Predeterminado</option>
              </select>

              {/* Font Size & Line Height */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-600">Tamaño Base</span>
                    <span className="font-mono text-slate-900">{config.style.fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="13"
                    max="18"
                    step="1"
                    value={config.style.fontSize}
                    onChange={(e) => updateStyle({ fontSize: Number(e.target.value) })}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-600">Interlineado</span>
                    <span className="font-mono text-slate-900">{config.style.lineHeight}</span>
                  </div>
                  <input
                    type="range"
                    min="1.4"
                    max="1.9"
                    step="0.05"
                    value={config.style.lineHeight}
                    onChange={(e) => updateStyle({ lineHeight: Number(e.target.value) })}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Document Dimensions & Spacing */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="font-semibold text-slate-800 block">
                Ancho y Márgenes de Página
              </label>
              <div>
                <span className="text-slate-600 block mb-1">Ancho máximo contenedor</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: '680px', val: 680 },
                    { label: '840px', val: 840 },
                    { label: '960px', val: 960 },
                    { label: '100%', val: 0 },
                  ].map((w) => (
                    <button
                      key={w.val}
                      type="button"
                      onClick={() => updateStyle({ maxWidth: w.val })}
                      className={`py-1.5 px-2 rounded border text-center transition-colors ${
                        config.style.maxWidth === w.val
                          ? 'border-indigo-600 bg-indigo-50 font-semibold text-indigo-700'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-slate-600 block mb-1">Relleno de márgenes</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { key: 'compact', label: 'Compacto' },
                    { key: 'normal', label: 'Equilibrado' },
                    { key: 'generous', label: 'Generoso' },
                  ].map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => updateStyle({ contentPadding: p.key as SpacingScale })}
                      className={`py-1.5 px-2 rounded border text-center transition-colors ${
                        config.style.contentPadding === p.key
                          ? 'border-indigo-600 bg-indigo-50 font-semibold text-indigo-700'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Colors */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="font-semibold text-slate-800 block">
                Color de Acento
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {ACCENT_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => updateStyle({ accentColor: color.value })}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      config.style.accentColor.toLowerCase() === color.value.toLowerCase()
                        ? 'border-slate-900 scale-110 shadow-xs'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
                <input
                  type="color"
                  value={config.style.accentColor}
                  onChange={(e) => updateStyle({ accentColor: e.target.value })}
                  className="w-7 h-7 rounded border border-slate-300 cursor-pointer p-0.5 bg-white"
                  title="Color personalizado"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <span className="text-slate-600 block mb-1">Color Fondo</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.style.backgroundColor}
                      onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                      className="w-7 h-7 rounded border border-slate-300 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={config.style.backgroundColor}
                      onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                      className="font-mono text-xs w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-slate-600 block mb-1">Color Texto</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.style.textColor}
                      onChange={(e) => updateStyle({ textColor: e.target.value })}
                      className="w-7 h-7 rounded border border-slate-300 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={config.style.textColor}
                      onChange={(e) => updateStyle({ textColor: e.target.value })}
                      className="font-mono text-xs w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded"
                    />
                  </div>
                </div>
              </div>

              {/* Code blocks theme */}
              <div className="pt-2">
                <span className="text-slate-600 block mb-1">Tema de Bloques de Código</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateStyle({ codeBlockTheme: 'dark' })}
                    className={`py-1.5 px-3 rounded border text-center transition-colors ${
                      config.style.codeBlockTheme === 'dark'
                        ? 'border-indigo-600 bg-slate-900 text-white font-semibold'
                        : 'border-slate-200 text-slate-700 bg-white'
                    }`}
                  >
                    Oscuro (Slate)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStyle({ codeBlockTheme: 'light' })}
                    className={`py-1.5 px-3 rounded border text-center transition-colors ${
                      config.style.codeBlockTheme === 'light'
                        ? 'border-indigo-600 bg-slate-100 text-slate-900 font-semibold'
                        : 'border-slate-200 text-slate-700 bg-white'
                    }`}
                  >
                    Claro (Gris)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: HEADER ===================== */}
        {activeTab === 'header' && (
          <div className="space-y-5">
            {/* Enable Header Switch */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="font-semibold text-slate-900 block">Mostrar Cabecera</span>
                <span className="text-[11px] text-slate-500">
                  Incluye logotipo, títulos y enlace en el documento
                </span>
              </div>
              <input
                type="checkbox"
                checked={config.header.enabled}
                onChange={(e) => updateHeader({ enabled: e.target.checked })}
                className="w-4 h-4 accent-indigo-600 cursor-pointer"
              />
            </div>

            {config.header.enabled && (
              <>
                {/* Logo section */}
                <div className="space-y-2">
                  <label className="font-semibold text-slate-800 block">
                    Logotipo o Emblema
                  </label>
                  <div className="flex items-center gap-3">
                    {config.header.logoUrl ? (
                      <div className="relative group p-1 border border-slate-200 rounded-md bg-slate-50">
                        <img
                          src={config.header.logoUrl}
                          alt="Logo"
                          className="h-10 w-auto object-contain max-w-[120px]"
                        />
                        <button
                          type="button"
                          onClick={() => updateHeader({ logoUrl: '' })}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] shadow"
                          title="Eliminar logo"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="h-10 w-16 border border-dashed border-slate-300 rounded-md flex items-center justify-center text-slate-400 bg-slate-50">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                    )}

                    <div className="flex-1 space-y-1">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md font-medium border border-indigo-200 transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Subir Imagen</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          onChange({
                            ...config,
                            header: {
                              ...config.header,
                              logoUrl: GHOST_LOGO_BASE64,
                              title: SITE_NAME,
                              linkText: 'unfantasmaenelsistema.com',
                              linkUrl: SITE_URL,
                            },
                          })
                        }
                        className="block text-[11px] text-indigo-600 hover:text-indigo-800 underline mt-1"
                      >
                        Aplicar logo y enlace de Un Fantasma en el Sistema
                      </button>
                    </div>
                  </div>

                  <div className="pt-1">
                    <span className="text-slate-500 block mb-1">O introduce URL de imagen:</span>
                    <input
                      type="url"
                      value={config.header.logoUrl}
                      onChange={(e) => updateHeader({ logoUrl: e.target.value })}
                      placeholder="https://ejemplo.com/logo.svg"
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {config.header.logoUrl && (
                    <div className="pt-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-600">Altura del logo</span>
                        <span className="font-mono text-slate-900">{config.header.logoHeight}px</span>
                      </div>
                      <input
                        type="range"
                        min="24"
                        max="80"
                        value={config.header.logoHeight}
                        onChange={(e) => updateHeader({ logoHeight: Number(e.target.value) })}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* Title & Subtitle */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">
                      Título en Cabecera
                    </label>
                    <input
                      type="text"
                      value={config.header.title}
                      onChange={(e) => updateHeader({ title: e.target.value })}
                      placeholder="Nombre de la empresa o proyecto"
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">
                      Subtítulo o Departamento
                    </label>
                    <input
                      type="text"
                      value={config.header.subtitle}
                      onChange={(e) => updateHeader({ subtitle: e.target.value })}
                      placeholder="Lema o división"
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Link and URL */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <label className="font-semibold text-slate-800 block">
                    Enlace de Cabecera
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500 block mb-1">Texto del enlace</span>
                      <input
                        type="text"
                        value={config.header.linkText}
                        onChange={(e) => updateHeader({ linkText: e.target.value })}
                        placeholder="ej. empresa.com"
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">URL destino</span>
                      <input
                        type="url"
                        value={config.header.linkUrl}
                        onChange={(e) => updateHeader({ linkUrl: e.target.value })}
                        placeholder="https://empresa.com"
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Alignment & Divider */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <span className="font-semibold text-slate-800 block">Alineación</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { key: 'left', label: 'Izquierda' },
                      { key: 'center', label: 'Centro' },
                      { key: 'between', label: 'Extremos' },
                    ].map((align) => (
                      <button
                        key={align.key}
                        type="button"
                        onClick={() => updateHeader({ alignment: align.key as Alignment })}
                        className={`py-1.5 px-2 rounded border text-center transition-colors ${
                          config.header.alignment === align.key
                            ? 'border-indigo-600 bg-indigo-50 font-semibold text-indigo-700'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        {align.label}
                      </button>
                    ))}
                  </div>

                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.header.showDivider}
                      onChange={(e) => updateHeader({ showDivider: e.target.checked })}
                      className="w-4 h-4 accent-indigo-600"
                    />
                    <span className="text-slate-700">Mostrar línea separadora inferior</span>
                  </label>
                </div>
              </>
            )}
          </div>
        )}

        {/* ===================== TAB 3: FOOTER ===================== */}
        {activeTab === 'footer' && (
          <div className="space-y-5">
            {/* Enable Footer Switch */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="font-semibold text-slate-900 block">Mostrar Pie de Página</span>
                <span className="text-[11px] text-slate-500">
                  Incluye copyright, número de página y advertencias
                </span>
              </div>
              <input
                type="checkbox"
                checked={config.footer.enabled}
                onChange={(e) => updateFooter({ enabled: e.target.checked })}
                className="w-4 h-4 accent-indigo-600 cursor-pointer"
              />
            </div>

            {config.footer.enabled && (
              <>
                {/* Copyright Text */}
                <div className="space-y-3">
                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">
                      Texto de Copyright / Autor
                    </label>
                    <input
                      type="text"
                      value={config.footer.copyrightText}
                      onChange={(e) => updateFooter({ copyrightText: e.target.value })}
                      placeholder="© 2026 Empresa. Todos los derechos reservados."
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">
                      Distintivo / Indicador de Página
                    </label>
                    <input
                      type="text"
                      value={config.footer.pageNumberText}
                      onChange={(e) => updateFooter({ pageNumberText: e.target.value })}
                      placeholder="ej. Confidencial · Distribución Interna"
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-800 block mb-1">
                      Nota Aclaratoria / Aviso Legal
                    </label>
                    <textarea
                      value={config.footer.disclaimerText}
                      onChange={(e) => updateFooter({ disclaimerText: e.target.value })}
                      placeholder="Aviso legal o nota al pie..."
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                    />
                  </div>
                </div>

                {/* Footer Link & URL */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <label className="font-semibold text-slate-800 block">
                    Enlace de Pie de Página
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500 block mb-1">Texto del enlace</span>
                      <input
                        type="text"
                        value={config.footer.linkText}
                        onChange={(e) => updateFooter({ linkText: e.target.value })}
                        placeholder="Documentación"
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">URL de destino</span>
                      <input
                        type="url"
                        value={config.footer.linkUrl}
                        onChange={(e) => updateFooter({ linkUrl: e.target.value })}
                        placeholder="https://..."
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Alignment & Divider */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <span className="font-semibold text-slate-800 block">Alineación</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { key: 'left', label: 'Izquierda' },
                      { key: 'center', label: 'Centro' },
                      { key: 'between', label: 'Extremos' },
                    ].map((align) => (
                      <button
                        key={align.key}
                        type="button"
                        onClick={() => updateFooter({ alignment: align.key as Alignment })}
                        className={`py-1.5 px-2 rounded border text-center transition-colors ${
                          config.footer.alignment === align.key
                            ? 'border-indigo-600 bg-indigo-50 font-semibold text-indigo-700'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        {align.label}
                      </button>
                    ))}
                  </div>

                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.footer.showDivider}
                      onChange={(e) => updateFooter({ showDivider: e.target.checked })}
                      className="w-4 h-4 accent-indigo-600"
                    />
                    <span className="text-slate-700">Mostrar línea separadora superior</span>
                  </label>
                </div>
              </>
            )}
          </div>
        )}

        {/* ===================== TAB 4: ADVANCED & CSS ===================== */}
        {activeTab === 'advanced' && (
          <div className="space-y-5">
            {/* Table of Contents toggle */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-900 block">Índice Automático (TOC)</span>
                  <span className="text-[11px] text-slate-500">
                    Genera una tabla de contenidos navegable a partir de los encabezados H1, H2 y H3
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={config.style.includeTableOfContents}
                  onChange={(e) => updateStyle({ includeTableOfContents: e.target.checked })}
                  className="w-4 h-4 accent-indigo-600 cursor-pointer"
                />
              </div>
            </div>

            {/* Dynamic Effects in exported HTML */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div>
                <span className="font-semibold text-slate-900 block text-xs">
                  Efectos Dinámicos en HTML Exportado
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Scripts ligeros sin dependencias para hacer interactivo el documento
                </span>
              </div>

              <div className="space-y-2.5 pt-1">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-700 text-xs">Botón «Copiar» en bloques de código</span>
                  <input
                    type="checkbox"
                    checked={config.effects?.enableCodeCopy ?? true}
                    onChange={(e) => updateEffects({ enableCodeCopy: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-700 text-xs">Barra de progreso de lectura al hacer scroll</span>
                  <input
                    type="checkbox"
                    checked={config.effects?.enableReadingProgress ?? true}
                    onChange={(e) => updateEffects({ enableReadingProgress: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-700 text-xs">Zoom de imágenes al hacer clic (Lightbox)</span>
                  <input
                    type="checkbox"
                    checked={config.effects?.enableImageZoom ?? true}
                    onChange={(e) => updateEffects({ enableImageZoom: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-700 text-xs">Botón flotante «Volver arriba»</span>
                  <input
                    type="checkbox"
                    checked={config.effects?.enableBackToTop ?? true}
                    onChange={(e) => updateEffects({ enableBackToTop: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Pestañas de Menú en HTML */}
            <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-900 block text-xs">
                    Pestañas de Menú en HTML
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Permite estructurar múltiples .md en pestañas interactivas sin servidor
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={config.tabs?.enabled ?? true}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      tabs: {
                        ...(config.tabs || { style: 'pills', enabled: true }),
                        enabled: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 accent-indigo-600 cursor-pointer"
                />
              </div>

              {config.tabs?.enabled !== false && (
                <div className="pt-1 space-y-2">
                  <label className="text-[11px] font-semibold text-slate-700 block">
                    Diseño visual de las pestañas
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {[
                      { id: 'pills', label: 'Botones / Pastillas' },
                      { id: 'underline', label: 'Línea inferior' },
                      { id: 'boxed', label: 'Cajas de archivo' },
                      { id: 'cyber', label: 'Cyber / Hacker' },
                    ].map((tStyle) => (
                      <button
                        key={tStyle.id}
                        type="button"
                        onClick={() =>
                          onChange({
                            ...config,
                            tabs: {
                              ...(config.tabs || { enabled: true, style: 'pills' }),
                              style: tStyle.id as any,
                            },
                          })
                        }
                        className={`p-2 rounded-lg border text-left transition-colors ${
                          (config.tabs?.style || 'pills') === tStyle.id
                            ? 'border-indigo-600 bg-white font-semibold text-indigo-700 shadow-2xs'
                            : 'border-slate-200 text-slate-600 bg-white/70 hover:bg-white'
                        }`}
                      >
                        {tStyle.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* PDF Format selection */}
            <div className="space-y-2">
              <label className="font-semibold text-slate-800 block">
                Formato de Hoja para Exportación PDF
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onChange({ ...config, pdfFormat: 'a4' })}
                  className={`py-2 px-3 rounded-lg border text-center transition-colors ${
                    config.pdfFormat === 'a4'
                      ? 'border-indigo-600 bg-indigo-50 font-semibold text-indigo-700'
                      : 'border-slate-200 text-slate-600 bg-white'
                  }`}
                >
                  <div className="font-bold">A4 Estándar</div>
                  <div className="text-[10px] text-slate-400">210 × 297 mm</div>
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ ...config, pdfFormat: 'letter' })}
                  className={`py-2 px-3 rounded-lg border text-center transition-colors ${
                    config.pdfFormat === 'letter'
                      ? 'border-indigo-600 bg-indigo-50 font-semibold text-indigo-700'
                      : 'border-slate-200 text-slate-600 bg-white'
                  }`}
                >
                  <div className="font-bold">Carta / Letter</div>
                  <div className="text-[10px] text-slate-400">215.9 × 279.4 mm</div>
                </button>
              </div>
            </div>

            {/* Custom CSS Injection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-800">
                  CSS Personalizado
                </label>
                <button
                  type="button"
                  onClick={() =>
                    updateStyle({
                      customCss: `/* Estilos CSS adicionales */\n.doc-h1 { text-transform: uppercase; letter-spacing: 0.05em; }\nblockquote { border-left-color: #6366f1; }`,
                    })
                  }
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 underline"
                >
                  Insertar ejemplo
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Se inyectará al final del archivo HTML y en la exportación PDF.
              </p>
              <textarea
                value={config.style.customCss}
                onChange={(e) => updateStyle({ customCss: e.target.value })}
                placeholder="/* .doc-container { ... } */"
                rows={8}
                className="w-full font-mono text-[11px] bg-slate-900 text-slate-100 p-3 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                spellCheck={false}
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
