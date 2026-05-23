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

        if (query.length() < 2) {
            statusLabel.setText("");
            return;
        }

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
