package com.nec.studytool.model;

public class SearchResult {
    private final Section section;
    private final String snippet;
    private final double score;

    public SearchResult(Section section, String snippet, double score) {
        this.section = section;
        this.snippet = snippet;
        this.score = score;
    }

    public Section getSection() { return section; }
    public String getSnippet() { return snippet; }
    public double getScore() { return score; }
}
