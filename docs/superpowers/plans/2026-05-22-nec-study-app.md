# NEC Study App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local NEC Study App with an Express backend that parses a bundled PDF into Articles/Sections at startup and serves a REST API, consumed by an Angular Material frontend with Article/Section browse and keyword search views.

**Architecture:** Angular 17 SSR's built-in Express server (`server.ts`) pre-indexes the NEC PDF using `pdf-parse` on startup, builds a `MiniSearch` keyword index in memory, and serves REST API endpoints at `/api/*`. Angular standalone components consume the API via `HttpClient`. No external services required — everything runs locally.

**Tech Stack:** Angular 17 (standalone components), Angular Material 17, Express 4, pdf-parse, MiniSearch 7, Vitest (server unit tests), Jasmine/Karma (Angular tests)

---

## File Map

**Create:**
- `server/types.ts` — shared NEC data interfaces
- `server/pdf.service.ts` — PDF loading and NEC structure parsing
- `server/pdf.service.spec.ts` — Vitest tests for the parser
- `server/search.service.ts` — MiniSearch index wrapper
- `server/search.service.spec.ts` — Vitest tests for search
- `server/api.routes.ts` — Express Router with `/api/*` endpoints
- `server/api.routes.spec.ts` — Vitest + supertest tests for API
- `vitest.config.ts` — Vitest config pointing at server specs
- `src/app/services/nec-api.service.ts` — Angular HTTP client service
- `src/app/services/nec-api.service.spec.ts` — Jasmine test
- `src/app/components/browse/browse.component.ts` — Article/Section browser
- `src/app/components/browse/browse.component.html`
- `src/app/components/browse/browse.component.css`
- `src/app/components/browse/browse.component.spec.ts`
- `src/app/components/search/search.component.ts` — Keyword search UI
- `src/app/components/search/search.component.html`
- `src/app/components/search/search.component.css`
- `src/app/components/search/search.component.spec.ts`

**Modify:**
- `server.ts` — initialize services, load PDF, register `/api` routes
- `src/app/app.config.ts` — add `provideHttpClient`, `provideAnimationsAsync`
- `src/app/app.component.ts` — Material toolbar shell
- `src/app/app.component.html` — nav + router outlet
- `src/app/app.component.css` — toolbar spacer + active-link style
- `src/app/app.routes.ts` — browse and search lazy routes
- `src/styles.css` — Material theme import
- `package.json` — add `test:server` script

**Place (user action):**
- `src/assets/nec-book.pdf` — user copies their NEC PDF here before running

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install server runtime dependencies**

```bash
cd nec-study-app
npm install pdf-parse minisearch
```

Expected: `added N packages` with no errors.

- [ ] **Step 2: Install server dev/test dependencies**

```bash
npm install --save-dev vitest supertest @types/supertest @types/pdf-parse
```

Expected: `added N packages` with no errors.

- [ ] **Step 3: Install Angular Material**

```bash
npm install @angular/material @angular/cdk
```

Expected: `added N packages` with no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add pdf-parse, minisearch, vitest, supertest, angular material"
```

---

### Task 2: Configure Vitest for Server Tests

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Create vitest.config.ts**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['server/**/*.spec.ts'],
  },
});
```

- [ ] **Step 2: Add test:server script to package.json**

In `package.json`, inside `"scripts"`, add:

```json
"test:server": "vitest run",
"test:server:watch": "vitest"
```

- [ ] **Step 3: Verify vitest runs with no test files**

```bash
npm run test:server
```

Expected: exits cleanly — either `No test files found` message or `0 tests passed`. Not an error.

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts package.json
git commit -m "chore: configure vitest for server-side tests"
```

---

### Task 3: Shared Types

**Files:**
- Create: `server/types.ts`

- [ ] **Step 1: Create server/types.ts**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add server/types.ts
git commit -m "feat: add shared NEC data types"
```

---

### Task 4: PDF Service

**Files:**
- Create: `server/pdf.service.ts`
- Create: `server/pdf.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// server/pdf.service.spec.ts
import { describe, it, expect } from 'vitest';
import { parseNecText } from './pdf.service';

const SAMPLE = `
ARTICLE 100 – Definitions
100.1 Scope.
This article contains definitions essential to the application of the NEC.
100.2 Standard Definitions.
Accessible. Admitting close approach; not guarded by locked doors.

