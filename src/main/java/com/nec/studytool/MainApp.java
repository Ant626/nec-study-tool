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
