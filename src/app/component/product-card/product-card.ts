import { Component, input } from '@angular/core';
import { ProductVariant } from '../../models/models';

@Component({
  selector: 'app-product-card',
  imports: [],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
})
export class ProductCard {
  variant = input.required<ProductVariant>();

  protected readonly starIndices = [1, 2, 3, 4, 5];
}
