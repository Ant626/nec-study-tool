// src/app/services/nec-api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ArticleSummary {
  id: string;
  number: string;
  title: string;
  sectionCount: number;
}

export interface NecSection {
  id: string;
  articleId: string;
  sectionNumber: string;
  sectionTitle: string;
  content: string;
}

export interface NecArticle extends ArticleSummary {
  sections: NecSection[];
}

export interface SearchResult {
  id: string;
  articleId: string;
  sectionNumber: string;
  sectionTitle: string;
  snippet: string;
  score: number;
}

@Injectable({ providedIn: 'root' })
export class NecApiService {
  private readonly base = '/api';

  constructor(private http: HttpClient) {}

  getArticles(): Observable<ArticleSummary[]> {
    return this.http.get<ArticleSummary[]>(`${this.base}/articles`);
  }

  getArticle(id: string): Observable<NecArticle> {
    return this.http.get<NecArticle>(`${this.base}/articles/${id}`);
  }

  search(q: string): Observable<SearchResult[]> {
    return this.http.get<SearchResult[]>(`${this.base}/search`, { params: { q } });
  }
}
