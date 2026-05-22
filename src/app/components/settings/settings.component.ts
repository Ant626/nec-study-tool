// src/app/components/settings/settings.component.ts
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

declare global {
  interface Window {
    electronAPI?: {
      saveApiKey(key: string): Promise<void>;
      getApiKey(): Promise<string>;
    };
  }
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatSnackBarModule, MatCardModule, MatIconModule
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit {
  apiKey = '';
  readonly isElectron = typeof window !== 'undefined' && !!window['electronAPI'];

  constructor(private snackBar: MatSnackBar) {}

  async ngOnInit(): Promise<void> {
    if (this.isElectron) {
      this.apiKey = await window.electronAPI!.getApiKey();
    }
  }

  async save(): Promise<void> {
    await window.electronAPI!.saveApiKey(this.apiKey);
    this.snackBar.open('API key saved', 'OK', { duration: 3000 });
  }
}
