# NEC Desktop Study Tool — Build Plan

Java 21 + JavaFX 21 + Maven desktop app for browsing and searching the National Electrical Code PDF.

---

## Project Structure

```
nec-desktop-study-app/
├── pom.xml
└── src/
    ├── main/
    │   ├── java/com/nec/studytool/
    │   │   ├── MainApp.java
    │   │   ├── model/
    │   │   │   ├── Article.java
    │   │   │   ├── Section.java
    │   │   │   └── SearchResult.java
    │   │   ├── service/
    │   │   │   ├── PdfService.java
    │   │   │   └── SearchService.java
    │   │   └── controller/
    │   │       ├── MainController.java
    │   │       ├── BrowseController.java
    │   │       └── SearchController.java
    │   └── resources/com/nec/studytool/
    │       ├── main.fxml
    │       ├── browse.fxml
    │       ├── search.fxml
    │       ├── styles.css
    │       └── assets/
    │           └── nec-book.pdf        ← copy your PDF here
    └── test/java/com/nec/studytool/
        ├── PdfServiceTest.java
        └── SearchServiceTest.java
```

---

## Commands

```bash
mvn javafx:run   # run the desktop app
mvn test         # run unit tests
```

---

## `pom.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
                             http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.nec</groupId>
    <artifactId>nec-desktop-study-tool</artifactId>
    <version>1.0.0</version>
    <packaging>jar</packaging>
    <name>NEC Desktop Study Tool</name>

    <properties>
        <maven.compiler.source>21</maven.compiler.source>
        <maven.compiler.target>21</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <javafx.version>21.0.2</javafx.version>
        <pdfbox.version>3.0.2</pdfbox.version>
        <junit.version>5.10.0</junit.version>
        <main.class>com.nec.studytool.MainApp</main.class>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.openjfx</groupId>
            <artifactId>javafx-controls</artifactId>
            <version>${javafx.version}</version>
        </dependency>
        <dependency>
            <groupId>org.openjfx</groupId>
            <artifactId>javafx-fxml</artifactId>
            <version>${javafx.version}</version>
        </dependency>
        <dependency>
            <groupId>org.apache.pdfbox</groupId>
            <artifactId>pdfbox</artifactId>
            <version>${pdfbox.version}</version>
        </dependency>
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter</artifactId>
            <version>${junit.version}</version>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.openjfx</groupId>
                <artifactId>javafx-maven-plugin</artifactId>
                <version>0.0.8</version>
                <configuration>
                    <mainClass>${main.class}</mainClass>
                </configuration>
            </plugin>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-surefire-plugin</artifactId>
                <version>3.1.2</version>
            </plugin>
        </plugins>
    </build>
</project>
```

---

## Model Classes

### `model/Article.java`

```java
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
```

### `model/Section.java`

```java
package com.nec.studytool.model;

public class Section {
    private final String id;
    private final String articleId;
    private final String sectionNumber;
    private final String sectionTitle;
    private final String content;

    public Section(String id, String articleId, String sectionNumber,
                   String sectionTitle, String content) {
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
```

### `model/SearchResult.java`

```java
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
```

---

## Service Classes

### `service/PdfService.java`

Loads the NEC PDF from the classpath, strips text with PDFBox, and regex-parses it into articles and sections.

```java
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

    // Matches: ARTICLE 100 — Definitions  (em-dash or hyphen)
    private static final Pattern ARTICLE_PATTERN = Pattern.compile(
        "^ARTICLE\\s+(\\d+)\\s*[\\u2014\\-]+\\s*(.+)$", Pattern.CASE_INSENSITIVE
    );

    // Matches: 100.1 Scope  or  100.1.2 Sub-section
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

        String articleId = null, articleTitle = null;
        String sectionNum = null, sectionTitle = null;
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
        if (sectionNum != null && articleId != null)
            sections.add(new Section(sectionNum, articleId, sectionNum,
                                     sectionTitle, content.toString().trim()));
    }

    private void finishArticle(List<Article> articles, String articleId,
                                String articleTitle, List<Section> sections) {
        if (articleId != null)
            articles.add(new Article(articleId, articleTitle, new ArrayList<>(sections)));
    }

