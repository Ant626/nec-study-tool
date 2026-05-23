package com.nec.studytool;

import com.nec.studytool.model.Article;
import com.nec.studytool.service.PdfService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class PdfServiceTest {

    private PdfService service;

    @BeforeEach
    void setUp() {
        service = new PdfService();
    }

    @Test
    void parsesArticleHeader() {
        List<Article> articles = service.parseNecText(
                "ARTICLE 100 — Definitions\n\n100.1 Scope\nSome content here.");
        assertEquals(1, articles.size());
        assertEquals("100", articles.get(0).getId());
        assertEquals("Definitions", articles.get(0).getTitle());
    }

    @Test
    void parsesArticleHeaderWithHyphen() {
        List<Article> articles = service.parseNecText(
                "ARTICLE 100 - Definitions\n\n100.1 Scope\nSome content here.");
        assertEquals(1, articles.size());
        assertEquals("100", articles.get(0).getId());
    }

    @Test
    void parsesSections() {
        String text = "ARTICLE 100 — Definitions\n\n" +
                "100.1 Scope\nScope content here.\n\n" +
                "100.2 Standard Definitions\nDefinition content.";
        List<Article> articles = service.parseNecText(text);
        assertEquals(2, articles.get(0).getSections().size());
        assertEquals("100.1", articles.get(0).getSections().get(0).getSectionNumber());
        assertEquals("Scope", articles.get(0).getSections().get(0).getSectionTitle());
        assertEquals("100.2", articles.get(0).getSections().get(1).getSectionNumber());
    }

    @Test
    void accumulatesSectionContent() {
        String text = "ARTICLE 100 — Definitions\n\n" +
                "100.1 Scope\nFirst line.\nSecond line.";
        List<Article> articles = service.parseNecText(text);
        String content = articles.get(0).getSections().get(0).getContent();
        assertTrue(content.contains("First line"));
        assertTrue(content.contains("Second line"));
    }

    @Test
    void filtersPageNumbers() {
        String text = "42\nARTICLE 100 — Definitions\n100.1 Scope\nContent.";
        List<Article> articles = service.parseNecText(text);
        assertEquals(1, articles.size());
        assertEquals(1, articles.get(0).getSections().size());
    }

    @Test
    void filtersNfpaLines() {
        String text = "NFPA 70\nARTICLE 100 — Definitions\n100.1 Scope\nContent.";
        List<Article> articles = service.parseNecText(text);
        assertEquals(1, articles.size());
    }

    @Test
    void handlesMultipleArticles() {
        String text = "ARTICLE 100 — Definitions\n100.1 Scope\nContent A.\n" +
                "ARTICLE 200 — Premises Wiring\n200.1 Scope\nContent B.";
        List<Article> articles = service.parseNecText(text);
        assertEquals(2, articles.size());
        assertEquals("100", articles.get(0).getId());
        assertEquals("200", articles.get(1).getId());
    }

    @Test
    void ignoresContentBeforeFirstArticle() {
        String text = "Some preamble text.\nMore preamble.\nARTICLE 90 — Introduction\n90.1 Scope\nContent.";
        List<Article> articles = service.parseNecText(text);
        assertEquals(1, articles.size());
        assertEquals("90", articles.get(0).getId());
    }

    @Test
    void doesNotCrossContaminateSections() {
        String text = "ARTICLE 100 — Definitions\n100.1 Scope\nContent.\n" +
                "ARTICLE 200 — Wiring\n200.1 General\nContent.";
        List<Article> articles = service.parseNecText(text);
        assertEquals(1, articles.get(0).getSections().size());
        assertEquals(1, articles.get(1).getSections().size());
    }
}