ARTICLE 210 – Branch Circuits
210.1 Scope.
This article covers branch circuits except for motor loads.
210.2 Other Articles.
All other applicable articles of the NEC shall apply.
`;

describe('parseNecText', () => {
  it('extracts two articles', () => {
    const articles = parseNecText(SAMPLE);
    expect(articles).toHaveLength(2);
  });

  it('parses article 100 id and title', () => {
    const articles = parseNecText(SAMPLE);
    expect(articles[0].id).toBe('100');
    expect(articles[0].title).toContain('Definition');
  });

  it('extracts sections for article 100', () => {
    const articles = parseNecText(SAMPLE);
    const a100 = articles.find(a => a.id === '100')!;
    expect(a100.sections.length).toBeGreaterThanOrEqual(2);
    expect(a100.sections[0].sectionNumber).toBe('100.1');
    expect(a100.sections[0].content).toContain('definitions');
  });

  it('parses article 210 sections', () => {
    const articles = parseNecText(SAMPLE);
    const a210 = articles.find(a => a.id === '210')!;
    expect(a210.sections.length).toBeGreaterThanOrEqual(1);
    expect(a210.sections[0].sectionNumber).toBe('210.1');
  });

  it('returns empty array for empty text', () => {
    expect(parseNecText('')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npm run test:server
```

Expected: `FAIL` — `parseNecText` is not defined.

- [ ] **Step 3: Implement pdf.service.ts**

```typescript
// server/pdf.service.ts
import pdfParse from 'pdf-parse';
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
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npm run test:server
```

Expected: `5 tests passed`.

- [ ] **Step 5: Commit**

```bash
git add server/pdf.service.ts server/pdf.service.spec.ts
git commit -m "feat: add PDF parsing service with NEC article/section extraction"
```

> **Note:** If your PDF's article headers don't match `ARTICLE NNN – Title`, adjust `ARTICLE_RE` in `pdf.service.ts`. Temporarily log `data.text.slice(0, 3000)` inside `load()` to inspect what the parser sees.

---

### Task 5: Search Service

**Files:**
- Create: `server/search.service.ts`
- Create: `server/search.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// server/search.service.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { SearchService } from './search.service';
import type { NecArticle } from './types';

const MOCK_ARTICLES: NecArticle[] = [
  {
    id: '100', number: '100', title: 'Definitions',
    sections: [{
      id: '100.1', articleId: '100', sectionNumber: '100.1',
      sectionTitle: 'Scope',
      content: 'This article defines essential terms used throughout the code.',
      pageStart: 0
    }]
  },
  {
    id: '210', number: '210', title: 'Branch Circuits',
    sections: [{
      id: '210.1', articleId: '210', sectionNumber: '210.1',
      sectionTitle: 'Scope',
      content: 'Branch circuit requirements for general purpose wiring installations.',
      pageStart: 10
    }]
  }
];

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(() => {
    service = new SearchService();
    service.build(MOCK_ARTICLES);
  });

  it('finds sections matching keyword in content', () => {
    const results = service.search('branch circuit');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].articleId).toBe('210');
  });

  it('finds sections matching keyword in title', () => {
    const results = service.search('Definitions');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].articleId).toBe('100');
  });

  it('returns empty array when query is less than 2 chars', () => {
    expect(service.search('a')).toHaveLength(0);
    expect(service.search('')).toHaveLength(0);
  });

  it('returns results with non-empty snippet', () => {
    const results = service.search('branch');
    expect(results[0].snippet.length).toBeGreaterThan(0);
  });

  it('returns results with a score greater than zero', () => {
    const results = service.search('branch');
    expect(results[0].score).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npm run test:server
```

Expected: `FAIL` — `SearchService` is not defined.

- [ ] **Step 3: Implement search.service.ts**

```typescript
// server/search.service.ts
import MiniSearch from 'minisearch';
import type { NecArticle, SearchResult } from './types';

interface IndexDoc {
  id: string;
  articleId: string;
  sectionNumber: string;
  sectionTitle: string;
  content: string;
}

export class SearchService {
  private index = new MiniSearch<IndexDoc>({
    fields: ['sectionNumber', 'sectionTitle', 'content'],
    storeFields: ['articleId', 'sectionNumber', 'sectionTitle', 'content'],
    searchOptions: {
      boost: { sectionTitle: 2, sectionNumber: 3 },
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
```