    private boolean isHeaderOrFooter(String line) {
        if (line.matches("^\\d+$")) return true;
        if (line.contains("NFPA 70") && line.length() < 80) return true;
        if (line.startsWith("National Electrical Code") && line.length() < 80) return true;
        if (line.matches("^\\d{4}\\s+Edition.*")) return true;
        return false;
    }
}
```

### `service/SearchService.java`

In-memory full-text search. Title matches are weighted 3×. All query terms must appear for a section to score. Returns top 20 results.

```java
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
            if (score > 0)
                results.add(new SearchResult(section, buildSnippet(section.getContent(), terms[0]), score));
        }

        results.sort((a, b) -> Double.compare(b.getScore(), a.getScore()));
        return results.stream().limit(20).collect(Collectors.toList());
    }

    private double score(Section section, String[] terms) {
        double total = 0;
        String title = section.getSectionTitle().toLowerCase();
        String content = section.getContent().toLowerCase();
        for (String term : terms) {
            int t = countOccurrences(title, term);
            int c = countOccurrences(content, term);
            if (t == 0 && c == 0) return 0;
            total += t * 3.0 + c;
        }
        return total;
    }

    private int countOccurrences(String text, String term) {
        int count = 0, idx = 0;
        while ((idx = text.indexOf(term, idx)) != -1) { count++; idx += term.length(); }
        return count;
    }

    private String buildSnippet(String content, String firstTerm) {
        if (content.isEmpty()) return "";
        int idx = content.toLowerCase().indexOf(firstTerm.toLowerCase());
        if (idx < 0) return content.substring(0, Math.min(150, content.length()));
        int start = Math.max(0, idx - 50);
        int end = Math.min(content.length(), idx + 100);
        String s = content.substring(start, end);
        if (start > 0) s = "…" + s;
        if (end < content.length()) s = s + "…";
        return s;
    }
}
```

---

## Entry Point

### `MainApp.java`

Shows a loading spinner while the PDF is parsed in a background thread, then swaps in the main window.

```java
package com.nec.studytool;

import com.nec.studytool.service.PdfService;
import com.nec.studytool.service.SearchService;
import javafx.application.Application;
import javafx.application.Platform;
import javafx.fxml.FXMLLoader;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.Label;
import javafx.scene.control.ProgressIndicator;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

import java.io.InputStream;

public class MainApp extends Application {

    public static PdfService pdfService;
    public static SearchService searchService;

    @Override
    public void start(Stage primaryStage) {
        Label loadingLabel = new Label("Loading NEC document…");
        loadingLabel.setStyle("-fx-font-size: 15px; -fx-text-fill: #555;");
        ProgressIndicator spinner = new ProgressIndicator();
        spinner.setMaxSize(48, 48);

        VBox loadingPane = new VBox(16, spinner, loadingLabel);
        loadingPane.setAlignment(Pos.CENTER);
        loadingPane.setStyle("-fx-background-color: white;");

        primaryStage.setScene(new Scene(loadingPane, 480, 240));
        primaryStage.setTitle("NEC Study Tool");
        primaryStage.show();

        Thread loader = new Thread(() -> {
            try {
                pdfService = new PdfService();
                InputStream pdf = MainApp.class.getResourceAsStream(
                        "/com/nec/studytool/assets/nec-book.pdf");
                if (pdf == null) throw new RuntimeException("nec-book.pdf not found in classpath");
                pdfService.load(pdf);

                searchService = new SearchService();
                searchService.build(pdfService.getArticles());

                Platform.runLater(() -> {
                    try {
                        FXMLLoader fxml = new FXMLLoader(MainApp.class.getResource("main.fxml"));
                        Scene scene = new Scene(fxml.load(), 1280, 900);
                        scene.getStylesheets().add(
                                MainApp.class.getResource("styles.css").toExternalForm());
                        primaryStage.setScene(scene);
                        primaryStage.setMinWidth(900);
                        primaryStage.setMinHeight(600);
                    } catch (Exception e) {
                        showError(loadingLabel, e);
                    }
                });
            } catch (Exception e) {
                Platform.runLater(() -> showError(loadingLabel, e));
            }
        });
        loader.setDaemon(true);
        loader.start();
    }

    private void showError(Label label, Exception e) {
        label.setText("Error loading PDF: " + e.getMessage());
        label.setStyle("-fx-font-size: 13px; -fx-text-fill: #c00; -fx-wrap-text: true;");
    }

