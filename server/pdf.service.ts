// server/pdf.service.ts
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import type { NecArticle, NecSection } from './types';

const _require = createRequire(import.meta.url);

// pdfjs-dist (bundled inside pdf-parse) checks for DOMMatrix at load time.
// Provide a minimal stub so it doesn't throw in Node.js 18.
if (typeof (globalThis as Record<string, unknown>)['DOMMatrix'] === 'undefined') {
  (globalThis as Record<string, unknown>)['DOMMatrix'] = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    constructor(_init?: unknown) {}
  };
}

const ARTICLE_RE = /^ARTICLE\s+(\d+)\s*[–\-—]?\s*(.*)/i;
const SECTION_RE = /^(\d{2,4}\.\d+[A-Z]?)\s+(.*)/;

export function parseNecText(text: string): NecArticle[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const articleMap = new Map<string, NecArticle>();
  const articleOrder: string[] = [];
  let currentArticle: NecArticle | null = null;
  let currentSection: NecSection | null = null;
  const contentBuffer: string[] = [];

  function flushSection(): void {
    if (currentSection && currentArticle) {
      currentSection.content = contentBuffer.join(' ').trim();
      currentArticle.sections.push({ ...currentSection });
      contentBuffer.length = 0;
      currentSection = null;
    }
  }

  for (const line of lines) {
    const articleMatch = line.match(ARTICLE_RE);
    if (articleMatch) {
      flushSection();
      const id = articleMatch[1];
      if (articleMap.has(id)) {
        // Page headers repeat article numbers — merge into existing article
        currentArticle = articleMap.get(id)!;
      } else {
        currentArticle = {
          id,
          number: id,
          title: articleMatch[2].trim() || 'Unknown',
          sections: []
        };
        articleMap.set(id, currentArticle);
        articleOrder.push(id);
      }
      continue;
    }

    if (!currentArticle) continue;

    const sectionMatch = line.match(SECTION_RE);
    if (sectionMatch && sectionMatch[1].startsWith(currentArticle.id + '.')) {
      flushSection();
      currentSection = {
        id: sectionMatch[1],
        articleId: currentArticle.id,
        sectionNumber: sectionMatch[1],
        sectionTitle: sectionMatch[2].trim(),
        content: '',
        pageStart: 0
      };
      continue;
    }

    if (currentSection) contentBuffer.push(line);
  }

  flushSection();
  return articleOrder.map(id => articleMap.get(id)!);
}

export class PdfService {
  private articles: NecArticle[] = [];

  async load(pdfPath: string): Promise<void> {
    try {
      const buffer = await readFile(pdfPath);
      type PdfParseV2 = { PDFParse: new (opts: { data: Uint8Array }) => { getText: () => Promise<{ text: string }> } };
      const { PDFParse } = _require('pdf-parse') as PdfParseV2;
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      this.articles = parseNecText(result.text);
      console.log(`[PdfService] Loaded ${this.articles.length} articles`);
    } catch (err) {
      throw new Error(`[PdfService] Failed to load PDF at "${pdfPath}": ${(err as Error).message}`);
    }
  }

  getArticles(): NecArticle[] { return this.articles; }

  getArticle(id: string): NecArticle | undefined {
    return this.articles.find(a => a.id === id);
  }
}