- [ ] **Step 4: Run all server tests — confirm they pass**

```bash
npm run test:server
```

Expected: `10 tests passed`.

- [ ] **Step 5: Commit**

```bash
git add server/search.service.ts server/search.service.spec.ts
git commit -m "feat: add MiniSearch keyword search service"
```

---

### Task 6: API Routes

**Files:**
- Create: `server/api.routes.ts`
- Create: `server/api.routes.spec.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// server/api.routes.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createApiRouter } from './api.routes';
import type { PdfService } from './pdf.service';
import type { SearchService } from './search.service';

const MOCK_ARTICLE = { id: '100', number: '100', title: 'Definitions', sections: [] };
const MOCK_RESULT = {
  id: '100.1', articleId: '100', sectionNumber: '100.1',
  sectionTitle: 'Scope', snippet: 'test content here…', score: 1.5
};

const mockPdf = {
  getArticles: vi.fn().mockReturnValue([MOCK_ARTICLE]),
  getArticle: vi.fn().mockImplementation((id: string) =>
    id === '100' ? MOCK_ARTICLE : undefined
  )
} as unknown as PdfService;

const mockSearch = {
  search: vi.fn().mockReturnValue([MOCK_RESULT])
} as unknown as SearchService;

describe('API Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPdf.getArticles = vi.fn().mockReturnValue([MOCK_ARTICLE]);
    mockPdf.getArticle = vi.fn().mockImplementation((id: string) =>
      id === '100' ? MOCK_ARTICLE : undefined
    );
    mockSearch.search = vi.fn().mockReturnValue([MOCK_RESULT]);
    app = express();
    app.use('/api', createApiRouter(mockPdf, mockSearch));
  });

  it('GET /api/articles returns 200 with article list', async () => {
    const res = await request(app).get('/api/articles');
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body[0]).toMatchObject({ id: '100', title: 'Definitions' });
  });

  it('GET /api/articles/:id returns 200 with article detail', async () => {
    const res = await request(app).get('/api/articles/100');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('100');
  });

  it('GET /api/articles/:id returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/articles/999');
    expect(res.status).toBe(404);
  });

  it('GET /api/search returns results array', async () => {
    const res = await request(app).get('/api/search?q=definitions');
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body[0].id).toBe('100.1');
  });

  it('GET /api/search with 1-char query returns empty without calling search', async () => {
    const res = await request(app).get('/api/search?q=a');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
    expect(mockSearch.search).not.toHaveBeenCalled();
  });

  it('GET /api/search with no q param returns empty array', async () => {
    const res = await request(app).get('/api/search');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npm run test:server
```

Expected: `FAIL` — `createApiRouter` is not defined.

- [ ] **Step 3: Implement api.routes.ts**

```typescript
// server/api.routes.ts
import { Router } from 'express';
import type { PdfService } from './pdf.service';
import type { SearchService } from './search.service';

export function createApiRouter(pdfService: PdfService, searchService: SearchService): Router {
  const router = Router();

  router.get('/articles', (_req, res) => {
    const articles = pdfService.getArticles().map(a => ({
      id: a.id,
      number: a.number,
      title: a.title,
      sectionCount: a.sections.length
    }));
    res.json(articles);
  });

  router.get('/articles/:id', (req, res) => {
    const article = pdfService.getArticle(req.params['id']);
    if (!article) { res.status(404).json({ error: 'Article not found' }); return; }
    res.json(article);
  });

  router.get('/search', (req, res) => {
    const q = ((req.query['q'] as string) ?? '').trim();
    if (q.length < 2) { res.json([]); return; }
    res.json(searchService.search(q));
  });

  return router;
}
```

- [ ] **Step 4: Run all server tests — confirm they pass**

```bash
npm run test:server
```

Expected: `16 tests passed`.

- [ ] **Step 5: Commit**

```bash
git add server/api.routes.ts server/api.routes.spec.ts
git commit -m "feat: add Express API routes for articles and search"
```

---

### Task 7: Wire server.ts

**Files:**
- Modify: `server.ts`

- [ ] **Step 1: Replace server.ts with the wired version**

