import React from 'react';
import { Sparkles, X, FileText, Check } from 'lucide-react';
import { SAMPLE_DOCUMENTS } from '../utils/sampleDocuments';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (markdown: string, title: string) => void;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Cargar Plantilla de Ejemplo</h3>
              <p className="text-xs text-slate-500">Documentos preconfigurados listos para convertir</p>
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

        {/* Templates List */}
        <div className="p-6 space-y-3">
          {SAMPLE_DOCUMENTS.map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => {
                onSelectTemplate(doc.content, doc.title);
                onClose();
              }}
              className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/30 transition-all group flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center text-slate-600 group-hover:text-indigo-600 shrink-0 transition-colors">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 text-xs group-hover:text-indigo-700 transition-colors">
                    {doc.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {doc.subtitle}
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-indigo-600 shrink-0 group-hover:translate-x-0.5 transition-transform mt-1">
                Cargar →
              </span>
            </button>
          ))}

          {/* Blank document option */}
          <button
            type="button"
            onClick={() => {
              onSelectTemplate('# Nuevo Documento\n\nEscribe aquí tu contenido en Markdown...', 'Nuevo Documento');
              onClose();
            }}
            className="w-full text-left p-3.5 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-all text-xs text-slate-600 flex items-center justify-between"
          >
            <span>Iniciar con documento en blanco</span>
            <span className="font-semibold text-slate-700">Crear nuevo →</span>
          </button>
        </div>
      </div>
    </div>
  );
};
