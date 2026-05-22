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
