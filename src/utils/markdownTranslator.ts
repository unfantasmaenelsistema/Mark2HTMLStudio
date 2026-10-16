/**
 * Markdown Translator (English -> Spanish), 100% local in the browser.
 *
 * Two engines:
 * 1. Browser on-device translator (Chrome's built-in Translator API): real,
 *    full-sentence translation. The language model runs locally; no text is
 *    sent to external APIs.
 * 2. Rule-based dictionary fallback: translates common headings, technical
 *    phrases and labels only (partial translation) when (1) is unavailable.
 *
 * Both preserve code blocks, inline code, URLs, images, HTML tags and
 * Markdown syntax untouched.
 */

/**
 * Builds a rule that translates a single word only when it is used as a label:
 * a whole heading / list item / table cell, or followed by a colon.
 */
function label(word: string, translation: string): [RegExp, string] {
  return [
    new RegExp(
      `(^|\\|\\s*|^\\s*(?:#{1,6}|[-*+]|\\d+\\.)\\s+|\\*\\*)${word}(?=\\s*(?::|\\||\\*\\*|$))`,
      'gim'
    ),
    `$1${translation}`,
  ];
}

// Common tech keywords that should remain intact
const TECH_TERMS_PRESERVE = new Set([
  'nmap', 'sqlmap', 'wireshark', 'metasploit', 'burp', 'gobuster', 'hydra',
  'john', 'hashcat', 'netcat', 'nc', 'curl', 'wget', 'ssh', 'bash', 'zsh',
  'python', 'javascript', 'typescript', 'docker', 'kubernetes', 'sudo', 'root',
  'api', 'rest', 'json', 'jwt', 'html', 'css', 'dom', 'xss', 'csrf', 'ssrf',
  'rce', 'lfi', 'rfi', 'cve', 'poc', 'pwn', 'ctf', 'flag', 'reverse shell',
  'payload', 'exploit', 'listener', 'port', 'ip', 'localhost', 'git', 'github',
  'linux', 'windows', 'kali', 'ubuntu', 'debian', 'arch', 'powershell', 'cmd'
]);

