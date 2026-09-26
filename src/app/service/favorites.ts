import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ProductVariant } from '../models/models';
import { Auth } from './auth';
import { environment } from '../../env/env';

@Injectable({ providedIn: 'root' })
export class Favorites {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(Auth);
  private readonly baseUrl = environment.backendUrl;

  private readonly favoriteVariants = signal<ProductVariant[]>([]);
  readonly variants = this.favoriteVariants.asReadonly();
  readonly ids = computed(() => new Set(this.favoriteVariants().map((v) => v.id)));

  constructor() {
    // Loads once auth's own session restore has settled, and again on every
    // login/logout — cleared entirely when logged out rather than left stale.
    effect(() => {
      if (!this.auth.ready()) {
        return;
      }
      if (this.auth.isAuthenticated()) {
        this.loadFavorites();
      } else {
        this.favoriteVariants.set([]);
      }
    });
  }

  loadFavorites(): void {
    this.http.get<ProductVariant[]>(`${this.baseUrl}/api/favorites`).subscribe({
      next: (variants) => this.favoriteVariants.set(variants),
      error: () => this.favoriteVariants.set([]),
    });
  }

  isFavorite(variantId: number): boolean {
    return this.ids().has(variantId);
  }

  toggle(variantId: number): void {
    if (this.isFavorite(variantId)) {
      this.http.delete<void>(`${this.baseUrl}/api/favorites/${variantId}`).subscribe({
        next: () => this.favoriteVariants.update((list) => list.filter((v) => v.id !== variantId)),
      });
    } else {
      this.http.post<void>(`${this.baseUrl}/api/favorites/${variantId}`, {}).subscribe({
        next: () => this.loadFavorites(),
      });
    }
  }
}
