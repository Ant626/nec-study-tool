// server/pdf.service.ts
import { readFile } from 'node:fs/promises';
import type { NecArticle, NecSection } from './types';

// pdfjs-dist checks for DOMMatrix at module load time — stub it for Node.js 18.
if (typeof (globalThis as Record<string, unknown>)['DOMMatrix'] === 'undefined') {
  (globalThis as Record<string, unknown>)['DOMMatrix'] = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    constructor(_init?: unknown) {}
  };
}

const ARTICLE_RE = /^ARTICLE\s+(\d+)\s*[–\-—]?\s*(.*)/i;
const SECTION_RE = /^(\d{2,4}\.\d+[A-Z]?)\s+(.*)/;

export function reconstructPageText(
  items: Array<{ str: string; transform: number[]; hasEOL: boolean }>,
  pageHeight: number
): string {
  const HEADER_THRESHOLD = pageHeight * 0.92;
  const FOOTER_THRESHOLD = pageHeight * 0.05;
  const Y_TOLERANCE = 2;

  const filtered = items.filter(item => {
    if (!item.str.trim()) return false;
    const y = item.transform[5];
    return y >= FOOTER_THRESHOLD && y <= HEADER_THRESHOLD;
  });

  const lineMap = new Map<number, Array<{ str: string; x: number }>>();
  for (const item of filtered) {
    const y = item.transform[5];
    const x = item.transform[4];
    let nearest: number | undefined;
    let nearestDist = Infinity;
    for (const key of lineMap.keys()) {
      const dist = Math.abs(key - y);
      if (dist <= Y_TOLERANCE && dist < nearestDist) { nearest = key; nearestDist = dist; }
    }
    const lineKey = nearest ?? y;
    if (!lineMap.has(lineKey)) lineMap.set(lineKey, []);
    lineMap.get(lineKey)!.push({ str: item.str, x });
  }

  return Array.from(lineMap.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([, lineItems]) =>
      lineItems.sort((a, b) => a.x - b.x).map(i => i.str).join('')
    )
    .join('\n');
}

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
        currentArticle = articleMap.get(id)!;
      } else {
        currentArticle = { id, number: id, title: articleMatch[2].trim() || 'Unknown', sections: [] };
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
        id: sectionMatch[1], articleId: currentArticle.id,
        sectionNumber: sectionMatch[1], sectionTitle: sectionMatch[2].trim(),
        content: '', pageStart: 0
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
      const text = await this.extractText(buffer);
      this.articles = parseNecText(text);
      console.log(`[PdfService] Loaded ${this.articles.length} articles`);
    } catch (err) {
      throw new Error(`[PdfService] Failed to load PDF at "${pdfPath}": ${(err as Error).message}`);
    }
  }

  private async extractText(buffer: Buffer): Promise<string> {
    const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    GlobalWorkerOptions.workerSrc = '';

    const loadingTask = getDocument({ data: new Uint8Array(buffer), disableFontFace: true, verbosity: 0 });
    const pdf = await loadingTask.promise;

    const pageTexts: string[] = [];
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      const textContent = await page.getTextContent();
      pageTexts.push(reconstructPageText(textContent.items as Array<{ str: string; transform: number[]; hasEOL: boolean }>, viewport.height));
      page.cleanup();
    }

    await pdf.destroy();
    return pageTexts.join('\n');
  }

  getArticles(): NecArticle[] { return this.articles; }
  getArticle(id: string): NecArticle | undefined { return this.articles.find(a => a.id === id); }
}
