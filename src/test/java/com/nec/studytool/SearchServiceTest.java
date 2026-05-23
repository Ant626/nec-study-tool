package com.nec.studytool;

import com.nec.studytool.model.Article;
import com.nec.studytool.model.SearchResult;
import com.nec.studytool.model.Section;
import com.nec.studytool.service.SearchService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class SearchServiceTest {

    private SearchService service;

    @BeforeEach
    void setUp() {
        service = new SearchService();

        Section s1 = new Section("100.1", "100", "100.1", "Scope",
                "This covers grounding and definitions for electrical systems.");
        Section s2 = new Section("100.2", "100", "100.2", "Grounding Definitions",
                "Grounding electrode system and bonding requirements.");
        Section s3 = new Section("200.1", "200", "200.1", "Ungrounded Conductors",
                "Requirements for ungrounded conductor identification.");

        service.build(List.of(
                new Article("100", "Definitions", List.of(s1, s2)),
                new Article("200", "Premises Wiring", List.of(s3))
        ));
    }

    @Test
    void returnsEmptyForNullQuery() {
        assertTrue(service.search(null).isEmpty());
    }

    @Test
    void returnsEmptyForShortQuery() {
        assertTrue(service.search("a").isEmpty());
        assertTrue(service.search(" ").isEmpty());
    }

    @Test
    void findsResultsByContent() {
        List<SearchResult> results = service.search("grounding");
        assertFalse(results.isEmpty());
    }

    @Test
    void ranksTitleMatchesHigher() {
        List<SearchResult> results = service.search("grounding");
        assertEquals("100.2", results.get(0).getSection().getSectionNumber());
    }

    @Test
    void requiresAllTermsToMatch() {
        List<SearchResult> results = service.search("grounding xyznonexistent");
        assertTrue(results.isEmpty());
    }

    @Test
    void returnsSnippetAroundMatch() {
        List<SearchResult> results = service.search("grounding");
        assertFalse(results.get(0).getSnippet().isEmpty());
        assertTrue(results.get(0).getSnippet().toLowerCase().contains("ground"));
    }

    @Test
    void limitsResultsToTwenty() {
        SearchService big = new SearchService();
        List<Section> many = new java.util.ArrayList<>();
        for (int i = 0; i < 50; i++) {
            many.add(new Section("100." + i, "100", "100." + i, "Title " + i,
                    "The word test appears here test."));
        }
        big.build(List.of(new Article("100", "Test", many)));
        assertTrue(big.search("test").size() <= 20);
    }

    @Test
    void isCaseInsensitive() {
        List<SearchResult> lower = service.search("grounding");
        List<SearchResult> upper = service.search("GROUNDING");
        assertEquals(lower.size(), upper.size());
    }
}