    public static void main(String[] args) {
        launch(args);
    }
}
```

---

## Controllers

### `controller/MainController.java`

```java
package com.nec.studytool.controller;

import com.nec.studytool.MainApp;
import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.fxml.Initializable;
import javafx.scene.Node;
import javafx.scene.control.ToggleButton;
import javafx.scene.control.ToggleGroup;
import javafx.scene.layout.StackPane;

import java.io.IOException;
import java.net.URL;
import java.util.ResourceBundle;

public class MainController implements Initializable {

    @FXML private StackPane contentArea;
    @FXML private ToggleButton browseButton;
    @FXML private ToggleButton searchButton;

    private Node browseView;
    private Node searchView;

    @Override
    public void initialize(URL location, ResourceBundle resources) {
        ToggleGroup navGroup = new ToggleGroup();
        browseButton.setToggleGroup(navGroup);
        searchButton.setToggleGroup(navGroup);

        // Prevent deselecting all buttons
        navGroup.selectedToggleProperty().addListener((obs, old, newVal) -> {
            if (newVal == null) old.setSelected(true);
        });

        try {
            browseView = FXMLLoader.load(MainApp.class.getResource("browse.fxml"));
            searchView = FXMLLoader.load(MainApp.class.getResource("search.fxml"));
        } catch (IOException e) {
            throw new RuntimeException("Failed to load views", e);
        }

        contentArea.getChildren().add(browseView);
        browseButton.setSelected(true);
    }

    @FXML private void showBrowse() { contentArea.getChildren().setAll(browseView); }
    @FXML private void showSearch() { contentArea.getChildren().setAll(searchView); }
}
```

### `controller/BrowseController.java`

```java
package com.nec.studytool.controller;

import com.nec.studytool.MainApp;
import com.nec.studytool.model.Article;
import com.nec.studytool.model.Section;
import javafx.fxml.FXML;
import javafx.fxml.Initializable;
import javafx.scene.control.Label;
import javafx.scene.control.ListView;
import javafx.scene.layout.VBox;

import java.net.URL;
import java.util.ResourceBundle;

public class BrowseController implements Initializable {

    @FXML private ListView<Article> articleList;
    @FXML private VBox sectionContainer;

    @Override
    public void initialize(URL location, ResourceBundle resources) {
        articleList.getItems().addAll(MainApp.pdfService.getArticles());

        articleList.getSelectionModel().selectedItemProperty().addListener(
                (obs, old, selected) -> { if (selected != null) loadArticle(selected); });

        if (!articleList.getItems().isEmpty())
            articleList.getSelectionModel().select(0);
    }

    private void loadArticle(Article article) {
        sectionContainer.getChildren().clear();

        Label title = new Label("Article " + article.getId() + " — " + article.getTitle());
        title.setWrapText(true);
        title.getStyleClass().add("article-title");
        sectionContainer.getChildren().add(title);

        for (Section section : article.getSections()) {
            VBox card = new VBox(6);
            card.getStyleClass().add("section-card");

            Label header = new Label(section.getSectionNumber() + "  " + section.getSectionTitle());
            header.setWrapText(true);
            header.getStyleClass().add("section-title");

            Label body = new Label(section.getContent());
            body.setWrapText(true);
            body.getStyleClass().add("section-content");

            card.getChildren().addAll(header, body);
            sectionContainer.getChildren().add(card);
        }
    }
}
```

### `controller/SearchController.java`

```java
package com.nec.studytool.controller;

import com.nec.studytool.MainApp;
import com.nec.studytool.model.SearchResult;
import javafx.animation.KeyFrame;
import javafx.animation.Timeline;
import javafx.fxml.FXML;
import javafx.fxml.Initializable;
import javafx.scene.control.Label;
import javafx.scene.control.ListCell;
import javafx.scene.control.ListView;
import javafx.scene.control.TextField;
import javafx.scene.layout.VBox;
import javafx.util.Duration;

import java.net.URL;
import java.util.List;
import java.util.ResourceBundle;

public class SearchController implements Initializable {

    @FXML private TextField searchField;
    @FXML private Label statusLabel;
    @FXML private ListView<SearchResult> resultList;

    private Timeline debounce;