```typescript
// server.ts
import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import bootstrap from './src/main.server';
import { PdfService } from './server/pdf.service';
import { SearchService } from './server/search.service';
import { createApiRouter } from './server/api.routes';

const pdfService = new PdfService();
const searchService = new SearchService();

export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');
  const commonEngine = new CommonEngine();

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  server.use('/api', createApiRouter(pdfService, searchService));

  server.get('*.*', express.static(browserDistFolder, { maxAge: '1y' }));

  server.get('*', (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;
    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: browserDistFolder,
        providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
      })
      .then(html => res.send(html))
      .catch(err => next(err));
  });

  return server;
}

async function run(): Promise<void> {
  const port = process.env['PORT'] ?? 4000;
  const pdfPath = process.env['NEC_PDF_PATH']
    ?? resolve(process.cwd(), 'src', 'assets', 'nec-book.pdf');

  console.log('[server] Loading PDF…');
  await pdfService.load(pdfPath);
  searchService.build(pdfService.getArticles());
  console.log('[server] Index ready.');

  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

run();
```

- [ ] **Step 2: Commit**

```bash
git add server.ts
git commit -m "feat: wire PDF and search services into Express server on startup"
```

---

### Task 8: Update Angular App Config

**Files:**
- Modify: `src/app/app.config.ts`

- [ ] **Step 1: Replace app.config.ts**

```typescript
// src/app/app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideClientHydration } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideClientHydration(),
    provideAnimationsAsync(),
    provideHttpClient(withFetch())
  ]
};
```

- [ ] **Step 2: Commit**

```bash
git add src/app/app.config.ts
git commit -m "feat: configure HttpClient and Angular Material animations"
```

---

### Task 9: Angular API Service

**Files:**
- Create: `src/app/services/nec-api.service.ts`
- Create: `src/app/services/nec-api.service.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
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
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
ng test --include="src/app/services/nec-api.service.spec.ts" --watch=false
```

Expected: error — `NecApiService` not found.

- [ ] **Step 3: Create nec-api.service.ts**

```typescript
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
```

- [ ] **Step 4: Run test — confirm it passes**

```bash
ng test --include="src/app/services/nec-api.service.spec.ts" --watch=false
```

Expected: `3 tests passed`.

- [ ] **Step 5: Commit**

```bash
git add src/app/services/
git commit -m "feat: add NecApiService Angular HTTP client"
```

---

### Task 10: App Shell — Toolbar and Routing

**Files:**
- Modify: `src/app/app.routes.ts`
- Modify: `src/app/app.component.ts`
- Modify: `src/app/app.component.html`
- Modify: `src/app/app.component.css`
- Modify: `src/styles.css`

- [ ] **Step 1: Update app.routes.ts**

```typescript
// src/app/app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'browse',
    loadComponent: () =>
      import('./components/browse/browse.component').then(m => m.BrowseComponent)
  },
  {
    path: 'search',
    loadComponent: () =>
      import('./components/search/search.component').then(m => m.SearchComponent)
  },
  { path: '', redirectTo: '/browse', pathMatch: 'full' }
];
```

- [ ] **Step 2: Update app.component.ts**

```typescript
// src/app/app.component.ts
import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatButtonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {}
```

- [ ] **Step 3: Update app.component.html**

```html
<!-- src/app/app.component.html -->
<mat-toolbar color="primary">
  <span>NEC Study App</span>
  <span class="spacer"></span>
  <a mat-button routerLink="/browse" routerLinkActive="active-link">Browse</a>
  <a mat-button routerLink="/search" routerLinkActive="active-link">Search</a>
</mat-toolbar>
<router-outlet />
```

- [ ] **Step 4: Update app.component.css**

```css
/* src/app/app.component.css */
.spacer { flex: 1 1 auto; }
.active-link { background: rgba(255, 255, 255, 0.15); border-radius: 4px; }
```

- [ ] **Step 5: Replace src/styles.css**

```css
/* src/styles.css */
@import '@angular/material/prebuilt-themes/indigo-pink.css';

html, body { height: 100%; }
body { margin: 0; font-family: Roboto, 'Helvetica Neue', sans-serif; }
```

- [ ] **Step 6: Commit**

```bash
git add src/app/app.component.ts src/app/app.component.html src/app/app.component.css
git add src/app/app.routes.ts src/styles.css
git commit -m "feat: add Material toolbar shell and lazy-loaded routes"
```

