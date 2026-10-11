import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  X,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Sparkles,
} from 'lucide-react';
import { GHOST_LOGO_BASE64, SITE_NAME } from '../assets/logo';

interface InsertImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (snippet: string) => void;
}

export const InsertImageModal: React.FC<InsertImageModalProps> = ({
  isOpen,
  onClose,
  onInsert,
}) => {
  const [sourceType, setSourceType] = useState<'upload' | 'url'>('upload');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [altText, setAltText] = useState<string>('Imagen descriptiva');
  const [caption, setCaption] = useState<string>('');
  const [alignment, setAlignment] = useState<'center' | 'left' | 'right'>('center');
  const [widthPreset, setWidthPreset] = useState<'100%' | '75%' | '50%' | '30%' | 'custom'>('100%');
  const [customWidth, setCustomWidth] = useState<string>('350px');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageUrl(event.target.result as string);
          if (!altText || altText === 'Imagen descriptiva') {
            const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
            setAltText(cleanName);
          }
        }
        setIsProcessing(false);
      };
      reader.onerror = () => {
        setIsProcessing(false);
        alert('Error al leer el archivo de imagen.');
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleSetGhostLogo = () => {
    setImageUrl(GHOST_LOGO_BASE64);
    setAltText(SITE_NAME);
    setCaption('Logotipo oficial · Un Fantasma en el Sistema');
    setWidthPreset('30%');
    setAlignment('center');
  };

  const handleConfirmInsert = () => {
    if (!imageUrl) {
      alert('Por favor selecciona una imagen local o introduce una URL.');
      return;
    }

    const resolvedWidth = widthPreset === 'custom' ? customWidth : widthPreset;

    let snippet = '';

    // If it has custom width or alignment or caption, HTML figure is cleanest and most reliable
    if (alignment !== 'center' || widthPreset !== '100%' || caption) {
      const alignClass = `align-${alignment}`;
      const styleAttr = resolvedWidth && resolvedWidth !== '100%' ? ` style="width: ${resolvedWidth};"` : '';
      const captionTag = caption ? `\n  <figcaption class="doc-figcaption">${caption}</figcaption>` : '';

      snippet = `\n<figure class="doc-figure ${alignClass}"${styleAttr}>
  <img src="${imageUrl}" alt="${altText || 'Imagen'}" class="doc-image" />${captionTag}
</figure>\n`;
    } else {
      // Standard Markdown image
      const titleSuffix = caption ? ` "${caption}"` : '';
      snippet = `\n![${altText || 'Imagen'}](${imageUrl}${titleSuffix})\n`;
    }

    onInsert(snippet);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Añadir Imagen en Posición Concreta</h3>
              <p className="text-xs text-slate-500">Inserta en la posición exacta del cursor en el documento</p>
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 flex-1">
          {/* Source Tabs */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 font-medium">
              <button
                type="button"
                onClick={() => setSourceType('upload')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                  sourceType === 'upload' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Subir archivo local</span>
              </button>
              <button
                type="button"
                onClick={() => setSourceType('url')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                  sourceType === 'url' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>URL de Internet</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleSetGhostLogo}
              className="text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/70 border border-indigo-200 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 font-medium whitespace-nowrap"
              title="Insertar logotipo de Un Fantasma en el Sistema"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Logo Oficial</span>
            </button>
          </div>

          {/* Upload or URL input */}
          {sourceType === 'upload' ? (
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center bg-slate-50 hover:bg-slate-100/60 transition-colors">
              <label className="cursor-pointer block">
                <Upload className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                <span className="font-semibold text-slate-900 block text-xs">
                  Haz clic para seleccionar una imagen local
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  PNG, JPG, SVG, WebP o GIF (se procesa en memoria y se incrusta en el documento)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                URL de la imagen
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://ejemplo.com/grafico-analisis.png"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Image Preview Box */}
          {imageUrl && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
              <div className="w-16 h-16 bg-white border border-slate-200 rounded-lg overflow-hidden flex items-center justify-center shrink-0 p-1">
                <img
                  src={imageUrl}
                  alt="Vista previa"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-slate-900 block truncate">
                  Imagen cargada correctamente
                </span>
                <span className="text-[11px] text-slate-500 block">
                  {imageUrl.startsWith('data:') ? 'Incrustada en Base64 (100% portable y offline)' : imageUrl}
                </span>
              </div>
            </div>
          )}

          {/* Position Alignment Options */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-800 block">
              Alineación y Flujo de Texto
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAlignment('left')}
                className={`py-2 px-3 rounded-lg border text-center transition-colors flex items-center justify-center gap-1.5 ${
                  alignment === 'left'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold'
                    : 'border-slate-200 text-slate-600 bg-white'
                }`}
              >
                <AlignLeft className="w-3.5 h-3.5" />
                <span>Izquierda</span>
              </button>
              <button
                type="button"
                onClick={() => setAlignment('center')}
                className={`py-2 px-3 rounded-lg border text-center transition-colors flex items-center justify-center gap-1.5 ${
                  alignment === 'center'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold'
                    : 'border-slate-200 text-slate-600 bg-white'
                }`}
              >
                <AlignCenter className="w-3.5 h-3.5" />
                <span>Centrado</span>
              </button>
              <button
                type="button"
                onClick={() => setAlignment('right')}
                className={`py-2 px-3 rounded-lg border text-center transition-colors flex items-center justify-center gap-1.5 ${
                  alignment === 'right'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold'
                    : 'border-slate-200 text-slate-600 bg-white'
                }`}
              >
                <AlignRight className="w-3.5 h-3.5" />
                <span>Derecha</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {alignment === 'center'
                ? 'La imagen ocupará su propio bloque centrado.'
                : alignment === 'left'
                ? 'La imagen se colocará a la izquierda y el texto de los párrafos fluirá a su derecha.'
                : 'La imagen se colocará a la derecha y el texto de los párrafos fluirá a su izquierda.'}
            </p>
          </div>

          {/* Width Size Options */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-800 block">
              Tamaño / Ancho de la Imagen
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { key: '100%', label: '100% Completo' },
                { key: '75%', label: '75% Grande' },
                { key: '50%', label: '50% Medio' },
                { key: '30%', label: '30% Pequeño' },
                { key: 'custom', label: 'Manual' },
              ].map((w) => (
                <button
                  key={w.key}
                  type="button"
                  onClick={() => setWidthPreset(w.key as any)}
                  className={`py-1.5 px-2 rounded-lg border text-center text-[11px] transition-colors ${
                    widthPreset === w.key
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold'
                      : 'border-slate-200 text-slate-600 bg-white'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>

            {widthPreset === 'custom' && (
              <div className="pt-1 flex items-center gap-2">
                <input
                  type="text"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(e.target.value)}
                  placeholder="ej. 320px o 45%"
                  className="w-32 bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-500">Ejemplos: 280px, 400px, 60%</span>
              </div>
            )}
          </div>

          {/* Alt & Caption */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Texto alternativo (alt)
              </label>
              <input
                type="text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Descripción para accesibilidad e indexación"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Pie de foto / Leyenda (Opcional)
              </label>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="ej. Figura 1. Diagrama de arquitectura del sistema"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!imageUrl || isProcessing}
            onClick={handleConfirmInsert}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Insertar en la posición del cursor</span>
          </button>
        </div>
      </div>
    </div>
  );
};
