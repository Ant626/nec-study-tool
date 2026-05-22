// server/pdf.service.ts
import { readFileSync } from 'node:fs';
import type { NecArticle, NecSection } from './types';

const ARTICLE_RE = /^ARTICLE\s+(\d+)\s*[–\-—]?\s*(.*)/i;
const SECTION_RE = /^(\d{2,4}\.\d+[A-Z]?)\s+(.*)/;

export function parseNecText(text: string): NecArticle[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const articles: NecArticle[] = [];
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
      if (currentArticle) articles.push(currentArticle);
      currentArticle = {
        id: articleMatch[1],
        number: articleMatch[1],
        title: articleMatch[2].trim() || 'Unknown',
        sections: []
      };
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
  if (currentArticle) articles.push(currentArticle);
  return articles;
}

export class PdfService {
  private articles: NecArticle[] = [];

  async load(pdfPath: string): Promise<void> {
    const pdfParse = (await import('pdf-parse')).default;
    const buffer = readFileSync(pdfPath);
    const data = await pdfParse(buffer);
    this.articles = parseNecText(data.text);
    console.log(`[PdfService] Loaded ${this.articles.length} articles`);
  }

  getArticles(): NecArticle[] { return this.articles; }

  getArticle(id: string): NecArticle | undefined {
    return this.articles.find(a => a.id === id);
  }
}