---

### Task 11: Browse Component

**Files:**
- Create: `src/app/components/browse/browse.component.ts`
- Create: `src/app/components/browse/browse.component.html`
- Create: `src/app/components/browse/browse.component.css`
- Create: `src/app/components/browse/browse.component.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/app/components/browse/browse.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowseComponent } from './browse.component';
import { NecApiService } from '../../services/nec-api.service';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

const MOCK_ARTICLES = [
  { id: '100', number: '100', title: 'Definitions', sectionCount: 1 }
];
const MOCK_ARTICLE = {
  id: '100', number: '100', title: 'Definitions', sectionCount: 1,
  sections: [{
    id: '100.1', articleId: '100', sectionNumber: '100.1',
    sectionTitle: 'Scope', content: 'Test content here.'
  }]
};

describe('BrowseComponent', () => {
  let component: BrowseComponent;
  let fixture: ComponentFixture<BrowseComponent>;
  let necApi: jasmine.SpyObj<NecApiService>;

  beforeEach(async () => {
    necApi = jasmine.createSpyObj('NecApiService', ['getArticles', 'getArticle']);
    necApi.getArticles.and.returnValue(of(MOCK_ARTICLES));
    necApi.getArticle.and.returnValue(of(MOCK_ARTICLE));

    await TestBed.configureTestingModule({
      imports: [BrowseComponent, NoopAnimationsModule],
      providers: [{ provide: NecApiService, useValue: necApi }]
    }).compileComponents();

    fixture = TestBed.createComponent(BrowseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads articles on init', () => {
    expect(necApi.getArticles).toHaveBeenCalled();
    expect(component.articles.length).toBe(1);
  });

  it('auto-selects first article on init', () => {
    expect(necApi.getArticle).toHaveBeenCalledWith('100');
  });

  it('renders an article list item for each article', () => {
    const items = fixture.nativeElement.querySelectorAll('mat-list-item');
    expect(items.length).toBe(1);
  });

  it('does not reload when the already-selected article id is passed again', () => {
    necApi.getArticle.calls.reset();
    component.selectArticle('100'); // selectedArticle.id is already '100'
    expect(necApi.getArticle).not.toHaveBeenCalled();
  });

  it('populates selectedArticle after load', () => {
    expect(component.selectedArticle?.id).toBe('100');
    expect(component.selectedArticle?.sections.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
ng test --include="src/app/components/browse/browse.component.spec.ts" --watch=false
```

Expected: error — `BrowseComponent` not found.

- [ ] **Step 3: Create browse.component.ts**

```typescript
// src/app/components/browse/browse.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { NecApiService, ArticleSummary, NecArticle } from '../../services/nec-api.service';

@Component({
  selector: 'app-browse',
  standalone: true,
  imports: [CommonModule, MatListModule, MatProgressSpinnerModule, MatDividerModule],
  templateUrl: './browse.component.html',
  styleUrl: './browse.component.css'
})
export class BrowseComponent implements OnInit {
  articles: ArticleSummary[] = [];
  selectedArticle: NecArticle | null = null;
  loadingArticles = false;
  loadingArticle = false;

  constructor(private necApi: NecApiService) {}

  ngOnInit(): void {
    this.loadingArticles = true;
    this.necApi.getArticles().subscribe({
      next: articles => {
        this.articles = articles;
        this.loadingArticles = false;
        if (articles.length > 0) this.selectArticle(articles[0].id);
      },
      error: () => { this.loadingArticles = false; }
    });
  }

  selectArticle(id: string): void {
    if (this.selectedArticle?.id === id) return;
    this.loadingArticle = true;
    this.necApi.getArticle(id).subscribe({
      next: article => { this.selectedArticle = article; this.loadingArticle = false; },
      error: () => { this.loadingArticle = false; }
    });
  }
}
```

- [ ] **Step 4: Create browse.component.html**

