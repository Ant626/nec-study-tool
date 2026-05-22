// server/search.service.ts
import MiniSearch from 'minisearch';
import type { NecArticle, SearchResult } from './types';

interface IndexDoc {
  id: string;
  articleId: string;
  sectionNumber: string;
  sectionTitle: string;
  articleTitle: string;
  content: string;
}

export class SearchService {
  private index = new MiniSearch<IndexDoc>({
    fields: ['sectionNumber', 'sectionTitle', 'articleTitle', 'content'],
    storeFields: ['articleId', 'sectionNumber', 'sectionTitle', 'content'],
    searchOptions: {
      boost: { sectionTitle: 2, sectionNumber: 3, articleTitle: 2 },
      fuzzy: 0.2,
      prefix: true
    }
  });

  build(articles: NecArticle[]): void {
    const docs = articles.flatMap(article =>
      article.sections.map(s => ({
        id: s.id,
        articleId: s.articleId,
        sectionNumber: s.sectionNumber,
        sectionTitle: s.sectionTitle,
        articleTitle: article.title,
        content: s.content.slice(0, 500)
      }))
    );
    this.index.addAll(docs);
  }

  search(query: string, limit = 20): SearchResult[] {
    if (query.trim().length < 2) return [];
    return this.index.search(query, { limit }).map(r => ({
      id: r.id,
      articleId: r['articleId'] as string,
      sectionNumber: r['sectionNumber'] as string,
      sectionTitle: r['sectionTitle'] as string,
      snippet: this.buildSnippet(r['content'] as string, query),
      score: r.score
    }));
  }

  private buildSnippet(content: string, query: string): string {
    const term = query.toLowerCase().split(/\s+/)[0];
    const idx = content.toLowerCase().indexOf(term);
    const start = idx > 60 ? idx - 60 : 0;
    return content.slice(start, start + 220).trim() + '…';
  }
}
