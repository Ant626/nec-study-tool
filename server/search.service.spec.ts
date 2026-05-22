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
