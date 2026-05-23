package com.nec.studytool.service;

import com.nec.studytool.model.Article;
import com.nec.studytool.model.Section;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class PdfService {

    private static final Pattern ARTICLE_PATTERN = Pattern.compile(
        "^ARTICLE\\s+(\\d+)\\s*[\\u2014\\-]+\\s*(.+)$", Pattern.CASE_INSENSITIVE
    );

    private static final Pattern SECTION_PATTERN = Pattern.compile(
        "^(\\d{1,3}\\.\\d+(?:\\.\\d+)?)\\s+(.+)$"
    );

    private List<Article> articles = Collections.emptyList();

    public void load(InputStream pdfStream) throws IOException {
        try (PDDocument doc = Loader.loadPDF(pdfStream.readAllBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            String fullText = stripper.getText(doc);
            articles = parseNecText(fullText);
        }
    }

    public List<Article> getArticles() {
        return articles;
    }

    public List<Article> parseNecText(String text) {
        String[] lines = text.split("\\r?\\n");
        List<Article> result = new ArrayList<>();

        String articleId = null;
        String articleTitle = null;
        String sectionNum = null;
        String sectionTitle = null;
        StringBuilder sectionContent = new StringBuilder();
        List<Section> sections = new ArrayList<>();

        for (String rawLine : lines) {
            String line = rawLine.trim();
            if (line.isEmpty() || isHeaderOrFooter(line)) continue;

            Matcher am = ARTICLE_PATTERN.matcher(line);
            if (am.matches()) {
                finishSection(sections, articleId, sectionNum, sectionTitle, sectionContent);
                sectionNum = null;
                sectionContent.setLength(0);
                finishArticle(result, articleId, articleTitle, sections);
                sections.clear();

                articleId = am.group(1);
                articleTitle = am.group(2).trim();
                continue;
            }

            if (articleId == null) continue;

            Matcher sm = SECTION_PATTERN.matcher(line);
            if (sm.matches() && sm.group(1).startsWith(articleId + ".")) {
                finishSection(sections, articleId, sectionNum, sectionTitle, sectionContent);
                sectionNum = sm.group(1);
                sectionTitle = sm.group(2).trim();
                sectionContent.setLength(0);
                continue;
            }

            if (sectionNum != null) {
                if (sectionContent.length() > 0) sectionContent.append(" ");
                sectionContent.append(line);
            }
        }

        finishSection(sections, articleId, sectionNum, sectionTitle, sectionContent);
        finishArticle(result, articleId, articleTitle, sections);

        return result;
    }

    private void finishSection(List<Section> sections, String articleId,
                                String sectionNum, String sectionTitle,
                                StringBuilder content) {
        if (sectionNum != null && articleId != null) {
            sections.add(new Section(sectionNum, articleId, sectionNum, sectionTitle,
                                     content.toString().trim()));
        }
    }

    private void finishArticle(List<Article> articles, String articleId,
                                String articleTitle, List<Section> sections) {
        if (articleId != null) {
            articles.add(new Article(articleId, articleTitle, new ArrayList<>(sections)));
        }
    }

    private boolean isHeaderOrFooter(String line) {
        if (line.matches("^\\d+$")) return true;
        if (line.contains("NFPA 70") && line.length() < 80) return true;
        if (line.startsWith("National Electrical Code") && line.length() < 80) return true;
        if (line.matches("^\\d{4}\\s+Edition.*")) return true;
        return false;
    }
}
