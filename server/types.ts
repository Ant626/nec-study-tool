// server/types.ts
export interface NecSection {
  id: string;
  articleId: string;
  sectionNumber: string;
  sectionTitle: string;
  content: string;
  pageStart: number;
}

export interface NecArticle {
  id: string;
  number: string;
  title: string;
  sections: NecSection[];
}

export interface ArticleSummary {
  id: string;
  number: string;
  title: string;
  sectionCount: number;
}

export interface SearchResult {
  id: string;
  articleId: string;
  sectionNumber: string;
  sectionTitle: string;
  snippet: string;
  score: number;
}