    @Override
    public void initialize(URL location, ResourceBundle resources) {
        debounce = new Timeline(new KeyFrame(Duration.millis(300), e -> performSearch()));
        debounce.setCycleCount(1);

        searchField.textProperty().addListener((obs, old, val) -> debounce.playFromStart());

        resultList.setCellFactory(lv -> new ListCell<>() {
            @Override
            protected void updateItem(SearchResult item, boolean empty) {
                super.updateItem(item, empty);
                if (empty || item == null) { setGraphic(null); return; }

                Label header = new Label(
                        item.getSection().getSectionNumber() + "  " + item.getSection().getSectionTitle());
                header.setWrapText(true);
                header.getStyleClass().add("result-header");

                Label articleTag = new Label("Article " + item.getSection().getArticleId());
                articleTag.getStyleClass().add("result-article");

                Label snippet = new Label(item.getSnippet());
                snippet.setWrapText(true);
                snippet.getStyleClass().add("result-snippet");

                VBox cell = new VBox(4, header, articleTag, snippet);
                cell.setStyle("-fx-padding: 8 4 8 4;");
                setGraphic(cell);
            }
        });
    }

    private void performSearch() {
        String query = searchField.getText().trim();
        resultList.getItems().clear();

        if (query.length() < 2) { statusLabel.setText(""); return; }

        List<SearchResult> results = MainApp.searchService.search(query);
        if (results.isEmpty()) {
            statusLabel.setText("No results for “" + query + "”");
        } else {
            statusLabel.setText(results.size() + " result" + (results.size() == 1 ? "" : "s")
                    + " for “" + query + "”");
            resultList.getItems().addAll(results);
        }
    }
}
```

---

## FXML Layouts

### `main.fxml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<?import javafx.geometry.Insets?>
<?import javafx.scene.control.Label?>
<?import javafx.scene.control.ToggleButton?>
<?import javafx.scene.layout.BorderPane?>
<?import javafx.scene.layout.HBox?>
<?import javafx.scene.layout.Region?>
<?import javafx.scene.layout.StackPane?>

<BorderPane xmlns="http://javafx.com/javafx/21"
            xmlns:fx="http://javafx.com/fxml/1"
            fx:controller="com.nec.studytool.controller.MainController">
    <top>
        <HBox styleClass="toolbar" alignment="CENTER_LEFT" spacing="8">
            <padding><Insets top="12" right="16" bottom="12" left="16"/></padding>
            <Label text="NEC Study Tool" styleClass="toolbar-title"/>
            <Region HBox.hgrow="ALWAYS"/>
            <ToggleButton fx:id="browseButton" text="Browse"
                          onAction="#showBrowse" styleClass="nav-button"/>
            <ToggleButton fx:id="searchButton" text="Search"
                          onAction="#showSearch" styleClass="nav-button"/>
        </HBox>
    </top>
    <center>
        <StackPane fx:id="contentArea"/>
    </center>
</BorderPane>
```

### `browse.fxml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<?import javafx.geometry.Insets?>
<?import javafx.scene.control.Label?>
<?import javafx.scene.control.ListView?>
<?import javafx.scene.control.ScrollPane?>
<?import javafx.scene.control.SplitPane?>
<?import javafx.scene.layout.VBox?>

<SplitPane dividerPositions="0.28" xmlns="http://javafx.com/javafx/21"
           xmlns:fx="http://javafx.com/fxml/1"
           fx:controller="com.nec.studytool.controller.BrowseController">
    <VBox styleClass="sidebar">
        <Label text="Articles" styleClass="panel-title"/>
        <ListView fx:id="articleList" VBox.vgrow="ALWAYS"/>
    </VBox>
    <ScrollPane fitToWidth="true">
        <VBox fx:id="sectionContainer" spacing="0" styleClass="section-container">
            <padding><Insets top="20" right="24" bottom="24" left="24"/></padding>
        </VBox>
    </ScrollPane>
</SplitPane>
```

### `search.fxml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<?import javafx.geometry.Insets?>
<?import javafx.scene.control.Label?>
<?import javafx.scene.control.ListView?>
<?import javafx.scene.control.TextField?>
<?import javafx.scene.layout.VBox?>

<VBox spacing="10" xmlns="http://javafx.com/javafx/21"
      xmlns:fx="http://javafx.com/fxml/1"
      fx:controller="com.nec.studytool.controller.SearchController"
      styleClass="search-container">
    <padding><Insets top="20" right="24" bottom="20" left="24"/></padding>
    <TextField fx:id="searchField" promptText="Search NEC articles…" styleClass="search-field"/>
    <Label fx:id="statusLabel" text="" styleClass="status-label"/>
    <ListView fx:id="resultList" VBox.vgrow="ALWAYS" styleClass="result-list"/>
