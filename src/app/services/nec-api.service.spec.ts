// src/app/services/nec-api.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NecApiService } from './nec-api.service';

describe('NecApiService', () => {
  let service: NecApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(NecApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getArticles() calls GET /api/articles', () => {
    service.getArticles().subscribe(articles => {
      expect(articles.length).toBe(1);
      expect(articles[0].id).toBe('100');
    });
    http.expectOne('/api/articles').flush([
      { id: '100', number: '100', title: 'Definitions', sectionCount: 2 }
    ]);
  });

  it('getArticle(id) calls GET /api/articles/:id', () => {
    service.getArticle('100').subscribe(article => {
      expect(article.id).toBe('100');
    });
    http.expectOne('/api/articles/100').flush(
      { id: '100', number: '100', title: 'Definitions', sectionCount: 0, sections: [] }
    );
  });

  it('search(q) calls GET /api/search with q param', () => {
    service.search('branch circuit').subscribe(results => {
      expect(results).toEqual([]);
    });
    http.expectOne('/api/search?q=branch%20circuit').flush([]);
  });
});
