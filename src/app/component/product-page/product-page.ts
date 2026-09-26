import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap, map, of } from 'rxjs';
import { Context } from '../../service/context';
import { ProductCatalog } from '../../service/product-catalog';
import { ProductCard } from '../product-card/product-card';
import { ProductToolbar } from '../product-toolbar/product-toolbar';
import { Sidebar } from '../sidebar/sidebar';
import { randomSample } from '../../utils/random-sample.util';

const RECOMMENDED_COUNT = 8;

@Component({
  selector: 'app-product-page',
  imports: [ProductCard, ProductToolbar, Sidebar],
  templateUrl: './product-page.html',
  styleUrl: './product-page.scss',
})
export class ProductPage {
  protected readonly context = inject(Context);
  private readonly productCatalog = inject(ProductCatalog);

  protected readonly variants = this.context.filteredCategoryVariants;

  // The home page ("/", nothing browsed yet) has no category to list — show a random
  // sample of the whole catalog instead of an empty grid.
  protected readonly isNothingSelected = computed(() => this.context.selectedCategorySignal() === null);

  protected readonly recommendedVariants = toSignal(
    toObservable(this.isNothingSelected).pipe(
      switchMap((nothingSelected) =>
        nothingSelected
          ? this.productCatalog.getAllVariants().pipe(map((variants) => randomSample(variants, RECOMMENDED_COUNT)))
          : of([]),
      ),
    ),
    { initialValue: [] },
  );

  protected readonly mobileFiltersOpen = signal(false);

  protected onMobileFiltersToggle(): void {
    this.mobileFiltersOpen.update((open) => !open);
  }

  protected onMobileFiltersClear(): void {
    this.context.clearFilters();
  }
}
