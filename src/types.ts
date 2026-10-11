export type FontOption = 'plus-jakarta' | 'outfit' | 'lora' | 'jetbrains-mono' | 'system';
export type PageFormat = 'a4' | 'letter';
export type Alignment = 'left' | 'center' | 'between';
export type SpacingScale = 'compact' | 'normal' | 'generous';

export interface HeaderConfig {
  enabled: boolean;
  logoUrl: string; // URL or base64 data uri
  logoHeight: number; // in pixels
  title: string;
  subtitle: string;
  linkText: string;
  linkUrl: string;
  alignment: Alignment;
  showDivider: boolean;
  backgroundColor: string;
  textColor: string;
}

export interface FooterConfig {
  enabled: boolean;
  copyrightText: string;
  linkText: string;
  linkUrl: string;
  pageNumberText: string; // e.g. "Página 1 de 1" or custom badge
  disclaimerText: string;
  alignment: Alignment;
  showDivider: boolean;
  backgroundColor: string;
  textColor: string;
}

export interface StyleConfig {
  themePreset: 'editorial' | 'academic' | 'technical' | 'corporate' | 'dark' | 'monochrome' | 'cyber-terminal' | 'ghost-redteam' | 'matrix-green' | 'soc-cyber';
  fontFamily: FontOption;
  fontSize: number; // in px: 13, 14, 15, 16, 17, 18
  lineHeight: number; // 1.4, 1.6, 1.8
  maxWidth: number; // in px: 680, 800, 960, 1100, or 0 (full)
  contentPadding: SpacingScale;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  headingColor: string;
  codeBlockTheme: 'dark' | 'light';
  includeTableOfContents: boolean;
  customCss: string;
}

export interface DynamicEffectsConfig {
  enableCodeCopy: boolean;
  enableReadingProgress: boolean;
  enableImageZoom: boolean;
  enableBackToTop: boolean;
  enableSmoothScroll: boolean;
}

export type TabStyle = 'pills' | 'underline' | 'boxed' | 'cyber';

export interface TabsConfig {
  enabled: boolean;
  style: TabStyle;
}

export interface DocumentTab {
  id: string;
  title: string;
  content: string;
}

export interface DocumentConfig {
  documentTitle: string;
  header: HeaderConfig;
  footer: FooterConfig;
  style: StyleConfig;
  pdfFormat: PageFormat;
  effects: DynamicEffectsConfig;
  tabs: TabsConfig;
}

export interface TocItem {
  id: string;
  text: string;
  level: number;
}
