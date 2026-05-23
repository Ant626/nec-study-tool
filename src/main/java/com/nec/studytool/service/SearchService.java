package com.nec.studytool.service;

import com.nec.studytool.model.Article;
import com.nec.studytool.model.SearchResult;
import com.nec.studytool.model.Section;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

public class SearchService {

    private List<Section> index = Collections.emptyList();

    public void build(List<Article> articles) {
        index = articles.stream()
                .flatMap(a -> a.getSections().stream())
                .collect(Collectors.toList());
    }

    public List<SearchResult> search(String query) {
        if (query == null || query.trim().length() < 2) return Collections.emptyList();

        String[] terms = query.toLowerCase().split("\\s+");

        List<SearchResult> results = new ArrayList<>();
        for (Section section : index) {
            double score = score(section, terms);
            if (score > 0) {
                String snippet = buildSnippet(section.getContent(), terms[0]);
                results.add(new SearchResult(section, snippet, score));
            }
        }

        results.sort((a, b) -> Double.compare(b.getScore(), a.getScore()));
        return results.stream().limit(20).collect(Collectors.toList());
    }

    private double score(Section section, String[] terms) {
        double total = 0;
        String title = section.getSectionTitle().toLowerCase();
        String content = section.getContent().toLowerCase();

        for (String term : terms) {
            int titleCount = countOccurrences(title, term);
            int contentCount = countOccurrences(content, term);
            if (titleCount == 0 && contentCount == 0) return 0;
            total += titleCount * 3.0 + contentCount;
        }
        return total;
    }

    private int countOccurrences(String text, String term) {
        int count = 0;
        int idx = 0;
        while ((idx = text.indexOf(term, idx)) != -1) {
            count++;
            idx += term.length();
        }
        return count;
    }

    private String buildSnippet(String content, String firstTerm) {
        if (content.isEmpty()) return "";
        int idx = content.toLowerCase().indexOf(firstTerm.toLowerCase());
        if (idx < 0) return content.substring(0, Math.min(150, content.length()));
        int start = Math.max(0, idx - 50);
        int end = Math.min(content.length(), idx + 100);
        String snippet = content.substring(start, end);
        if (start > 0) snippet = "…" + snippet;
        if (end < content.length()) snippet = snippet + "…";
        return snippet;
    }
}
