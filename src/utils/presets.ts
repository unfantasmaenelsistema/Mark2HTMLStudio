import { DocumentConfig, StyleConfig } from '../types';
import { GHOST_LOGO_BASE64, SITE_URL, SITE_NAME } from '../assets/logo';

export const THEME_PRESETS: Record<string, { name: string; description: string; style: Partial<StyleConfig> }> = {
  editorial: {
    name: 'Editorial Moderno',
    description: 'Tipografía refinada sin serifa, espaciado equilibrado y acentos suaves.',
    style: {
      themePreset: 'editorial',
      fontFamily: 'plus-jakarta',
      fontSize: 16,
      lineHeight: 1.7,
      maxWidth: 840,
      contentPadding: 'normal',
      accentColor: '#4f46e5', // indigo-600
      backgroundColor: '#ffffff',
      textColor: '#334155', // slate-700
      headingColor: '#0f172a', // slate-900
      codeBlockTheme: 'dark',
    },
  },
  academic: {
    name: 'Académico / Paper',
    description: 'Serifa clásica (Lora), márgenes generosos, estilo de publicación formal.',
    style: {
      themePreset: 'academic',
      fontFamily: 'lora',
      fontSize: 16,
      lineHeight: 1.8,
      maxWidth: 780,
      contentPadding: 'generous',
      accentColor: '#1e3a8a', // blue-900
      backgroundColor: '#fbfbfa',
      textColor: '#1c1917', // stone-900
      headingColor: '#0c0a09', // stone-950
      codeBlockTheme: 'light',
    },
  },
  technical: {
    name: 'Documentación Técnica',
    description: 'Moderno Outfit + JetBrains Mono, bloques de código estilizados y tablas claras.',
    style: {
      themePreset: 'technical',
      fontFamily: 'outfit',
      fontSize: 15,
      lineHeight: 1.6,
      maxWidth: 960,
      contentPadding: 'normal',
      accentColor: '#0284c7', // sky-600
      backgroundColor: '#ffffff',
      textColor: '#374151', // gray-700
      headingColor: '#111827', // gray-900
      codeBlockTheme: 'dark',
    },
  },
  corporate: {
    name: 'Corporativo & Empresa',
    description: 'Tonos azul marino ejecutivos, líneas sobrias y presencia formal.',
    style: {
      themePreset: 'corporate',
      fontFamily: 'plus-jakarta',
      fontSize: 15,
      lineHeight: 1.65,
      maxWidth: 900,
      contentPadding: 'normal',
      accentColor: '#0f766e', // teal-700
      backgroundColor: '#ffffff',
      textColor: '#1e293b', // slate-800
      headingColor: '#0f172a',
      codeBlockTheme: 'dark',
    },
  },
  dark: {
    name: 'Modo Oscuro Elegante',
    description: 'Fondo pizarra profundo, contraste alto para pantallas y descanso visual.',
    style: {
      themePreset: 'dark',
      fontFamily: 'plus-jakarta',
      fontSize: 15,
      lineHeight: 1.7,
      maxWidth: 860,
      contentPadding: 'normal',
      accentColor: '#38bdf8', // sky-400
      backgroundColor: '#0f172a', // slate-900
      textColor: '#cbd5e1', // slate-300
      headingColor: '#f8fafc', // slate-50
      codeBlockTheme: 'dark',
    },
  },
  monochrome: {
    name: 'Minimalista Monocromo',
    description: 'Contraste estricto en blanco y negro, sin distracciones de color.',
    style: {
      themePreset: 'monochrome',
      fontFamily: 'system',
      fontSize: 16,
      lineHeight: 1.7,
      maxWidth: 800,
      contentPadding: 'compact',
      accentColor: '#000000',
      backgroundColor: '#ffffff',
      textColor: '#171717',
      headingColor: '#000000',
      codeBlockTheme: 'light',
    },
  },
  'ghost-redteam': {
    name: 'Ghost Red Team (Hacker)',
    description: 'Negro obsidiana con acentos carmesí inspirados en el pendrive del fantasma.',
    style: {
      themePreset: 'ghost-redteam',
      fontFamily: 'outfit',
      fontSize: 15,
      lineHeight: 1.65,
      maxWidth: 880,
      contentPadding: 'normal',
      accentColor: '#ef4444', // red-500
      backgroundColor: '#09090b', // zinc-950
      textColor: '#e4e4e7', // zinc-200
      headingColor: '#ffffff',
      codeBlockTheme: 'dark',
      customCss: `/* Ghost Red Team */
.doc-heading { border-bottom-color: rgba(239, 68, 68, 0.3) !important; }
blockquote { border-left-color: #ef4444 !important; background: rgba(239, 68, 68, 0.08) !important; }
.doc-code-wrapper { border-color: rgba(239, 68, 68, 0.2) !important; }
th { border-bottom-color: rgba(239, 68, 68, 0.3) !important; }`,
    },
  },
  'matrix-green': {
    name: 'Terminal Hacker / Matrix',
    description: 'Consola clásica de fósforo verde, fondo ultra oscuro y tipografía monospace pura.',
    style: {
      themePreset: 'matrix-green',
      fontFamily: 'jetbrains-mono',
      fontSize: 14,
      lineHeight: 1.7,
      maxWidth: 900,
      contentPadding: 'normal',
      accentColor: '#00ff66', // terminal green
      backgroundColor: '#05080c', // deep terminal black
      textColor: '#a7f3d0', // emerald-200
      headingColor: '#34d399', // emerald-400
      codeBlockTheme: 'dark',
      customCss: `/* Terminal Hacker */
.doc-heading { letter-spacing: 0.04em; border-bottom-color: rgba(0, 255, 102, 0.25) !important; }
blockquote { border-left-color: #00ff66 !important; background: rgba(0, 255, 102, 0.07) !important; }
.doc-code-wrapper { border-color: rgba(0, 255, 102, 0.3) !important; }
th { background: rgba(0, 255, 102, 0.1) !important; border-bottom-color: rgba(0, 255, 102, 0.3) !important; }`,
    },
  },
  'soc-cyber': {
    name: 'Cyber SOC / Blue Team',
    description: 'Centro de Operaciones de Ciberdefensa, cian eléctrico y fondo pizarra profunda.',
    style: {
      themePreset: 'soc-cyber',
      fontFamily: 'outfit',
      fontSize: 15,
      lineHeight: 1.65,
      maxWidth: 920,
      contentPadding: 'normal',
      accentColor: '#06b6d4', // cyan-500
      backgroundColor: '#0b1120', // deep navy
      textColor: '#cbd5e1', // slate-300
      headingColor: '#38bdf8', // sky-400
      codeBlockTheme: 'dark',
      customCss: `/* Cyber SOC */
.doc-heading { border-bottom-color: rgba(6, 182, 212, 0.3) !important; }
blockquote { border-left-color: #06b6d4 !important; background: rgba(6, 182, 212, 0.08) !important; }
.doc-code-wrapper { border-color: rgba(6, 182, 212, 0.25) !important; }`,
    },
  },
};

