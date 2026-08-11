import { Component, inject } from '@angular/core';
import { Context } from '../../service/context';
import { ProductCard } from '../product-card/product-card';
import { ProductToolbar } from '../product-toolbar/product-toolbar';

@Component({
  selector: 'app-product-page',
  imports: [ProductCard, ProductToolbar],
  templateUrl: './product-page.html',
  styleUrl: './product-page.scss',
})
export class ProductPage {
  protected readonly context = inject(Context);
  protected readonly variants = this.context.selectedCategoryVariants;
}