// Rule-based dictionary for titles, paragraphs, common headings and technical prose
const TRANSLATION_MAP: [RegExp, string][] = [
  // Common documentation headings
  [/^#\s+Introduction\b/gim, '# Introducción'],
  [/^#\s+Overview\b/gim, '# Descripción General'],
  [/^#\s+Getting\s+Started\b/gim, '# Primeros Pasos'],
  [/^#\s+Prerequisites\b/gim, '# Requisitos Previos'],
  [/^#\s+Installation\b/gim, '# Instalación'],
  [/^#\s+Configuration\b/gim, '# Configuración'],
  [/^#\s+Usage\b/gim, '# Uso'],
  [/^#\s+Examples?\b/gim, '# Ejemplos'],
  [/^#\s+Walkthrough\b/gim, '# Guía Paso a Paso'],
  [/^#\s+Methodology\b/gim, '# Metodología'],
  [/^#\s+Reconnaissance\b/gim, '# Reconocimiento'],
  [/^#\s+Enumeration\b/gim, '# Enumeración'],
  [/^#\s+Exploitation\b/gim, '# Explotación'],
  [/^#\s+Privilege\s+Escalation\b/gim, '# Escalada de Privilegios'],
  [/^#\s+Post-Exploitation\b/gim, '# Post-Explotación'],
  [/^#\s+Conclusion\b/gim, '# Conclusión'],
  [/^#\s+Summary\b/gim, '# Resumen'],
  [/^#\s+References?\b/gim, '# Referencias'],
  [/^#\s+Notes?\b/gim, '# Notas'],
  [/^#\s+Troubleshooting\b/gim, '# Solución de Problemas'],

  // Subheadings (H2, H3)
  [/^##\s+Introduction\b/gim, '## Introducción'],
  [/^##\s+Overview\b/gim, '## Descripción General'],
  [/^##\s+Prerequisites\b/gim, '## Requisitos Previos'],
  [/^##\s+Installation\b/gim, '## Instalación'],
  [/^##\s+Configuration\b/gim, '## Configuración'],
  [/^##\s+Usage\b/gim, '## Modo de Uso'],
  [/^##\s+Examples?\b/gim, '## Ejemplos'],
  [/^##\s+Walkthrough\b/gim, '## Guía Paso a Paso'],
  [/^##\s+Reconnaissance\b/gim, '## Fase de Reconocimiento'],
  [/^##\s+Initial\s+Access\b/gim, '## Acceso Inicial'],
  [/^##\s+Enumeration\b/gim, '## Enumeración de Servicios'],
  [/^##\s+Vulnerability\s+Analysis\b/gim, '## Análisis de Vulnerabilidades'],
  [/^##\s+Exploitation\b/gim, '## Explotación de la Vulnerabilidad'],
  [/^##\s+Privilege\s+Escalation\b/gim, '## Escalada de Privilegios'],
  [/^##\s+User\s+Flag\b/gim, '## Flag de Usuario'],
  [/^##\s+Root\s+Flag\b/gim, '## Flag de Root'],
  [/^##\s+Mitigation\b/gim, '## Mitigación y Recomendaciones'],
  [/^##\s+Conclusion\b/gim, '## Conclusión'],
  [/^##\s+Summary\b/gim, '## Resumen Ejecutivo'],
  [/^##\s+References?\b/gim, '## Referencias y Enlaces'],
  [/^##\s+Step\s+(\d+):\s*(.*)$/gim, '## Paso $1: $2'],
  [/^###\s+Step\s+(\d+):\s*(.*)$/gim, '### Paso $1: $2'],

  // Callouts
  [/>\s*\[!NOTE\]/g, '> [!NOTE]'],
  [/>\s*\[!TIP\]/g, '> [!TIP]'],
  [/>\s*\[!WARNING\]/g, '> [!WARNING]'],
  [/>\s*\[!DANGER\]/g, '> [!DANGER]'],
  [/>\s*\[!FLAG\]/g, '> [!FLAG]'],

  // Common sentence phrases & expressions
  [/\bIn this guide,?\s+we will\b/gi, 'En esta guía, vamos a'],
  [/\bIn this tutorial,?\s+we will\b/gi, 'En este tutorial, aprenderemos a'],
  [/\bIn this article,?\s+we will\b/gi, 'En este artículo, vamos a'],
  [/\bFirst,?\s+we need to\b/gi, 'Primero, necesitamos'],
  [/\bNext,?\s+we will\b/gi, 'A continuación, vamos a'],
  [/\bThen,?\s+we can\b/gi, 'Luego, podemos'],
  [/\bFinally,?\s+we have\b/gi, 'Finalmente, tenemos'],
  [/\bFinally,?\s+we can\b/gi, 'Finalmente, podemos'],
  [/\bTo get started,?\s*/gi, 'Para comenzar, '],
  [/\bMake sure you have\b/gi, 'Asegúrate de contar con'],
  [/\bBefore proceeding,?\s*/gi, 'Antes de continuar, '],
  [/\bAs shown below\b/gi, 'Como se muestra a continuación'],
  [/\bAs we can see\b/gi, 'Como podemos observar'],
  [/\bWe can see that\b/gi, 'Podemos comprobar que'],
  [/\bWe can observe that\b/gi, 'Podemos observar que'],
  [/\bBy running the following command\b/gi, 'Ejecutando el siguiente comando'],
  [/\bRun the following command\b/gi, 'Ejecuta el siguiente comando'],
  [/\bExecute the following command\b/gi, 'Ejecuta el siguiente comando'],
  [/\bWe execute(?=:)/gi, 'Ejecutamos'],
  [/\bWe run(?=:)/gi, 'Ejecutamos'],
  [/\bWe can verify that\b/gi, 'Podemos verificar que'],
  [/\bNotice that\b/gi, 'Ten en cuenta que'],
  [/\bPlease note that\b/gi, 'Ten en cuenta que'],
  [/\bKeep in mind that\b/gi, 'Ten presente que'],
  [/\bIt is important to note that\b/gi, 'Es importante señalar que'],
  [/\bFor more details,?\s+see\b/gi, 'Para más detalles, consulta'],
  [/\bFor more information,?\s+visit\b/gi, 'Para más información, visita'],
  [/\bClick here to\b/gi, 'Haz clic aquí para'],
  [/\bDownload the file\b/gi, 'Descarga el archivo'],
  [/\bDownload the latest version\b/gi, 'Descarga la versión más reciente'],
  [/\bThis means that\b/gi, 'Esto significa que'],
  [/\bThis allows us to\b/gi, 'Esto nos permite'],
  [/\bThis enables us to\b/gi, 'Esto nos facilita'],
  [/\bIn order to\b/gi, 'Con el fin de'],
  [/\bAs a result,?\s*/gi, 'Como resultado, '],
  [/\bAt this point,?\s*/gi, 'En este punto, '],
  [/\bOnce completed,?\s*/gi, 'Una vez completado, '],
  [/\bOnce done,?\s*/gi, 'Una vez finalizado, '],
  [/\bAfter that,?\s*/gi, 'Posteriormente, '],

  // Security & CTF specific vocabulary in sentences
  [/\bInitial scan reveals\b/gi, 'El escaneo inicial revela'],
  [/\bInitial reconnaissance shows\b/gi, 'El reconocimiento inicial muestra'],
  [/\bThe open ports are(?=(?:\*\*)?\s*:)/gi, 'Los puertos abiertos son'],
  [/\bOpen ports(?=(?:\*\*)?\s*:)/gi, 'Puertos abiertos'],
  [/\bWe discover that\b/gi, 'Descubrimos que'],
  [/\bWe found that\b/gi, 'Encontramos que'],
  [/\bWe found a vulnerability in\b/gi, 'Encontramos una vulnerabilidad en'],
  [/\bVulnerable to\b/gi, 'Vulnerable a'],
  [/\bLooking at the source code,?\s*/gi, 'Revisando el código fuente, '],
  [/\bInspecting the source code,?\s*/gi, 'Inspeccionando el código fuente, '],
  [/\bAnalyzing the response,?\s*/gi, 'Analizando la respuesta, '],
  [/\bSending the payload\b/gi, 'Enviando el payload'],
  [/\bWe get a shell as\b/gi, 'Obtenemos una shell como'],
  [/\bWe obtain a shell as\b/gi, 'Obtenemos una shell como'],
  [/\bWe can now elevate privileges\b/gi, 'Ahora podemos elevar privilegios'],
  [/\bChecking sudo privileges\b/gi, 'Comprobando privilegios de sudo'],
  [/\bChecking SUID binaries\b/gi, 'Comprobando binarios SUID'],
  [/\bListing running processes\b/gi, 'Listando procesos en ejecución'],
  [/\bWe capture the flag(?=(?:\*\*)?\s*:)/gi, 'Capturamos la flag'],
  [/\bCaptured flag(?=(?:\*\*)?\s*:)/gi, 'Flag capturada'],
  [/\bTarget Machine(?=(?:\*\*)?\s*:)/gi, 'Máquina Objetivo'],
  [/\bOperating System(?=(?:\*\*)?\s*:)/gi, 'Sistema Operativo'],
  [/\bDifficulty(?=(?:\*\*)?\s*:)/gi, 'Dificultad'],
  [/(Dificultad:\s*(?:\*\*)?\s*)Easy\b/gi, '$1Fácil'],
  [/(Dificultad:\s*(?:\*\*)?\s*)Medium\b/gi, '$1Media'],
  [/(Dificultad:\s*(?:\*\*)?\s*)Hard\b/gi, '$1Difícil'],
  [/(Dificultad:\s*(?:\*\*)?\s*)Insane\b/gi, '$1Extrema'],

  // Common multi-word expressions (safe anywhere in prose)
  [/\bTable of Contents\b/gi, 'Índice de Contenidos'],
  [/\bDefault value\b/gi, 'Valor por defecto'],
  [/\bError handling\b/gi, 'Gestión de errores'],
  [/\bBest Practices\b/gi, 'Mejores Prácticas'],
  [/\bSecurity considerations\b/gi, 'Consideraciones de seguridad'],
  [/\bStep by step\b/gi, 'Paso a paso'],

  // Single words are only translated when used as a label / heading / table cell,
  // never inside sentences ("hard drive", "the default shell"...)
  label('Requirements', 'Requisitos'),
  label('Description', 'Descripción'),
  label('Parameters', 'Parámetros'),
  label('Parameter', 'Parámetro'),
  label('Default', 'Por defecto'),
  label('Optional', 'Opcional'),
  label('Required', 'Obligatorio'),
  label('Output', 'Salida'),
  label('Input', 'Entrada'),
  label('Response', 'Respuesta'),
  label('Success', 'Éxito'),
  label('Failure', 'Fallo'),
  label('Example', 'Ejemplo'),
  label('Examples', 'Ejemplos'),
  label('Note', 'Nota'),
  label('Notes', 'Notas'),
  label('Warning', 'Advertencia'),
  label('Usage', 'Uso'),
  label('Name', 'Nombre'),
  label('Type', 'Tipo'),
  label('Value', 'Valor'),
  label('Version', 'Versión'),
  label('Status', 'Estado'),
  label('Date', 'Fecha'),
  label('Author', 'Autor'),
];

export interface TranslationStats {
  codeBlocksPreserved: number;
  inlineCodesPreserved: number;
  linksPreserved: number;
  headingsTranslated: number;
}

export type TranslationEngine = 'browser' | 'bergamot' | 'dictionary';

export interface TranslationResult {
  translated: string;
  engine: TranslationEngine;
  stats: TranslationStats;
}

/** Keeps the capitalisation of the original match ("in order to" -> "con el fin de") */
function matchCase(original: string, replacement: string): string {
  const first = original.charAt(0);
  if (first && first === first.toLowerCase() && first !== first.toUpperCase()) {
    return replacement.charAt(0).toLowerCase() + replacement.slice(1);
  }
  return replacement;
}

interface MaskedMarkdown {
  text: string;
  tokens: string[];
  stats: Omit<TranslationStats, 'headingsTranslated'>;
}

const TOKEN_RE = /⟦(\d+)⟧/g;
const token = (idx: number) => `⟦${idx}⟧`;

/**
 * Replaces every part of the document that must never be translated
 * (code, URLs, HTML, image/link targets, callout tags, front matter) by tokens.
 */
/**
 * Security / CTF jargon that machine translation engines tend to mangle
 * ("Writeup" -> "Escribir"). Only protected for the neural engines.
 */
const MT_PRESERVED_TERMS =
  /\b(?:write-?ups?|hack ?the ?box|htb|tryhackme|thm|vulnhub|ctfs?|nmap|burp(?: suite)?|metasploit|msfconsole|msfvenom|gobuster|ffuf|feroxbuster|dirb(?:uster)?|sqlmap|hydra|hashcat|john the ripper|netcat|wireshark|linpeas|winpeas|bloodhound|mimikatz|impacket|crackmapexec|evil-winrm|kali(?: linux)?|parrot ?os|reverse shells?|bind shells?|web ?shells?|payloads?|pentest(?:ing|er)?s?|pwned|privesc|suid|sudoers|cron ?jobs?)\b/gi;

function maskUntranslatable(input: string, preserveTerms = false): MaskedMarkdown {
  const tokens: string[] = [];
  const stats = { codeBlocksPreserved: 0, inlineCodesPreserved: 0, linksPreserved: 0 };
  const keep = (value: string) => {
    tokens.push(value);
    return token(tokens.length - 1);
  };

  let text = input.replace(/\r\n?/g, '\n');

  // YAML front matter
  text = text.replace(/^---\n[\s\S]*?\n---(?=\n|$)/, (m) => keep(m));

  // Fenced code blocks (``` and ~~~, any length >= 3)
  text = text.replace(/^([ \t]*)(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:\n[ \t]*\2[`~]*[ \t]*(?=\n|$)|$(?![\s\S]))/gm, (m) => {
    stats.codeBlocksPreserved++;
    return keep(m);
  });

  // Indented code blocks (4 spaces / tab after a blank line, outside lists)
  text = text.replace(/(^|\n\n)((?:(?: {4}|\t)[^\n]*(?:\n|$))+)/g, (m, lead, block) => {
    stats.codeBlocksPreserved++;
    return lead + keep(block.replace(/\n$/, '')) + (block.endsWith('\n') ? '\n' : '');
  });

  // Inline code (single or multiple backticks)
  text = text.replace(/(`+)(?!`)[\s\S]*?[^`]\1(?!`)/g, (m) => {
    stats.inlineCodesPreserved++;
    return keep(m);
  });

  // HTML comments and tags
  text = text.replace(/<!--[\s\S]*?-->/g, (m) => keep(m));
  text = text.replace(/<\/?[A-Za-z][^<>\n]*>/g, (m) => keep(m));

  // Images are kept whole; links keep their text translatable and their target protected
  text = text.replace(/!\[[^\]\n]*\]\((?:[^()\s]|\([^()\s]*\))*(?:\s+"[^"]*")?\)/g, (m) => {
    stats.linksPreserved++;
    return keep(m);
  });
  text = text.replace(/(\[[^\]\n]*\])(\((?:[^()\s]|\([^()\s]*\))*(?:\s+"[^"]*")?\))/g, (_m, label, target) => {
    stats.linksPreserved++;
    return label + keep(target);
  });
  // Reference-style link definitions
  text = text.replace(/^ {0,3}\[[^\]\n]+\]:\s*\S+.*$/gm, (m) => keep(m));

  // Bare URLs, e-mails, CTF flags and callout tags
  text = text.replace(/\b(?:https?|ftp):\/\/(?:[^\s<>()[\]]|\([^\s()]*\))+/g, (m) => {
    const trailing = m.match(/[.,;:!?'"]+$/)?.[0] || '';
    return keep(m.slice(0, m.length - trailing.length)) + trailing;
  });
  text = text.replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, (m) => keep(m));
  text = text.replace(/\b[A-Za-z0-9_]{2,}\{[^}\n]*\}/g, (m) => keep(m));
  text = text.replace(/\[![A-Z]+\]/g, (m) => keep(m));

  if (preserveTerms) text = text.replace(MT_PRESERVED_TERMS, (m) => keep(m));

  return { text, tokens, stats };
}

function unmask(text: string, tokens: string[]): string {
  // Tokens may be nested (a code block containing a URL token is not possible, but be safe)
  let out = text;
  for (let pass = 0; pass < 3 && TOKEN_RE.test(out); pass++) {
    TOKEN_RE.lastIndex = 0;
    out = out.replace(TOKEN_RE, (_m, idx) => tokens[parseInt(idx, 10)] ?? '');
  }
  TOKEN_RE.lastIndex = 0;
  return out;
}

/** Rule-based translation of already-masked text */
function applyDictionary(text: string): { text: string; headingsTranslated: number } {
  let headingsTranslated = 0;
  for (const [pattern, replacement] of TRANSLATION_MAP) {
    pattern.lastIndex = 0;
    const isHeading = pattern.source.startsWith('^#');
    text = text.replace(pattern, (...args) => {
      const match = args[0] as string;
      // Expand $1, $2... from the capture groups
      const groups = args.slice(1, -2) as (string | undefined)[];
      const expanded = replacement.replace(/\$(\d)/g, (_m, n) => groups[parseInt(n, 10) - 1] ?? '');
      if (isHeading) headingsTranslated++;
      return /^\$\d/.test(replacement) ? expanded : matchCase(match, expanded);
    });
  }

  // Sentence connectives (only at the start of a sentence: capitalised)
  text = text
    .replace(/\bHowever,?\s+/g, 'Sin embargo, ')
    .replace(/\bFurthermore,?\s+/g, 'Además, ')
    .replace(/\bMoreover,?\s+/g, 'Por otra parte, ')
    .replace(/\bTherefore,?\s+/g, 'Por lo tanto, ')
    .replace(/\bAdditionally,?\s+/g, 'Adicionalmente, ')
    .replace(/\bFor example,?\s+/g, 'Por ejemplo, ')
    .replace(/\bSuch as\b/g, 'Tal como')
    .replace(/\bIn addition,?\s+/g, 'Además, ')
    .replace(/\bIn conclusion,?\s+/g, 'En conclusión, ')
    .replace(/\bIn summary,?\s+/g, 'En resumen, ')
    .replace(/\bAccording to\b/g, 'Según')
    .replace(/\bBased on\b/g, 'En base a')
    .replace(/\bDue to\b/g, 'Debido a')
    .replace(/\bBecause of\b/g, 'A causa de')
    .replace(/\bAs well as\b/g, 'Así como');

  return { text, headingsTranslated };
}

/**
 * Synchronous dictionary-based translation (partial: headings, common
 * technical phrases and labels). Kept for offline use and as a fallback.
 */
export function translateMarkdownEnToEs(input: string): {
  translated: string;
  stats: TranslationStats;
} {
  const masked = maskUntranslatable(input);
  const { text, headingsTranslated } = applyDictionary(masked.text);
  return {
    translated: unmask(text, masked.tokens),
    stats: { ...masked.stats, headingsTranslated },
  };
}

// ---------------------------------------------------------------------------
// Browser on-device translator (Chrome Translator API)
// ---------------------------------------------------------------------------

interface BrowserTranslator {
  translate(input: string): Promise<string>;
  destroy?: () => void;
}

interface BrowserTranslatorFactory {
  availability(options: { sourceLanguage: string; targetLanguage: string }): Promise<string>;
  create(options: {
    sourceLanguage: string;
    targetLanguage: string;
    monitor?: (m: EventTarget) => void;
  }): Promise<BrowserTranslator>;
}

function getTranslatorFactory(): BrowserTranslatorFactory | null {
  const factory = (globalThis as unknown as { Translator?: BrowserTranslatorFactory }).Translator;
  return factory && typeof factory.create === 'function' ? factory : null;
}

export type BrowserTranslatorAvailability = 'available' | 'downloadable' | 'downloading' | 'unavailable';

/** Whether the browser can translate EN -> ES locally (Chrome 138+ desktop) */
export async function getBrowserTranslatorAvailability(): Promise<BrowserTranslatorAvailability> {
  const factory = getTranslatorFactory();
  if (!factory) return 'unavailable';
  try {
    const status = await factory.availability({ sourceLanguage: 'en', targetLanguage: 'es' });
    return (['available', 'downloadable', 'downloading'].includes(status) ? status : 'unavailable') as BrowserTranslatorAvailability;
  } catch {
    return 'unavailable';
  }
}

/** A line split into its Markdown prefix (heading, list, quote...) and translatable content */
const LINE_PREFIX_RE = /^(\s*(?:>\s*)*(?:#{1,6}\s+|[-*+]\s+(?:\[[ xX]\]\s+)?|\d{1,9}[.)]\s+)?)([\s\S]*)$/;

function hasTranslatableText(segment: string): boolean {
  const withoutTokens = segment.replace(TOKEN_RE, ' ');
  TOKEN_RE.lastIndex = 0;
  return /[A-Za-z]{2,}/.test(withoutTokens);
}

/**
 * Translates every prose segment of the masked document with `translateSegment`.
 * Segments: each line's content after its Markdown prefix, and each table cell.
 * A segment whose tokens are lost or altered by the engine falls back to the dictionary.
 */
async function translateSegments(
  maskedText: string,
  translateSegment: (segment: string) => Promise<string>,
  onProgress?: (done: number, total: number) => void,
  concurrency = 1
): Promise<string> {
  const lines = maskedText.split('\n');
  type Job = { line: number; cell?: number; prefix: string; content: string; suffix: string };
  const jobs: Job[] = [];

  lines.forEach((line, idx) => {
    if (!line.trim()) return;
    // Table rows: translate each cell; separator rows are skipped
    if (/^\s*\|.*\|\s*$/.test(line)) {
      if (/^\s*\|?(\s*:?-{2,}:?\s*\|)+\s*$/.test(line)) return;
      line.split('|').forEach((cell, cellIdx) => {
        const m = cell.match(/^(\s*)([\s\S]*?)(\s*)$/)!;
        if (hasTranslatableText(m[2])) jobs.push({ line: idx, cell: cellIdx, prefix: m[1], content: m[2], suffix: m[3] });
      });
      return;
    }
    const m = line.match(LINE_PREFIX_RE)!;
    const content = m[2].replace(/\s+$/, '');
    if (hasTranslatableText(content)) {
      jobs.push({ line: idx, prefix: m[1], content, suffix: m[2].slice(content.length) });
    }
  });

  // Translate each distinct segment once (several in flight for batching engines)
  const unique = [...new Set(jobs.map((j) => j.content))];
  const results = new Map<string, string>();
  let done = 0;
  onProgress?.(0, unique.length);

  const translateOne = async (content: string) => {
    let translated: string;
    try {
      const candidate = (await translateSegment(content)).trim();
      const expected = (content.match(TOKEN_RE) || []).sort().join();
      const received = (candidate.match(TOKEN_RE) || []).sort().join();
      TOKEN_RE.lastIndex = 0;
      translated = candidate && expected === received ? candidate : applyDictionary(content).text;
    } catch {
      translated = applyDictionary(content).text;
    }
    results.set(content, translated);
    done++;
    onProgress?.(done, unique.length);
  };

  let next = 0;
  const runners = Array.from({ length: Math.max(1, Math.min(concurrency, unique.length)) }, async () => {
    while (next < unique.length) await translateOne(unique[next++]);
  });
  await Promise.all(runners);

  const cells = new Map<number, string[]>();
  for (const job of jobs) {
    const translated = results.get(job.content) ?? job.content;
    if (job.cell !== undefined) {
      const parts = cells.get(job.line) || lines[job.line].split('|');
      parts[job.cell] = job.prefix + translated + job.suffix;
      cells.set(job.line, parts);
    } else {
      lines[job.line] = job.prefix + translated + job.suffix;
    }
  }

  for (const [lineIdx, parts] of cells) lines[lineIdx] = parts.join('|');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Bergamot (Firefox Translations engine, WebAssembly) helpers
// ---------------------------------------------------------------------------

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const unescapeHtml = (text: string) =>
  text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');

/**
 * Bergamot keeps HTML markup in place while translating, so protected tokens,
 * link labels and emphasis are sent as tags instead of plain-text markers.
 */
function segmentToHtml(segment: string): string {
  let html = escapeHtml(segment);
  html = html.replace(/\[([^\]\n]*)\]\u27E6(\d+)\u27E7/g, '<a data-t="$2">$1</a>');
  html = html.replace(TOKEN_RE, '<img data-t="$1">');
  TOKEN_RE.lastIndex = 0;
  html = html.replace(/\*\*(?=\S)([^*\n]+?)\*\*/g, '<b>$1</b>');
  html = html.replace(/(^|[^*\w])\*(?=\S)([^*\n]+?)\*(?![*\w])/g, '$1<em>$2</em>');
  return html;
}

/** Restores the whitespace that surrounded each protected token in the source segment */
function restoreTokenSpacing(source: string, translated: string): string {
  let out = translated;
  for (const match of source.matchAll(/\u27E6(\d+)\u27E7/g)) {
    const tok = match[0];
    const at = match.index ?? 0;
    const spaceBefore = at > 0 && /\s/.test(source[at - 1]);
    const spaceAfter = /\s/.test(source[at + tok.length] || '');
    const idx = out.indexOf(tok);
    if (idx === -1) continue;
    const after = out[idx + tok.length] || '';
    if (spaceAfter && after && !/[\s.,;:!?)\]]/.test(after)) {
      out = out.slice(0, idx + tok.length) + ' ' + out.slice(idx + tok.length);
    }
    const before = out[idx - 1] || '';
    if (spaceBefore && before && !/[\s(\[]/.test(before)) {
      out = out.slice(0, idx) + ' ' + out.slice(idx);
    }
  }
  return out;
}

function htmlToSegment(html: string): string {
  let text = html
    .replace(/<a\s+data-t="(\d+)"\s*>([\s\S]*?)<\/a>/g, (_m, idx, label) => `[${label.trim()}]${token(+idx)}`)
    .replace(/<img\s+data-t="(\d+)"\s*\/?>/g, (_m, idx) => token(+idx))
    .replace(/<b>(\s*)([\s\S]*?)(\s*)<\/b>/g, '$1**$2**$3')
    .replace(/<em>(\s*)([\s\S]*?)(\s*)<\/em>/g, '$1*$2*$3');
  // Any other markup means the engine mangled the structure: reject the segment
  if (/<\/?[a-z][^>]*>/i.test(text)) return '';
  text = unescapeHtml(text);
  return text;
}

async function translateWithBergamot(input: string, options: TranslateOptions): Promise<TranslationResult> {
  const { prepareBergamot, bergamotTranslateHtml } = await import('./bergamotTranslator');
  options.onStatus?.('Cargando el motor de traducción local...');
  await prepareBergamot(options.onStatus);
  const masked = maskUntranslatable(input, true);
  const text = await translateSegments(
    masked.text,
    async (segment) => restoreTokenSpacing(segment, htmlToSegment(await bergamotTranslateHtml(segmentToHtml(segment)))),
    options.onProgress,
    32
  );
  return {
    translated: unmask(text, masked.tokens),
    engine: 'bergamot',
    stats: { ...masked.stats, headingsTranslated: 0 },
  };
}

export interface TranslateOptions {
  /**
   * 'auto': browser built-in translator (Chrome) -> Bergamot WebAssembly engine
   * (Firefox and others) -> dictionary.
   */
  engine?: 'auto' | 'bergamot' | 'dictionary';
  onProgress?: (done: number, total: number) => void;
  /** Status messages, e.g. while the browser downloads its language model */
  onStatus?: (message: string) => void;
}

/**
 * Creates the browser translator. If the language model must be downloaded first,
 * gives up when the download makes no progress for `idleMs` (offline, blocked...).
 */
function createBrowserTranslator(
  factory: BrowserTranslatorFactory,
  onStatus?: (message: string) => void,
  idleMs = 15000
): Promise<BrowserTranslator> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout>;
    const armTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        settled = true;
        reject(new Error('Browser translator model download timed out'));
      }, idleMs);
    };
    armTimer();

    factory
      .create({
        sourceLanguage: 'en',
        targetLanguage: 'es',
        monitor(m) {
          m.addEventListener('downloadprogress', (e) => {
            armTimer();
            const loaded = (e as Event & { loaded?: number }).loaded ?? 0;
            onStatus?.(`Descargando modelo de traducción del navegador... ${Math.round(loaded * 100)}%`);
          });
        },
      })
      .then(
        (translator) => {
          clearTimeout(timer);
          if (settled) translator.destroy?.();
          else resolve(translator);
          settled = true;
        },
        (err) => {
          clearTimeout(timer);
          settled = true;
          reject(err);
        }
      );
  });
}

/**
 * Translates Markdown EN -> ES with the best local engine available.
 * Never sends text to external services.
 */
export async function translateMarkdown(input: string, options: TranslateOptions = {}): Promise<TranslationResult> {
  const engine = options.engine || 'auto';
  const factory = engine === 'auto' ? getTranslatorFactory() : null;
  const availability = factory ? await getBrowserTranslatorAvailability() : 'unavailable';

  if (factory && availability !== 'unavailable') {
    let translator: BrowserTranslator | null = null;
    try {
      translator = await createBrowserTranslator(factory, options.onStatus);
      const masked = maskUntranslatable(input, true);
      const browserTranslator = translator;
      const text = await translateSegments(masked.text, (segment) => browserTranslator.translate(segment), options.onProgress);
      return {
        translated: unmask(text, masked.tokens),
        engine: 'browser',
        stats: { ...masked.stats, headingsTranslated: 0 },
      };
    } catch (err) {
      console.warn('Browser translator failed, trying the WebAssembly engine:', err);
    } finally {
      translator?.destroy?.();
    }
  }

  if (engine !== 'dictionary') {
    const { isBergamotSupported } = await import('./bergamotTranslator');
    if (isBergamotSupported()) {
      try {
        return await translateWithBergamot(input, options);
      } catch (err) {
        console.warn('Bergamot translator failed, using dictionary fallback:', err);
      }
    }
  }

  const result = translateMarkdownEnToEs(input);
  return { ...result, engine: 'dictionary' };
}