export const DEFAULT_DOCUMENT_CONFIG: DocumentConfig = {
  documentTitle: 'Especificación y Guía del Proyecto',
  header: {
    enabled: true,
    logoUrl: GHOST_LOGO_BASE64,
    logoHeight: 52,
    title: SITE_NAME,
    subtitle: 'Ciberseguridad, Hacking Ético & Tecnología',
    linkText: 'unfantasmaenelsistema.com',
    linkUrl: SITE_URL,
    alignment: 'between',
    showDivider: true,
    backgroundColor: 'transparent',
    textColor: '#475569',
  },
  footer: {
    enabled: true,
    copyrightText: `© 2026 ${SITE_NAME}. Todos los derechos reservados.`,
    linkText: 'unfantasmaenelsistema.com',
    linkUrl: SITE_URL,
    pageNumberText: 'Seguridad · Ciberinteligencia · OSINT',
    disclaimerText: 'Generado 100% de forma segura y privada en el navegador.',
    alignment: 'between',
    showDivider: true,
    backgroundColor: 'transparent',
    textColor: '#64748b',
  },
  style: {
    themePreset: 'editorial',
    fontFamily: 'plus-jakarta',
    fontSize: 15,
    lineHeight: 1.7,
    maxWidth: 860,
    contentPadding: 'normal',
    accentColor: '#4f46e5',
    backgroundColor: '#ffffff',
    textColor: '#334155',
    headingColor: '#0f172a',
    codeBlockTheme: 'dark',
    includeTableOfContents: true,
    customCss: '',
  },
  pdfFormat: 'a4',
  effects: {
    enableCodeCopy: true,
    enableReadingProgress: true,
    enableImageZoom: true,
    enableBackToTop: true,
    enableSmoothScroll: true,
  },
  tabs: {
    enabled: true,
    style: 'pills',
  },
};
