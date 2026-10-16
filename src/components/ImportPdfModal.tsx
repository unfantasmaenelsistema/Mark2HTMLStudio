import React, { useRef, useState } from 'react';
import {
  FileText,
  Languages,
  X,
  ArrowRight,
  Loader2,
  AlertCircle,
  UploadCloud,
  ShieldCheck,
} from 'lucide-react';
import { importPdfAsMarkdown } from '../utils/pdfToMarkdownImporter';
import { translateMarkdown } from '../utils/markdownTranslator';

interface ImportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (markdown: string, title: string, shouldCreateTab: boolean) => void;
}

export const ImportPdfModal: React.FC<ImportPdfModalProps> = ({ isOpen, onClose, onImport }) => {
  const [file, setFile] = useState<File | null>(null);
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [createAsNewTab, setCreateAsNewTab] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const selectFile = (candidate: File | undefined) => {
    if (!candidate) return;
    const isPdf = candidate.type === 'application/pdf' || /\.pdf$/i.test(candidate.name);
    if (!isPdf) {
      setErrorMsg('El archivo seleccionado no es un PDF.');
      return;
    }
    setErrorMsg(null);
    setFile(candidate);
  };

  const handleClose = () => {
    if (isLoading) return;
    setFile(null);
    setErrorMsg(null);
    setProgress(null);
    onClose();
  };

  const handleImport = async () => {
    if (!file) {
      setErrorMsg('Selecciona o arrastra un archivo PDF.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg(null);
      setProgress('Cargando motor PDF...');

      const result = await importPdfAsMarkdown(file, (page, total) =>
        setProgress(`Extrayendo texto: página ${page} de ${total}...`)
      );

      let finalMarkdown = result.markdown;
      let finalTitle = result.title;

      if (autoTranslate) {
        setProgress('Traduciendo al español...');
        const transResult = await translateMarkdown(finalMarkdown, {
          onProgress: (done, total) => setProgress(`Traduciendo al español: ${done}/${total} bloques...`),
          onStatus: (message) => setProgress(message),
        });
        finalMarkdown = transResult.translated;
        finalTitle = `${finalTitle} (ES)`;
      }

      onImport(finalMarkdown, finalTitle, createAsNewTab);
      setFile(null);
      setProgress(null);
      onClose();
    } catch (err: any) {
      console.error('Error importing PDF:', err);
      setErrorMsg(err?.message || 'No se pudo convertir el PDF a Markdown.');
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Importar PDF como Markdown Limpio</h3>
              <p className="text-xs text-slate-500">
                Títulos, párrafos, listas, tablas, código y enlaces reconstruidos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs text-slate-700">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => {
              selectFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />

          <button
            type="button"
            disabled={isLoading}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              selectFile(e.dataTransfer.files?.[0]);
            }}
            className={`w-full border-2 border-dashed rounded-xl px-4 py-6 flex flex-col items-center gap-2 transition-colors ${
              isDragging
                ? 'border-rose-400 bg-rose-50/60'
                : file
                  ? 'border-emerald-300 bg-emerald-50/40'
                  : 'border-slate-300 bg-slate-50 hover:border-rose-300 hover:bg-rose-50/30'
            }`}
          >
            <UploadCloud className={`w-6 h-6 ${file ? 'text-emerald-600' : 'text-slate-400'}`} />
            {file ? (
              <>
                <span className="font-semibold text-slate-800 break-all">{file.name}</span>
                <span className="text-[11px] text-slate-500">
                  {(file.size / 1024).toFixed(0)} KB · pulsa para elegir otro archivo
                </span>
              </>
            ) : (
              <>
                <span className="font-semibold text-slate-800">Arrastra aquí tu PDF o pulsa para seleccionarlo</span>
                <span className="text-[11px] text-slate-500">Informes, writeups, manuales, artículos...</span>
              </>
            )}
          </button>

          <div className="flex items-start gap-2 text-[11px] text-slate-500 bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              El PDF se procesa íntegramente en tu navegador: no se sube a ningún servidor. Se eliminan cabeceras,
              pies y números de página repetidos. Los PDF escaneados (solo imagen) no tienen texto extraíble.
            </span>
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
                  <span>Traducir automáticamente al español</span>
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Traducción en tu dispositivo (Chrome integrado o motor Bergamot de Firefox; ~20 MB la primera vez). Mantiene intactos código, comandos y enlaces.
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
            onClick={handleClose}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={isLoading || !file}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{progress || 'Procesando...'}</span>
              </>
            ) : (
              <>
                <span>Convertir a Markdown</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
