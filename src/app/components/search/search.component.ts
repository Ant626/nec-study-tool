// src/app/components/search/search.component.ts
import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { Subject, Subscription, debounceTime, switchMap, of } from 'rxjs';
import { NecApiService, SearchResult } from '../../services/nec-api.service';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatFormFieldModule, MatInputModule,
    MatIconModule, MatListModule, MatProgressSpinnerModule, MatDividerModule
  ],
  templateUrl: './search.component.html',
  styleUrl: './search.component.css'
})
export class SearchComponent implements OnDestroy {
  query = '';
  results: SearchResult[] = [];
  searching = false;
  searched = false;

  private readonly search$ = new Subject<string>();
  private readonly sub: Subscription;

  constructor(private necApi: NecApiService, private router: Router) {
    this.sub = this.search$.pipe(
      debounceTime(300),
      switchMap(q => {
        if (q.trim().length < 2) return of([]);
        this.searching = true;
        return this.necApi.search(q);
      })
    ).subscribe(results => {
      this.results = results;
      this.searching = false;
      this.searched = true;
    });
  }

  onQueryChange(): void {
    this.search$.next(this.query);
  }

  goToArticle(): void {
    this.router.navigate(['/browse']);
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
