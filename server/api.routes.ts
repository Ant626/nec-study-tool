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
