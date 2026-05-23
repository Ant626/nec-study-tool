package com.nec.studytool.model;

public class Section {
    private final String id;
    private final String articleId;
    private final String sectionNumber;
    private final String sectionTitle;
    private final String content;

    public Section(String id, String articleId, String sectionNumber, String sectionTitle, String content) {
        this.id = id;
        this.articleId = articleId;
        this.sectionNumber = sectionNumber;
        this.sectionTitle = sectionTitle;
        this.content = content;
    }

    public String getId() { return id; }
    public String getArticleId() { return articleId; }
    public String getSectionNumber() { return sectionNumber; }
    public String getSectionTitle() { return sectionTitle; }
    public String getContent() { return content; }
}