```html
<!-- src/app/components/browse/browse.component.html -->
<div class="browse-layout">
  <aside class="article-sidebar">
    @if (loadingArticles) {
      <div class="center-spinner"><mat-spinner diameter="32"></mat-spinner></div>
    }
    <mat-nav-list>
      @for (article of articles; track article.id) {
        <mat-list-item
          [class.selected]="selectedArticle?.id === article.id"
          (click)="selectArticle(article.id)">
          <span matListItemTitle>Article {{ article.number }}</span>
          <span matListItemLine>{{ article.title }}</span>
        </mat-list-item>
      }
    </mat-nav-list>
  </aside>
  <mat-divider [vertical]="true"></mat-divider>
  <main class="article-body">
    @if (loadingArticle) {
      <div class="center-spinner"><mat-spinner></mat-spinner></div>
    } @else if (selectedArticle) {
      <h2>Article {{ selectedArticle.number }} — {{ selectedArticle.title }}</h2>
      @for (section of selectedArticle.sections; track section.id) {
        <div class="section-block">
          <h3>{{ section.sectionNumber }}&nbsp;{{ section.sectionTitle }}</h3>
          <p>{{ section.content }}</p>
        </div>
      }
    }
  </main>
</div>
```

- [ ] **Step 5: Create browse.component.css**

```css
/* src/app/components/browse/browse.component.css */
.browse-layout {
  display: flex;
  height: calc(100vh - 64px);
  overflow: hidden;
}
.article-sidebar {
  width: 280px;
  min-width: 220px;
  overflow-y: auto;
  flex-shrink: 0;
}
.article-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
}
.center-spinner {
  display: flex;
  justify-content: center;
  padding: 32px;
}
.section-block {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
}
mat-list-item.selected {
  background-color: #e3f2fd;
}
```

- [ ] **Step 6: Run test — confirm it passes**

```bash
ng test --include="src/app/components/browse/browse.component.spec.ts" --watch=false
```

Expected: `5 tests passed`.

- [ ] **Step 7: Commit**

```bash
git add src/app/components/browse/
git commit -m "feat: add Browse component for NEC article/section navigation"
```

---

### Task 12: Search Component

**Files:**
- Create: `src/app/components/search/search.component.ts`
- Create: `src/app/components/search/search.component.html`
- Create: `src/app/components/search/search.component.css`
- Create: `src/app/components/search/search.component.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/app/components/search/search.component.spec.ts
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SearchComponent } from './search.component';
import { NecApiService } from '../../services/nec-api.service';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

const MOCK_RESULTS = [{
  id: '210.1', articleId: '210', sectionNumber: '210.1',
  sectionTitle: 'Scope', snippet: 'Branch circuit content here…', score: 2.1
}];

describe('SearchComponent', () => {
  let component: SearchComponent;
  let fixture: ComponentFixture<SearchComponent>;
  let necApi: jasmine.SpyObj<NecApiService>;

  beforeEach(async () => {
    necApi = jasmine.createSpyObj('NecApiService', ['search']);
    necApi.search.and.returnValue(of(MOCK_RESULTS));

    await TestBed.configureTestingModule({
      imports: [SearchComponent, RouterTestingModule, NoopAnimationsModule],
      providers: [{ provide: NecApiService, useValue: necApi }]
    }).compileComponents();

    fixture = TestBed.createComponent(SearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('does not call search on init', () => {
    expect(necApi.search).not.toHaveBeenCalled();
  });

  it('calls search after 300ms debounce when query >= 2 chars', fakeAsync(() => {
    component.query = 'branch circuit';
    component.onQueryChange();
    tick(300);
    expect(necApi.search).toHaveBeenCalledWith('branch circuit');
    expect(component.results.length).toBe(1);
  }));

  it('does not call search when query is less than 2 chars', fakeAsync(() => {
    component.query = 'a';
    component.onQueryChange();
    tick(300);
    expect(necApi.search).not.toHaveBeenCalled();
    expect(component.results).toHaveSize(0);
  }));
});
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
ng test --include="src/app/components/search/search.component.spec.ts" --watch=false
```

Expected: error — `SearchComponent` not found.

- [ ] **Step 3: Create search.component.ts**