</VBox>
```

---

## `styles.css`

```css
.toolbar {
    -fx-background-color: #3F51B5;
    -fx-effect: dropshadow(gaussian, rgba(0,0,0,0.28), 6, 0, 0, 2);
}
.toolbar-title {
    -fx-text-fill: white;
    -fx-font-size: 18px;
    -fx-font-weight: bold;
}
.nav-button {
    -fx-background-color: transparent;
    -fx-text-fill: rgba(255,255,255,0.82);
    -fx-border-color: transparent;
    -fx-border-radius: 4;
    -fx-background-radius: 4;
    -fx-font-size: 14px;
    -fx-padding: 6 16 6 16;
    -fx-cursor: hand;
}
.nav-button:hover { -fx-background-color: rgba(255,255,255,0.15); -fx-text-fill: white; }
.nav-button:selected { -fx-background-color: rgba(255,255,255,0.22); -fx-text-fill: white; -fx-font-weight: bold; }

.sidebar { -fx-background-color: #FAFAFA; }
.panel-title {
    -fx-font-size: 11px;
    -fx-font-weight: bold;
    -fx-text-fill: #888;
    -fx-padding: 8 12 8 12;
    -fx-background-color: #EEEEEE;
    -fx-border-color: #DDDDDD;
    -fx-border-width: 0 0 1 0;
    -fx-max-width: Infinity;
}
.list-view .list-cell:selected { -fx-background-color: #E8EAF6; -fx-text-fill: #3F51B5; }
.list-view .list-cell:hover { -fx-background-color: #F5F5F5; }

.section-container { -fx-background-color: white; }
.article-title { -fx-font-size: 20px; -fx-font-weight: bold; -fx-text-fill: #3F51B5; -fx-padding: 0 0 16 0; }
.section-card { -fx-padding: 14 0 14 0; -fx-border-color: transparent transparent #EEEEEE transparent; -fx-border-width: 0 0 1 0; }
.section-title { -fx-font-size: 14px; -fx-font-weight: bold; -fx-text-fill: #212121; }
.section-content { -fx-font-size: 13px; -fx-text-fill: #555555; -fx-line-spacing: 3; }

.search-container { -fx-background-color: white; }
.search-field {
    -fx-font-size: 15px;
    -fx-padding: 10 14 10 14;
    -fx-background-color: white;
    -fx-border-color: #BDBDBD;
    -fx-border-width: 1;
    -fx-border-radius: 4;
    -fx-background-radius: 4;
}
.search-field:focused { -fx-border-color: #3F51B5; -fx-border-width: 2; }
.status-label { -fx-font-size: 12px; -fx-text-fill: #888; }
.result-header { -fx-font-size: 14px; -fx-font-weight: bold; -fx-text-fill: #212121; }
.result-article { -fx-font-size: 11px; -fx-text-fill: #3F51B5; -fx-font-weight: bold; }
.result-snippet { -fx-font-size: 12px; -fx-text-fill: #666; -fx-font-style: italic; }
```

---

## Unit Tests

### `PdfServiceTest.java`

```java
package com.nec.studytool;

import com.nec.studytool.model.Article;
import com.nec.studytool.service.PdfService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class PdfServiceTest {

    private PdfService service;

    @BeforeEach void setUp() { service = new PdfService(); }

    @Test
    void parsesArticleHeader() {
        List<Article> a = service.parseNecText("ARTICLE 100 — Definitions\n\n100.1 Scope\nContent.");
        assertEquals(1, a.size());
        assertEquals("100", a.get(0).getId());
        assertEquals("Definitions", a.get(0).getTitle());
    }

    @Test
    void parsesArticleHeaderWithHyphen() {
        List<Article> a = service.parseNecText("ARTICLE 100 - Definitions\n\n100.1 Scope\nContent.");
        assertEquals(1, a.size());
    }

    @Test
    void parsesSections() {
        String text = "ARTICLE 100 — Definitions\n\n100.1 Scope\nScope content.\n\n100.2 Definitions\nDef content.";
        List<Article> a = service.parseNecText(text);
        assertEquals(2, a.get(0).getSections().size());
        assertEquals("100.1", a.get(0).getSections().get(0).getSectionNumber());
        assertEquals("Scope", a.get(0).getSections().get(0).getSectionTitle());
    }

    @Test
    void accumulatesSectionContent() {
        String text = "ARTICLE 100 — Definitions\n\n100.1 Scope\nFirst line.\nSecond line.";
        String content = service.parseNecText(text).get(0).getSections().get(0).getContent();
        assertTrue(content.contains("First line"));
        assertTrue(content.contains("Second line"));
    }

    @Test
    void filtersPageNumbers() {
        List<Article> a = service.parseNecText("42\nARTICLE 100 — Definitions\n100.1 Scope\nContent.");
        assertEquals(1, a.size());
        assertEquals(1, a.get(0).getSections().size());
    }

    @Test
    void filtersNfpaLines() {
        List<Article> a = service.parseNecText("NFPA 70\nARTICLE 100 — Definitions\n100.1 Scope\nContent.");
        assertEquals(1, a.size());
    }

    @Test
    void handlesMultipleArticles() {
        String text = "ARTICLE 100 — Definitions\n100.1 Scope\nContent A.\n"
                    + "ARTICLE 200 — Premises Wiring\n200.1 Scope\nContent B.";
        List<Article> a = service.parseNecText(text);
        assertEquals(2, a.size());
        assertEquals("100", a.get(0).getId());
        assertEquals("200", a.get(1).getId());
    }

    @Test
    void ignoresContentBeforeFirstArticle() {
        String text = "Preamble.\nARTICLE 90 — Introduction\n90.1 Scope\nContent.";
        List<Article> a = service.parseNecText(text);
        assertEquals(1, a.size());
        assertEquals("90", a.get(0).getId());
    }

    @Test
    void doesNotCrossContaminateSections() {
        String text = "ARTICLE 100 — Definitions\n100.1 Scope\nContent.\n"
                    + "ARTICLE 200 — Wiring\n200.1 General\nContent.";
        List<Article> a = service.parseNecText(text);
        assertEquals(1, a.get(0).getSections().size());
        assertEquals(1, a.get(1).getSections().size());
    }
}
```

### `SearchServiceTest.java`

```java
package com.nec.studytool;

import com.nec.studytool.model.Article;
import com.nec.studytool.model.SearchResult;
import com.nec.studytool.model.Section;
import com.nec.studytool.service.SearchService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
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
                new Article("200", "Premises Wiring", List.of(s3))));
    }

    @Test void returnsEmptyForNullQuery() { assertTrue(service.search(null).isEmpty()); }
    @Test void returnsEmptyForShortQuery() { assertTrue(service.search("a").isEmpty()); }

    @Test
    void findsResultsByContent() {
        assertFalse(service.search("grounding").isEmpty());
    }

    @Test
    void ranksTitleMatchesHigher() {
        assertEquals("100.2", service.search("grounding").get(0).getSection().getSectionNumber());
    }

    @Test
    void requiresAllTermsToMatch() {
        assertTrue(service.search("grounding xyznonexistent").isEmpty());
    }

    @Test
    void returnsSnippetAroundMatch() {
        SearchResult r = service.search("grounding").get(0);
        assertFalse(r.getSnippet().isEmpty());
        assertTrue(r.getSnippet().toLowerCase().contains("ground"));
    }

    @Test
    void limitsResultsToTwenty() {
        SearchService big = new SearchService();
        List<Section> many = new ArrayList<>();
        for (int i = 0; i < 50; i++)
            many.add(new Section("100." + i, "100", "100." + i, "Title " + i, "test content test"));
        big.build(List.of(new Article("100", "Test", many)));
        assertTrue(big.search("test").size() <= 20);
    }

    @Test
    void isCaseInsensitive() {
        assertEquals(service.search("grounding").size(), service.search("GROUNDING").size());
    }
}
```

---

## Future Phase — Claude AI Search

The `SearchService` is designed to be replaceable. When ready:

1. Add a `ClaudeSearchService` that POSTs the query + relevant article text to the Anthropic API
2. Add a toggle in `search.fxml`: **Keyword** / **Ask Claude**
3. Store the API key securely via `java.util.prefs.Preferences` (encrypted) or OS keychain
4. Stream the response into the results pane using the Anthropic REST API or Java SDK
