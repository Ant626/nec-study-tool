// src/app/app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'browse',
    loadComponent: () =>
      import('./components/browse/browse.component').then(m => m.BrowseComponent)
  },
  {
    path: 'search',
    loadComponent: () =>
      import('./components/search/search.component').then(m => m.SearchComponent)
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./components/settings/settings.component').then(m => m.SettingsComponent)
  },
  { path: '', redirectTo: '/browse', pathMatch: 'full' }
];
