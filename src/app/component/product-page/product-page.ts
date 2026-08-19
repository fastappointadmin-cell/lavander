import { Component, inject, signal } from '@angular/core';
import { Context } from '../../service/context';
import { ProductCard } from '../product-card/product-card';
import { ProductToolbar } from '../product-toolbar/product-toolbar';
import { Sidebar } from '../sidebar/sidebar';

@Component({
  selector: 'app-product-page',
  imports: [ProductCard, ProductToolbar, Sidebar],
  templateUrl: './product-page.html',
  styleUrl: './product-page.scss',
})
export class ProductPage {
  protected readonly context = inject(Context);
  protected readonly variants = this.context.filteredCategoryVariants;

  protected readonly mobileFiltersOpen = signal(false);

  protected onMobileFiltersToggle(): void {
    this.mobileFiltersOpen.update((open) => !open);
  }

  protected onMobileFiltersClear(): void {
    this.context.clearFilters();
  }
}
