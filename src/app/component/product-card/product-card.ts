import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { ProductVariant } from '../../models/models';
import { Context } from '../../service/context';
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

  private readonly context = inject(Context);
  private readonly router = inject(Router);

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

  private resolveSlugsFromVariantCategory(): string[] | null {
    const path = findCategoryPathByCategoryId(this.context.categoryGroups(), this.variant().product.categoryId);
    return path ? getCategoryPathSlugs(path.group, path.category, path.subGroup) : null;
  }
}
