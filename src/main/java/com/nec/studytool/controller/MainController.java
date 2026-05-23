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

    @FXML
    private void showBrowse() {
        contentArea.getChildren().setAll(browseView);
    }

    @FXML
    private void showSearch() {
        contentArea.getChildren().setAll(searchView);
    }
}
