package com.nec.studytool.model;

import java.util.List;

public class Article {
    private final String id;
    private final String title;
    private final List<Section> sections;

    public Article(String id, String title, List<Section> sections) {
        this.id = id;
        this.title = title;
        this.sections = sections;
    }

    public String getId() { return id; }
    public String getTitle() { return title; }
    public List<Section> getSections() { return sections; }

    @Override
    public String toString() {
        return "Art. " + id + " — " + title;
    }
}
