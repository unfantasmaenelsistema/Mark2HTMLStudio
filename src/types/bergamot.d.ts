declare module '@browsermt/bergamot-translator/translator.js' {
  export class TranslatorBacking {
    constructor(options?: Record<string, unknown>);
    registry: Promise<unknown>;
    loadModelRegistery(): Promise<unknown>;
    fetch(url: string, checksum?: string, extra?: unknown): Promise<ArrayBuffer>;
  }
  export class BatchTranslator {
    constructor(options?: Record<string, unknown>, backing?: TranslatorBacking);
    translate(request: {
      from: string;
      to: string;
      text: string;
      html: boolean;
    }): Promise<{ target: { text: string } }>;
    delete(): Promise<void>;
  }
}
