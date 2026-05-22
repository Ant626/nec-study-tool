// server/pdf.service.spec.ts
import { describe, it, expect } from 'vitest';
import { parseNecText, reconstructPageText } from './pdf.service';

// ─── reconstructPageText tests ────────────────────────────────────────────────

const PAGE_HEIGHT = 792; // standard US Letter in points

type MockItem = { str: string; transform: number[]; hasEOL: boolean };

function item(str: string, x: number, y: number): MockItem {
  return { str, transform: [1, 0, 0, 1, x, y], hasEOL: false };
}

describe('reconstructPageText', () => {
  it('returns body text within the page', () => {
    const result = reconstructPageText([item('Body text', 50, 400)], PAGE_HEIGHT);
    expect(result).toBe('Body text');
  });

  it('filters out header items above 92% of page height', () => {
    // y=750 > 792*0.92=729 → header zone
    const result = reconstructPageText(
      [item('ARTICLE 90 — INTRO', 50, 750), item('Body text', 50, 400)],
      PAGE_HEIGHT
    );
    expect(result).not.toContain('ARTICLE 90 — INTRO');
    expect(result).toContain('Body text');
  });

  it('filters out footer items below 5% of page height', () => {
    // y=20 < 792*0.05=39.6 → footer zone
    const result = reconstructPageText(
      [item('42', 300, 20), item('Body text', 50, 400)],
      PAGE_HEIGHT
    );
    expect(result).not.toContain('42');
    expect(result).toContain('Body text');
  });

  it('groups items on the same line and sorts left-to-right', () => {
    const result = reconstructPageText(
      [item('World', 200, 400), item('Hello ', 50, 400)],
      PAGE_HEIGHT
    );
    expect(result).toBe('Hello World');
  });

  it('sorts lines top-to-bottom (higher Y value = higher on page)', () => {
    const result = reconstructPageText(
      [item('Line 2', 50, 300), item('Line 1', 50, 500)],
      PAGE_HEIGHT
    );
    const lines = result.split('\n');
    expect(lines[0]).toBe('Line 1');
    expect(lines[1]).toBe('Line 2');
  });

  it('groups items within 2pt Y tolerance onto the same line', () => {
    // y=400 and y=401 should be on same line
    const result = reconstructPageText(
      [item('B', 100, 401), item('A ', 50, 400)],
      PAGE_HEIGHT
    );
    expect(result).toBe('A B');
  });

  it('returns empty string for empty items array', () => {
    expect(reconstructPageText([], PAGE_HEIGHT)).toBe('');
  });

  it('ignores whitespace-only items', () => {
    const result = reconstructPageText(
      [item('   ', 50, 400), item('Text', 100, 400)],
      PAGE_HEIGHT
    );
    expect(result).toBe('Text');
  });
});

// ─── parseNecText tests (unchanged) ───────────────────────────────────────────

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
