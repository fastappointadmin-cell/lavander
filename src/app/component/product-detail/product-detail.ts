import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Context } from '../../service/context';
import { getCategoryPathSlugs } from '../../utils/category-path.util';
import {
  buildVariantTagRows,
  findVariantForTagClick,
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

  // Variant name plus its differentiating property values (e.g. "Ariel Detergent
  // Lichid Alpine XXL, Lichid, 5.5L"), matching the product card's title.
  protected readonly title = computed(() => {
    const v = this.variant();
    if (!v) {
      return '';
    }
    const properties = v.variantProperties.map((p) => p.propertyValue);
    return properties.length > 0 ? `${v.variantName}, ${properties.join(', ')}` : v.variantName;
  });

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

    const match = findVariantForTagClick(this.context.selectedProductVariants(), this.currentSelection(), propertyDefinitionId, value);
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
