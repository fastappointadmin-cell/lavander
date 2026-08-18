import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Context } from '../../service/context';
import { getCategoryPathSlugs } from '../../utils/category-path.util';
import {
  buildVariantTagRows,
  findBestMatchingVariant,
  selectionFromVariant,
  VariantSelection,
} from '../../utils/variant-selector.util';

@Component({
  selector: 'app-product-detail',
  imports: [],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
})
export class ProductDetail {
  private readonly context = inject(Context);
  private readonly router = inject(Router);

  protected readonly starIndices = [1, 2, 3, 4, 5];

  protected readonly variant = this.context.selectedVariant;
  protected readonly categoryPath = this.context.selectedCategoryPath;

  protected readonly tagRows = computed(() => buildVariantTagRows(this.context.selectedProductVariants()));

  protected readonly currentSelection = computed<VariantSelection>(() => {
    const variant = this.variant();
    return variant ? selectionFromVariant(variant) : {};
  });

  protected onTagClick(propertyDefinitionId: number, value: string): void {
    const path = this.categoryPath();
    const productId = this.context.selectedProductId();
    if (!path || productId === null) {
      return;
    }

    const targetSelection: VariantSelection = { ...this.currentSelection(), [propertyDefinitionId]: value };
    const match = findBestMatchingVariant(this.context.selectedProductVariants(), targetSelection);
    if (!match) {
      return;
    }

    const slugs = getCategoryPathSlugs(path.group, path.category, path.subGroup);
    this.router.navigate(['/products', ...slugs, 'product', productId, 'variant', match.id]);
  }

  protected onCategoryBreadcrumbClick(): void {
    const path = this.categoryPath();
    if (!path) {
      return;
    }
    const slugs = getCategoryPathSlugs(path.group, path.category, path.subGroup);
    this.router.navigate(['/products', ...slugs]);
  }
}
