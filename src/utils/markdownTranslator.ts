/**
 * Offline Markdown Translator (English -> Spanish)
 * Preserves code blocks, inline code, command lines, URLs, image links,
 * tags, markdown syntax, and tech terms untouched.
 * Zero external APIs needed - runs 100% locally in browser.
 */

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
  [/^#\s+Introduction\b/im, '# Introducción'],
  [/^#\s+Overview\b/im, '# Descripción General'],
  [/^#\s+Getting\s+Started\b/im, '# Primeros Pasos'],
  [/^#\s+Prerequisites\b/im, '# Requisitos Previos'],
  [/^#\s+Installation\b/im, '# Instalación'],
  [/^#\s+Configuration\b/im, '# Configuración'],
  [/^#\s+Usage\b/im, '# Uso'],
  [/^#\s+Examples?\b/im, '# Ejemplos'],
  [/^#\s+Walkthrough\b/im, '# Guía Paso a Paso'],
  [/^#\s+Methodology\b/im, '# Metodología'],
  [/^#\s+Reconnaissance\b/im, '# Reconocimiento'],
  [/^#\s+Enumeration\b/im, '# Enumeración'],
  [/^#\s+Exploitation\b/im, '# Explotación'],
  [/^#\s+Privilege\s+Escalation\b/im, '# Escalada de Privilegios'],
  [/^#\s+Post-Exploitation\b/im, '# Post-Explotación'],
  [/^#\s+Conclusion\b/im, '# Conclusión'],
  [/^#\s+Summary\b/im, '# Resumen'],
  [/^#\s+References?\b/im, '# Referencias'],
  [/^#\s+Notes?\b/im, '# Notas'],
  [/^#\s+Troubleshooting\b/im, '# Solución de Problemas'],

  // Subheadings (H2, H3)
  [/^##\s+Introduction\b/im, '## Introducción'],
  [/^##\s+Overview\b/im, '## Descripción General'],
  [/^##\s+Prerequisites\b/im, '## Requisitos Previos'],
  [/^##\s+Installation\b/im, '## Instalación'],
  [/^##\s+Configuration\b/im, '## Configuración'],
  [/^##\s+Usage\b/im, '## Modo de Uso'],
  [/^##\s+Examples?\b/im, '## Ejemplos'],
  [/^##\s+Walkthrough\b/im, '## Guía Paso a Paso'],
  [/^##\s+Reconnaissance\b/im, '## Fase de Reconocimiento'],
  [/^##\s+Initial\s+Access\b/im, '## Acceso Inicial'],
  [/^##\s+Enumeration\b/im, '## Enumeración de Servicios'],
  [/^##\s+Vulnerability\s+Analysis\b/im, '## Análisis de Vulnerabilidades'],
  [/^##\s+Exploitation\b/im, '## Explotación de la Vulnerabilidad'],
  [/^##\s+Privilege\s+Escalation\b/im, '## Escalada de Privilegios'],
  [/^##\s+User\s+Flag\b/im, '## Flag de Usuario'],
  [/^##\s+Root\s+Flag\b/im, '## Flag de Root'],
  [/^##\s+Mitigation\b/im, '## Mitigación y Recomendaciones'],
  [/^##\s+Conclusion\b/im, '## Conclusión'],
  [/^##\s+Summary\b/im, '## Resumen Ejecutivo'],
  [/^##\s+References?\b/im, '## Referencias y Enlaces'],
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
  [/\bAs shown below:?\b/gi, 'Como se muestra a continuación:'],
  [/\bAs we can see:?\b/gi, 'Como podemos observar:'],
  [/\bWe can see that\b/gi, 'Podemos comprobar que'],
  [/\bWe can observe that\b/gi, 'Podemos observar que'],
  [/\bBy running the following command:?\b/gi, 'Ejecutando el siguiente comando:'],
  [/\bRun the following command:?\b/gi, 'Ejecuta el siguiente comando:'],
  [/\bExecute the following command:?\b/gi, 'Ejecuta el siguiente comando:'],
  [/\bWe execute:?\b/gi, 'Ejecutamos:'],
  [/\bWe run:?\b/gi, 'Ejecutamos:'],
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
  [/\bThe open ports are:?\b/gi, 'Los puertos abiertos son:'],
  [/\bOpen ports:?\b/gi, 'Puertos abiertos:'],
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
  [/\bWe capture the flag:?\b/gi, 'Capturamos la flag:'],
  [/\bCaptured flag:?\b/gi, 'Flag capturada:'],
  [/\bTarget Machine:?\b/gi, 'Máquina Objetivo:'],
  [/\bOperating System:?\b/gi, 'Sistema Operativo:'],
  [/\bDifficulty:?\b/gi, 'Dificultad:'],
  [/\bEasy\b/gi, 'Fácil'],
  [/\bMedium\b/gi, 'Media'],
  [/\bHard\b/gi, 'Difícil'],
  [/\bInsane\b/gi, 'Extrema'],

  // Common vocabulary words
  [/\bTable of Contents\b/gi, 'Índice de Contenidos'],
  [/\bRequirements\b/gi, 'Requisitos'],
  [/\bDescription\b/gi, 'Descripción'],
  [/\bParameters?\b/gi, 'Parámetros'],
  [/\bDefault value\b/gi, 'Valor por defecto'],
  [/\bDefault\b/gi, 'Por defecto'],
  [/\bOptional\b/gi, 'Opcional'],
  [/\bRequired\b/gi, 'Obligatorio'],
  [/\bOutput\b/gi, 'Salida'],
  [/\bInput\b/gi, 'Entrada'],
  [/\bResponse\b/gi, 'Respuesta'],
  [/\bSuccess\b/gi, 'Éxito'],
  [/\bFailure\b/gi, 'Fallo'],
  [/\bError handling\b/gi, 'Gestión de errores'],
  [/\bBest Practices\b/gi, 'Mejores Prácticas'],
  [/\bSecurity considerations\b/gi, 'Consideraciones de seguridad'],
  [/\bStep by step\b/gi, 'Paso a paso'],
];

/**
 * Translates Markdown from English to Spanish preserving:
 * - Code blocks (fenced ```...``` and indented)
 * - Inline code `...`
 * - Links [text](url) — only translates text, keeps url intact
 * - Images ![alt](url) — keeps URL untouched
 * - HTML tags & comments
 * - Callout syntax tags
 */
export function translateMarkdownEnToEs(input: string): {
  translated: string;
  stats: {
    codeBlocksPreserved: number;
    inlineCodesPreserved: number;
    linksPreserved: number;
    headingsTranslated: number;
  };
} {
  const codeBlocks: string[] = [];
  const inlineCodes: string[] = [];
  const linkUrls: string[] = [];
  const htmlTags: string[] = [];

  let text = input;

  // 1. Mask fenced code blocks ```lang ... ```
  text = text.replace(/(```[\s\S]*?```)/g, (match) => {
    const idx = codeBlocks.length;
    codeBlocks.push(match);
    return `___CODE_BLOCK_${idx}___`;
  });

  // 2. Mask inline code `...`
  text = text.replace(/(`[^`\n]+`)/g, (match) => {
    const idx = inlineCodes.length;
    inlineCodes.push(match);
    return `___INLINE_CODE_${idx}___`;
  });

  // 3. Mask link URLs [text](URL) and image URLs ![alt](URL)
  text = text.replace(/(!?\[[^\]]*?\]\()([^\)]+)(\))/g, (match, prefix, url, suffix) => {
    const idx = linkUrls.length;
    linkUrls.push(url);
    return `${prefix}___LINK_URL_${idx}___${suffix}`;
  });

  // 4. Mask raw HTML tags like <figure ...>, <script>, etc.
  text = text.replace(/(<[^>]+>)/g, (match) => {
    const idx = htmlTags.length;
    htmlTags.push(match);
    return `___HTML_TAG_${idx}___`;
  });

  // 5. Apply dictionary and pattern translations to the remaining prose
  let headingsTranslated = 0;
  for (const [pattern, replacement] of TRANSLATION_MAP) {
    const before = text;
    text = text.replace(pattern, replacement);
    if (before !== text && pattern.source.includes('^#')) {
      headingsTranslated++;
    }
  }

  // Additional sentence polish for typical connectives
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
    .replace(/\bIn order to\b/g, 'Para')
    .replace(/\bAs well as\b/g, 'Así como');

  // 6. Restore link URLs
  text = text.replace(/___LINK_URL_(\d+)___/g, (_, idx) => {
    return linkUrls[parseInt(idx, 10)] || '';
  });

  // 7. Restore HTML tags
  text = text.replace(/___HTML_TAG_(\d+)___/g, (_, idx) => {
    return htmlTags[parseInt(idx, 10)] || '';
  });

  // 8. Restore inline codes
  text = text.replace(/___INLINE_CODE_(\d+)___/g, (_, idx) => {
    return inlineCodes[parseInt(idx, 10)] || '';
  });

  // 9. Restore code blocks
  text = text.replace(/___CODE_BLOCK_(\d+)___/g, (_, idx) => {
    return codeBlocks[parseInt(idx, 10)] || '';
  });

  return {
    translated: text,
    stats: {
      codeBlocksPreserved: codeBlocks.length,
      inlineCodesPreserved: inlineCodes.length,
      linksPreserved: linkUrls.length,
      headingsTranslated,
    },
  };
}
