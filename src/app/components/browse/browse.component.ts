// src/app/components/browse/browse.component.ts
import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { NecApiService, ArticleSummary, NecArticle } from '../../services/nec-api.service';

@Component({
  selector: 'app-browse',
  standalone: true,
  imports: [CommonModule, MatListModule, MatProgressSpinnerModule, MatDividerModule],
  templateUrl: './browse.component.html',
  styleUrl: './browse.component.css'
})
export class BrowseComponent implements OnInit {
  articles: ArticleSummary[] = [];
  selectedArticle: NecArticle | null = null;
  loadingArticles = false;
  loadingArticle = false;

  private readonly destroyRef = inject(DestroyRef);

  constructor(private necApi: NecApiService) {}

  ngOnInit(): void {
    this.loadingArticles = true;
    this.necApi.getArticles().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: articles => {
        this.articles = articles;
        this.loadingArticles = false;
        if (articles.length > 0) this.selectArticle(articles[0].id);
      },
      error: () => { this.loadingArticles = false; }
    });
  }

  selectArticle(id: string): void {
    if (this.selectedArticle?.id === id) return;
    this.loadingArticle = true;
    this.necApi.getArticle(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: article => { this.selectedArticle = article; this.loadingArticle = false; },
      error: () => { this.loadingArticle = false; }
    });
  }
}
