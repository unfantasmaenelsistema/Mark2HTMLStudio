import * as prettier from 'prettier/standalone';
import * as prettierPluginMarkdown from 'prettier/plugins/markdown';

export interface FormatResult {
  formatted: string;
  changed: boolean;
  error?: string;
}

/**
 * Formats and beautifies Markdown text using Prettier standalone with the Markdown plugin.
 * Standardizes:
 * - List indentation and numbering (e.g. nested lists, ordered numbering)
 * - Spacing between headings, paragraphs, and list items
 * - Code fences indentation and spacing
 * - Blockquote formatting and spacing
 * - Table alignment and pipe consistency
 */
export async function formatMarkdown(markdown: string): Promise<FormatResult> {
  if (!markdown || !markdown.trim()) {
    return { formatted: markdown, changed: false };
  }

  try {
    const formatted = await prettier.format(markdown, {
      parser: 'markdown',
      plugins: [prettierPluginMarkdown],
      proseWrap: 'preserve',
      tabWidth: 2,
      useTabs: false,
    });

    const changed = formatted !== markdown;
    return {
      formatted,
      changed,
    };
  } catch (err: unknown) {
    console.error('Error formatting markdown with prettier:', err);
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido al formatear';
    return {
      formatted: markdown,
      changed: false,
      error: errorMessage,
    };
  }
}
