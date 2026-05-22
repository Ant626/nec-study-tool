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
