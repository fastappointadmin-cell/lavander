import { Component, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { ProductCategoryGroup, ProductVariant } from '../../models/models';
import { findCategoryPathByCategoryId, getCategoryPathSlugs } from '../../utils/category-path.util';

@Component({
  selector: 'app-search-results',
  imports: [],
  templateUrl: './search-results.html',
  styleUrl: './search-results.scss',
})
export class SearchResults {
  query = input.required<string>();
  results = input.required<ProductVariant[]>();
  categoryGroups = input<ProductCategoryGroup[]>([]);
  resultSelected = output<void>();

  private readonly router = inject(Router);

  protected onResultClick(variant: ProductVariant): void {
    const path = findCategoryPathByCategoryId(this.categoryGroups(), variant.product.categoryId);
    if (!path) {
      return;
    }
    const slugs = getCategoryPathSlugs(path.group, path.category, path.subGroup);
    this.router.navigate(['/products', ...slugs, 'product', variant.product.id, 'variant', variant.id]);
    this.resultSelected.emit();
  }
}
