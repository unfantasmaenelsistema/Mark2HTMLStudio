import React, { useState, useMemo } from 'react';
import {
  FileCode,
  FileText,
  Printer,
  Copy,
  Download,
  X,
  Check,
  ShieldCheck,
  Loader2,
  FolderArchive,
  Archive,
  Image as ImageIcon,
} from 'lucide-react';
import { exportElementToPdf } from '../utils/pdfExporter';
import { downloadFile } from '../utils/htmlExporter';
import { createZipBundleWithImages, scanImagesInMarkdown } from '../utils/imageBundleExporter';
import { exportImagesAsDataUrls, inlineStoredImagesInHtml } from '../utils/imageStore';
import { DocumentConfig, DocumentTab } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  fullHtmlCode: string;
  rawMarkdown: string;
  config: DocumentConfig;
  onPrint: () => void;
  hasMultipleTabs?: boolean;
  tabCount?: number;
  tabs?: DocumentTab[];
  activeTabId?: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  fullHtmlCode,
  rawMarkdown,
  config,
  onPrint,
  hasMultipleTabs = false,
  tabCount = 1,
  tabs,
  activeTabId,
}) => {
  const [baseFilename, setBaseFilename] = useState<string>(
    config.documentTitle ? config.documentTitle.toLowerCase().replace(/[\s\W]+/g, '-') : 'documento'
  );
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfProgressText, setPdfProgressText] = useState('Procesando...');
  const [pdfPercent, setPdfPercent] = useState(0);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [zipProgressText, setZipProgressText] = useState('Preparando paquete...');
  const [zipPercent, setZipPercent] = useState(0);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Scan total images present in the document
  const detectedImagesCount = useMemo(() => {
    const list = tabs
      ? tabs.flatMap((t) => scanImagesInMarkdown(t.content))
      : scanImagesInMarkdown(rawMarkdown);
    return new Set(list).size;
  }, [tabs, rawMarkdown]);

  if (!isOpen) return null;

  const handleDownloadHtml = async () => {
    const filename = `${baseFilename || 'documento'}.html`;
    // A single .html file has no images/ folder next to it: embed imported images as Base64
    downloadFile(await inlineStoredImagesInHtml(fullHtmlCode), filename, 'text/html');
  };

  const handleDownloadZipBundle = async () => {
    try {
      setIsExportingZip(true);
      setZipPercent(5);
      setZipProgressText('Iniciando empaquetado...');

      const zipBlob = await createZipBundleWithImages({
        baseFilename: baseFilename || 'documento',
        tabs: tabs || [{ id: 'tab-1', title: config.documentTitle || 'Documento', content: rawMarkdown }],
        activeTabId: activeTabId || tabs?.[0]?.id || 'tab-1',
        config,
        onProgress: (step, percent) => {
          setZipProgressText(step);
          setZipPercent(percent);
        },
      });

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseFilename || 'documento'}-completo.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al generar paquete ZIP con imágenes:', err);
      alert('Ocurrió un error al empaquetar las imágenes en ZIP.');
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleDownloadMarkdown = () => {
    const filename = `${baseFilename || 'documento'}.md`;
    downloadFile(rawMarkdown, filename, 'text/markdown');
  };

  const handleDownloadWorkspaceJson = async () => {
    const backupTabs = tabs || [{ id: 'tab-1', title: config.documentTitle || 'Documento', content: rawMarkdown }];
    const backupData = {
      version: 2,
      timestamp: new Date().toISOString(),
      tabs: backupTabs,
      activeTabId: activeTabId || tabs?.[0]?.id || 'tab-1',
      documentConfig: config,
      // Imported images (images/…) so the project restores complete on another browser
      images: await exportImagesAsDataUrls(backupTabs.map((t) => t.content)),
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    downloadFile(jsonStr, `${baseFilename || 'proyecto'}.markstudio.json`, 'application/json');
  };

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(await inlineStoredImagesInHtml(fullHtmlCode));
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2500);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  const handleExportPdf = async () => {
    const targetEl = document.getElementById('exportable-document-canvas');
    if (!targetEl) {
      alert('No se pudo encontrar el lienzo para generar el PDF.');
      return;
    }

    try {
      setIsExportingPdf(true);
      setPdfPercent(10);
      setPdfProgressText('Preparando lienzo en alta resolución...');

      await exportElementToPdf(targetEl, {
        filename: `${baseFilename || 'documento'}.pdf`,
        format: config.pdfFormat,
        onProgress: (step, percent) => {
          setPdfProgressText(step);
          setPdfPercent(percent);
        },
      });
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      alert('Ocurrió un error al generar el PDF. Puedes utilizar la opción de Impresión directa del navegador como alternativa.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Exportar y Descargar</h3>
              <p className="text-xs text-slate-500">100% en tu navegador</p>
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

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs text-slate-700">
          {/* Filename Input */}
          <div>
            <label className="font-semibold text-slate-800 block mb-1.5">
              Nombre base de los archivos
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={baseFilename}
                onChange={(e) => setBaseFilename(e.target.value)}
                placeholder="nombre-del-documento"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-slate-400 font-mono">.html / .pdf</span>
            </div>
          </div>

          {/* PDF In-Progress Status */}
          {isExportingPdf && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between font-semibold text-indigo-900">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  {pdfProgressText}
                </span>
                <span className="font-mono">{pdfPercent}%</span>
              </div>
              <div className="w-full bg-indigo-200/60 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-1.5 transition-all duration-300 rounded-full"
                  style={{ width: `${pdfPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* ZIP Bundle In-Progress Status */}
          {isExportingZip && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between font-semibold text-emerald-900">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  {zipProgressText}
                </span>
                <span className="font-mono">{zipPercent}%</span>
              </div>
              <div className="w-full bg-emerald-200/60 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-600 h-1.5 transition-all duration-300 rounded-full"
                  style={{ width: `${zipPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* ZIP Bundle with Images Card (Featured if document has images) */}
            <button
              type="button"
              disabled={isExportingZip}
              onClick={handleDownloadZipBundle}
              className={`p-3.5 rounded-xl border text-left transition-all group flex flex-col justify-between ${
                detectedImagesCount > 0
                  ? 'border-emerald-300 bg-emerald-50/30 hover:border-emerald-500 hover:bg-emerald-50/70 sm:col-span-2'
                  : 'border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 sm:col-span-2'
              }`}
            >
              <div>
                <div className="flex items-center gap-2 text-emerald-700 mb-1.5">
                  <Archive className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-900 text-xs">
                    Paquete Completo (.ZIP) con Imágenes
                  </span>
                  <span className="ml-auto text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" />
                    <span>{detectedImagesCount} imagen(es) detectada(s)</span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Descarga un ZIP con el HTML, Markdown y <strong>una carpeta "images/" dedicada</strong> con todas las imágenes organizadas localmente (rutas relativas offline).
                </p>
              </div>
              <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-emerald-700 group-hover:translate-x-0.5 transition-transform">
                <span>{isExportingZip ? 'Empaquetando...' : 'Descargar ZIP con imágenes →'}</span>
              </div>
            </button>

            {/* HTML Export Card */}
            <button
              type="button"
              onClick={handleDownloadHtml}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 text-left transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2 text-indigo-600 mb-1.5">
                  <FileCode className="w-4 h-4" />
                  <span className="font-bold text-slate-900 text-xs">Descargar HTML</span>
                  {hasMultipleTabs && (
                    <span className="ml-auto text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded">
                      {tabCount} pestañas
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  {hasMultipleTabs
                    ? 'Archivo HTML autónomo con menú interactivo offline para navegar entre pestañas.'
                    : 'Archivo .html autónomo con CSS embebido, listo para GitHub Pages o compartir.'}
                </p>
              </div>
              <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                <span>Guardar archivo</span>
                <span>→</span>
              </div>
            </button>

            {/* PDF Export Card */}
            <button
              type="button"
              disabled={isExportingPdf}
              onClick={handleExportPdf}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-rose-500 hover:bg-rose-50/40 text-left transition-all group flex flex-col justify-between disabled:opacity-50"
            >
              <div>
                <div className="flex items-center gap-2 text-rose-600 mb-1.5">
                  <FileText className="w-4 h-4" />
                  <span className="font-bold text-slate-900 text-xs">Descargar PDF</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Generado en el cliente vía jsPDF ({config.pdfFormat.toUpperCase()}) con cabecera y pie.
                </p>
              </div>
              <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-rose-600 group-hover:translate-x-0.5 transition-transform">
                <span>{isExportingPdf ? 'Generando...' : 'Generar PDF →'}</span>
              </div>
            </button>

            {/* Copy HTML Code */}
            <button
              type="button"
              onClick={handleCopyHtml}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-left transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2 text-slate-700 mb-1.5">
                  {copiedSuccess ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-600" />
                  )}
                  <span className="font-bold text-slate-900 text-xs">
                    {copiedSuccess ? '¡Copiado!' : 'Copiar Código HTML'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Copia el código fuente completo listo para pegar en tu CMS o web.
                </p>
              </div>
              <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-slate-700">
                <span>Al portapapeles</span>
              </div>
            </button>

            {/* Print / System PDF */}
            <button
              type="button"
              onClick={() => {
                onClose();
                setTimeout(onPrint, 150);
              }}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-left transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2 text-slate-700 mb-1.5">
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span className="font-bold text-slate-900 text-xs">Imprimir / PDF Vectorial</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Abre la ventana nativa del navegador para imprimir o guardar como PDF vectorial.
                </p>
              </div>
              <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-slate-700">
                <span>Abrir diálogo</span>
              </div>
            </button>
          </div>

          {/* Backup Markdown & JSON Workspace */}
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-slate-500 text-[11px]">Copias de seguridad del proyecto:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadMarkdown}
                className="text-xs font-semibold text-slate-700 hover:text-indigo-600 underline"
                title="Descargar sólo el texto Markdown de la pestaña activa"
              >
                Markdown (.md)
              </button>
              <span className="text-slate-300">·</span>
              <button
                type="button"
                onClick={handleDownloadWorkspaceJson}
                className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md border border-indigo-200 transition-colors"
                title="Descarga todas las pestañas, contenidos, temas y estilos en un único archivo .json restaurable"
              >
                <FolderArchive className="w-3.5 h-3.5" />
                <span>Proyecto Completo (.json)</span>
              </button>
            </div>
          </div>

          {/* Privacy Guarantee Note */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-emerald-900 leading-tight">
              <span className="font-semibold block mb-0.5">Privacidad garantizada al 100%</span>
              El procesamiento de Markdown, compilación CSS y generación de PDF ocurren dentro de este navegador. Tus documentos no se envían a ningún servidor; al empaquetar solo se descargan las imágenes remotas que enlaza el documento.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
