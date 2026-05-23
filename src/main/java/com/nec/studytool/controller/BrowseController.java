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

        if (!articleList.getItems().isEmpty()) {
            articleList.getSelectionModel().select(0);
        }
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
