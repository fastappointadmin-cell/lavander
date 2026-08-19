import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Context } from '../../service/context';
import { ProductCatalog } from '../../service/product-catalog';
import { ProductVariant } from '../../models/models';
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
  private readonly productCatalog = inject(ProductCatalog);

  protected readonly starIndices = [1, 2, 3, 4, 5];

  protected readonly categoryPath = this.context.selectedCategoryPath;

  private readonly reviewOverride = signal<ProductVariant | null>(null);

  protected readonly variant = computed(() => {
    const live = this.context.selectedVariant();
    const override = this.reviewOverride();
    return override && live && override.id === live.id ? override : live;
  });

  protected readonly tagRows = computed(() => buildVariantTagRows(this.context.selectedProductVariants()));

  protected readonly currentSelection = computed<VariantSelection>(() => {
    const variant = this.variant();
    return variant ? selectionFromVariant(variant) : {};
  });

  protected readonly selectedReviewRating = signal(0);
  protected readonly submittingReview = signal(false);
  protected readonly reviewSubmitted = signal(false);

  private readonly resetReviewStateOnVariantChange = effect(() => {
    this.context.selectedVariant();
    this.selectedReviewRating.set(0);
    this.reviewSubmitted.set(false);
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

  protected onStarPick(rating: number): void {
    this.selectedReviewRating.set(rating);
  }

  protected onSubmitReview(): void {
    const variant = this.variant();
    const rating = this.selectedReviewRating();
    if (!variant || rating === 0) {
      return;
    }

    this.submittingReview.set(true);
    this.productCatalog.submitReview(variant.id, { rating }).subscribe({
      next: (updated) => {
        this.reviewOverride.set(updated);
        this.selectedReviewRating.set(0);
        this.reviewSubmitted.set(true);
        this.submittingReview.set(false);
      },
      error: () => {
        this.submittingReview.set(false);
      },
    });
  }
}
