import React from 'react';
import { ShieldCheck, X, CheckCircle2, Lock, Cpu, Globe } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Privacidad y Seguridad Total</h3>
              <p className="text-xs text-emerald-700 font-medium">Arquitectura Zero-Backend</p>
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
        <div className="p-6 space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>
            Esta aplicación ha sido diseñada y construida para ejecutarse <strong>íntegramente en tu navegador web</strong>. Cumple con los más altos estándares de privacidad:
          </p>

          <div className="space-y-3 pt-1">
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block mb-0.5">Sin transmisión a servidores</strong>
                <p className="text-slate-500 text-[11px]">
                  Tus archivos Markdown, imágenes y configuraciones nunca abandonan la memoria RAM de tu navegador. No existe ninguna llamada API ni base de datos intermedia. El traductor solo descarga una vez el modelo de idioma (~20 MB) y traduce en tu dispositivo: tu texto no se envía a ningún sitio.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <Globe className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block mb-0.5">Compatible con GitHub Pages</strong>
                <p className="text-slate-500 text-[11px]">
                  Al ser 100% estática (SPA), puedes clonar este repositorio y alojarlo de forma gratuita en GitHub Pages, Netlify o cualquier servidor estático sin configurar servidores Node/Python.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <Cpu className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block mb-0.5">Bibliotecas Abiertas y Auditadas</strong>
                <p className="text-slate-500 text-[11px]">
                  Utilizamos <strong>marked.js</strong> para el parseo de Markdown, <strong>DOMPurify</strong> para neutralizar cualquier vector XSS malicioso y <strong>jsPDF</strong> para la composición vectorial directa.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
