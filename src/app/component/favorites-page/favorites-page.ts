import { Component, inject } from '@angular/core';
import { ProductCard } from '../product-card/product-card';
import { Favorites } from '../../service/favorites';

@Component({
  selector: 'app-favorites-page',
  imports: [ProductCard],
  templateUrl: './favorites-page.html',
  styleUrl: './favorites-page.scss',
})
export class FavoritesPage {
  protected readonly favorites = inject(Favorites);
}
