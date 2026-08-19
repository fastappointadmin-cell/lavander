import { Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { ProductVariant } from '../../models/models';
import { Context } from '../../service/context';
import { CartStore } from '../../service/cart-store';
import { findCategoryPathByCategoryId, getCategoryPathSlugs } from '../../utils/category-path.util';

@Component({
  selector: 'app-product-card',
  imports: [],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
})
export class ProductCard {
  variant = input.required<ProductVariant>();

  protected readonly starIndices = [1, 2, 3, 4, 5];

  // Variant name plus its differentiating property values (e.g. "Ariel Detergent
  // Lichid Alpine, Lichid, 3.6L"), so a card distinguishes variants at a glance.
  protected readonly title = computed(() => {
    const v = this.variant();
    const properties = v.variantProperties.map((p) => p.propertyValue);
    return properties.length > 0 ? `${v.variantName}, ${properties.join(', ')}` : v.variantName;
  });

  private readonly context = inject(Context);
  private readonly router = inject(Router);
  private readonly cartStore = inject(CartStore);

  protected onCardClick(): void {
    const path = this.context.selectedCategoryPath();
    const slugs = path
      ? getCategoryPathSlugs(path.group, path.category, path.subGroup)
      : this.resolveSlugsFromVariantCategory();
    if (!slugs) {
      return;
    }
    this.router.navigate(['/products', ...slugs, 'product', this.variant().product.id, 'variant', this.variant().id]);
  }

  protected onAddToCart(): void {
    this.cartStore.addItem(this.variant().id, 1);
  }

  private resolveSlugsFromVariantCategory(): string[] | null {
    const path = findCategoryPathByCategoryId(this.context.categoryGroups(), this.variant().product.categoryId);
    return path ? getCategoryPathSlugs(path.group, path.category, path.subGroup) : null;
  }
}
