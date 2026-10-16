import React, { useState } from 'react';
import {
  Globe,
  Languages,
  X,
  ArrowRight,
  Loader2,
  FileText,
  Check,
  AlertCircle,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { fetchUrlAsCleanMarkdown } from '../utils/urlToMarkdownImporter';
import { translateMarkdown } from '../utils/markdownTranslator';

interface ImportUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (markdown: string, title: string, shouldCreateTab: boolean) => void;
}

export const ImportUrlModal: React.FC<ImportUrlModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [url, setUrl] = useState('');
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [createAsNewTab, setCreateAsNewTab] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFetchAndImport = async () => {
    if (!url.trim()) {
      setErrorMsg('Por favor introduce una URL válida.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg(null);

      const result = await fetchUrlAsCleanMarkdown(url);

      let finalMarkdown = result.markdown;
      let finalTitle = result.title;

      if (autoTranslate) {
        const transResult = await translateMarkdown(finalMarkdown);
        finalMarkdown = transResult.translated;
        finalTitle = `${finalTitle} (ES)`;
      }

      onImport(finalMarkdown, finalTitle, createAsNewTab);
      onClose();
    } catch (err: any) {
      console.error('Error importing URL:', err);
      setErrorMsg(
        err.message ||
          'No se pudo extraer el contenido de la URL. Verifica que la dirección sea accesible o pública.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Importar URL como Markdown Limpio
              </h3>
              <p className="text-xs text-slate-500">
                Webs, artículos, GitHub o pastebins a Markdown estructurado
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs text-slate-700">
          <div>
            <label className="font-semibold text-slate-800 block mb-1.5">
              Dirección Web / Enlace (URL)
            </label>
            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="https://raw.githubusercontent.com/... o https://blog.ejemplo.com/articulo"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-9 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white font-mono"
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleFetchAndImport();
                  }
                }}
              />
              {url && (
                <button
                  type="button"
                  onClick={() => setUrl('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Admite artículos web, repositorios GitHub, documentación o archivos <code className="text-slate-600">.md</code> directos.
            </p>
          </div>

          {/* Quick presets */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2">
            <span className="text-[11px] font-semibold text-slate-600 block">
              Ejemplos rápidos para probar:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setUrl(
                    'https://raw.githubusercontent.com/OWASP/CheatSheetSeries/master/cheatsheets/Cross-Site_Scripting_Prevention_Cheat_Sheet.md'
                  )
                }
                className="text-[11px] bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 px-2.5 py-1 rounded-md transition-colors"
              >
                OWASP XSS CheatSheet (.md)
              </button>
              <button
                type="button"
                onClick={() =>
                  setUrl(
                    'https://raw.githubusercontent.com/carlospolop/hacktricks/master/welcome/readme.md'
                  )
                }
                className="text-[11px] bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 px-2.5 py-1 rounded-md transition-colors"
              >
                HackTricks Readme
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2.5 pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoTranslate}
                onChange={(e) => setAutoTranslate(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-0.5"
              />
              <div>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Traducir automáticamente al español (local, sin APIs externas)</span>
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Traducción en tu dispositivo (Chrome integrado o motor Bergamot de Firefox; ~20 MB la primera vez); mantiene 100% intactos los bloques de código, comandos, flags y rutas técnicas.
                </p>
              </div>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={createAsNewTab}
                onChange={(e) => setCreateAsNewTab(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-slate-700 font-medium text-xs">
                Abrir como nueva pestaña (sin sobreescribir la actual)
              </span>
            </label>
          </div>

          {/* Error display */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-[11px]">{errorMsg}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleFetchAndImport}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Extrayendo y procesando...</span>
              </>
            ) : (
              <>
                <span>Importar a Markdown</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