```typescript
// src/app/components/search/search.component.ts
import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { Subject, Subscription, debounceTime, switchMap, of } from 'rxjs';
import { NecApiService, SearchResult } from '../../services/nec-api.service';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatFormFieldModule, MatInputModule,
    MatIconModule, MatListModule, MatProgressSpinnerModule, MatDividerModule
  ],
  templateUrl: './search.component.html',
  styleUrl: './search.component.css'
})
export class SearchComponent implements OnDestroy {
  query = '';
  results: SearchResult[] = [];
  searching = false;
  searched = false;

  private readonly search$ = new Subject<string>();
  private readonly sub: Subscription;

  constructor(private necApi: NecApiService, private router: Router) {
    this.sub = this.search$.pipe(
      debounceTime(300),
      switchMap(q => {
        if (q.trim().length < 2) return of([]);
        this.searching = true;
        return this.necApi.search(q);
      })
    ).subscribe(results => {
      this.results = results;
      this.searching = false;
      this.searched = true;
    });
  }

  onQueryChange(): void {
    this.search$.next(this.query);
  }

  goToArticle(): void {
    this.router.navigate(['/browse']);
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
```

- [ ] **Step 4: Create search.component.html**

```html
<!-- src/app/components/search/search.component.html -->
<div class="search-container">
  <mat-form-field appearance="outline" class="search-field">
    <mat-label>Search NEC</mat-label>
    <input matInput [(ngModel)]="query" (ngModelChange)="onQueryChange()"
           placeholder="e.g. branch circuit, grounding electrode">
    <mat-icon matSuffix>search</mat-icon>
  </mat-form-field>

  @if (searching) {
    <div class="center-spinner"><mat-spinner diameter="36"></mat-spinner></div>
  }

  @if (searched && !searching) {
    @if (results.length === 0) {
      <p class="no-results">No results found for "{{ query }}"</p>
    } @else {
      <p class="result-count">{{ results.length }} result(s)</p>
      <mat-list>
        @for (result of results; track result.id) {
          <mat-list-item class="result-item" (click)="goToArticle()">
            <span matListItemTitle>{{ result.sectionNumber }} — {{ result.sectionTitle }}</span>
            <span matListItemLine>Article {{ result.articleId }}</span>
            <p class="snippet">{{ result.snippet }}</p>
          </mat-list-item>
          <mat-divider></mat-divider>
        }
      </mat-list>
    }
  }
</div>
```

- [ ] **Step 5: Create search.component.css**

```css
/* src/app/components/search/search.component.css */
.search-container {
  max-width: 800px;
  margin: 32px auto;
  padding: 0 16px;
}
.search-field { width: 100%; }
.center-spinner {
  display: flex;
  justify-content: center;
  padding: 24px;
}
.no-results, .result-count {
  color: #666;
  font-size: 14px;
}
.result-item {
  cursor: pointer;
  height: auto !important;
  padding: 12px 0;
}
.result-item:hover { background: #f5f5f5; }
.snippet {
  font-size: 13px;
  color: #555;
  margin: 4px 0 0;
  white-space: normal;
}
```

- [ ] **Step 6: Run test — confirm it passes**

```bash
ng test --include="src/app/components/search/search.component.spec.ts" --watch=false
```

Expected: `4 tests passed`.

- [ ] **Step 7: Commit**

```bash
git add src/app/components/search/
git commit -m "feat: add Search component with debounced keyword search"
```

---

### Task 13: Place PDF and Verify End-to-End

**Files:**
- Place: `src/assets/nec-book.pdf`

- [ ] **Step 1: Copy your NEC PDF into the assets folder**

```powershell
# Replace <path-to-your-pdf> with the actual path
Copy-Item "<path-to-your-pdf>" "src\assets\nec-book.pdf"
```

- [ ] **Step 2: Run all server tests**

```bash
npm run test:server
```

Expected: `16 tests passed, 0 failed`.

- [ ] **Step 3: Run all Angular tests**

```bash
ng test --watch=false
```

Expected: `12 tests, 0 failures` (3 service + 5 browse + 4 search).

- [ ] **Step 4: Build and start the server**

```bash
npm run build
npm run serve:ssr:nec-study-app
```

Watch the console for:
```
[server] Loading PDF…
[PdfService] Loaded N articles
[server] Index ready.
Node Express server listening on http://localhost:4000
```

- [ ] **Step 5: Verify in the browser**

Open http://localhost:4000 and confirm:
- Material toolbar with "NEC Study App", "Browse", and "Search" links
- Browse loads an article list in the left sidebar
- Clicking an article shows sections and content on the right
- Search page accepts input and returns matching sections after 300ms

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "chore: complete NEC Study App MVP — browse and keyword search"
```
