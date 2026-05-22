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
