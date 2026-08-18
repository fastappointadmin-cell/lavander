# Product Detail Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a single-product detail view to `lavander` with tag-based variant switching, reusing the already-live category/product/variant data path — no backend changes.

**Architecture:** A pure utility module computes variant tag rows and best-match variant selection from a product's variant list. `Context` gains URL-derived product/variant signals (parsed from a `product/:id/variant/:id?` suffix appended after the existing category slug path) and a richer category-path signal. A new `ProductDetail` component (swapped in by `Layout` in place of `Sidebar`+`ProductPage`) renders the page; `ProductCard` becomes clickable, navigating to the matching variant's URL.

**Tech Stack:** Angular (standalone components, signals, `@if`/`@for` control flow), Tailwind CSS utility classes (no component-scoped SCSS, matching existing convention), RxJS interop (`toSignal`/`toObservable`).

## Global Constraints

- No backend changes — everything is served by the already-implemented `GET /api/products/{productId}/variants`.
- No worktree/isolation for this plan: the checkout has essential uncommitted foundation work (from a parallel session) that a fresh worktree would not include. Work happens directly in `/Users/adrianazoitei/workspace/lavander` on `main`.
- No automated tests are added: this codebase has zero test coverage precedent beyond the Angular CLI default `app.spec.ts` (verified: no other `.spec.ts` files exist). Each task's "verify" step is a manual check (type-check + targeted manual/browser check); the final task is a full browser walkthrough via the dev server.
- Component style: empty `.scss` files, all styling via Tailwind utility classes in the template — matches every existing component.
- New/changed public signal and function names (for cross-task consistency):
  - `Context.selectedProductId: Signal<number | null>`
  - `Context.selectedVariantId: Signal<number | null>`
  - `Context.selectedProductVariants: Signal<ProductVariant[]>`
  - `Context.selectedVariant: Signal<ProductVariant | null>`
  - `Context.selectedCategoryPath: Signal<CategoryPath | null>` (replaces the internals of `selectedCategorySignal`, which keeps its existing type/behavior for existing callers)
  - `category-path.util.ts`: `CategoryPath` interface, `findCategoryPathBySlugs(groups, slugs)` (replaces `findCategoryBySlugs`, its only caller is `Context`)
  - `variant-selector.util.ts`: `VariantTagRow`, `VariantSelection`, `buildVariantTagRows(variants)`, `selectionFromVariant(variant)`, `findBestMatchingVariant(variants, targetSelection)`

---

### Task 1: Variant selector utility

**Files:**
- Create: `src/app/utils/variant-selector.util.ts`

**Interfaces:**
- Produces: `VariantTagRow { propertyDefinitionId: number; propertyName: string; values: string[] }`, `VariantSelection = Record<number, string>`, `buildVariantTagRows(variants: ProductVariant[]): VariantTagRow[]`, `selectionFromVariant(variant: ProductVariant): VariantSelection`, `findBestMatchingVariant(variants: ProductVariant[], targetSelection: VariantSelection): ProductVariant | null`

- [ ] **Step 1: Create the utility file**

```typescript
import { ProductVariant } from '../models/models';

export interface VariantTagRow {
  propertyDefinitionId: number;
  propertyName: string;
  values: string[];
}

export type VariantSelection = Record<number, string>;

/**
 * One row per property that has more than one distinct value across the
 * given variants (a property with a single observed value isn't a
 * switchable row).
 */
export function buildVariantTagRows(variants: ProductVariant[]): VariantTagRow[] {
  const rowsById = new Map<number, VariantTagRow>();

  for (const variant of variants) {
    for (const propertyValue of variant.variantProperties) {
      const propertyId = propertyValue.propertyDefinition.id;
      let row = rowsById.get(propertyId);
      if (!row) {
        row = {
          propertyDefinitionId: propertyId,
          propertyName: propertyValue.propertyDefinition.propertyName,
          values: [],
        };
        rowsById.set(propertyId, row);
      }
      if (!row.values.includes(propertyValue.propertyValue)) {
        row.values.push(propertyValue.propertyValue);
      }
    }
  }

  return Array.from(rowsById.values()).filter((row) => row.values.length > 1);
}

/** The selection implied by a variant's own property values. */
export function selectionFromVariant(variant: ProductVariant): VariantSelection {
  const selection: VariantSelection = {};
  for (const propertyValue of variant.variantProperties) {
    selection[propertyValue.propertyDefinition.id] = propertyValue.propertyValue;
  }
  return selection;
}

function matchScore(variant: ProductVariant, selection: VariantSelection): number {
  let score = 0;
  for (const propertyValue of variant.variantProperties) {
    if (selection[propertyValue.propertyDefinition.id] === propertyValue.propertyValue) {
      score++;
    }
  }
  return score;
}

/**
 * Finds the variant matching every value in the target selection exactly;
 * if none matches exactly (incomplete matrix), falls back to the variant
 * sharing the most matching values with the target selection.
 */
export function findBestMatchingVariant(
  variants: ProductVariant[],
  targetSelection: VariantSelection,
): ProductVariant | null {
  if (variants.length === 0) {
    return null;
  }

  const requiredCount = Object.keys(targetSelection).length;
  const exactMatch = variants.find((variant) => matchScore(variant, targetSelection) === requiredCount);
  if (exactMatch) {
    return exactMatch;
  }

  return variants.reduce((best, candidate) =>
    matchScore(candidate, targetSelection) > matchScore(best, targetSelection) ? candidate : best,
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

---

### Task 2: `Context` and `category-path.util.ts` changes

**Files:**
- Modify: `src/app/utils/category-path.util.ts`
- Modify: `src/app/service/context.ts`

**Interfaces:**
- Consumes: `ProductCategoryGroup`, `ProductSubCategoryGroup`, `ProductCategory`, `ProductVariant` (from `models.ts`)
- Produces: `CategoryPath { group: ProductCategoryGroup; subGroup?: ProductSubCategoryGroup; category: ProductCategory }`, `findCategoryPathBySlugs(groups, slugs): CategoryPath | null`; `Context.selectedProductId`, `Context.selectedVariantId`, `Context.selectedProductVariants`, `Context.selectedVariant`, `Context.selectedCategoryPath` (all as listed in Global Constraints)

- [ ] **Step 1: Replace `findCategoryBySlugs` with `findCategoryPathBySlugs` in `category-path.util.ts`**

Replace the whole `findCategoryBySlugs` function (and its doc comment) with:

```typescript
export interface CategoryPath {
  group: ProductCategoryGroup;
  subGroup?: ProductSubCategoryGroup;
  category: ProductCategory;
}

/**
 * Resolves a category (with its group/subGroup) from its URL slug segments
 * (2 segments = group/category, 3 segments = group/subGroup/category).
 * Returns null if no match is found.
 */
export function findCategoryPathBySlugs(
  groups: ProductCategoryGroup[],
  slugs: string[],
): CategoryPath | null {
  const group = groups.find((candidate) => slugify(candidate.groupName) === slugs[0]);
  if (!group) {
    return null;
  }

  if (slugs.length === 2) {
    const [, categorySlug] = slugs;
    const category = group.categories.find((candidate) => slugify(candidate.categoryName) === categorySlug);
    return category ? { group, category } : null;
  }

  if (slugs.length === 3) {
    const [, subGroupSlug, categorySlug] = slugs;
    const subGroup = group.subGroups.find((candidate) => slugify(candidate.groupName) === subGroupSlug);
    if (!subGroup) {
      return null;
    }
    const category = subGroup.categories.find((candidate) => slugify(candidate.categoryName) === categorySlug);
    return category ? { group, subGroup, category } : null;
  }

  return null;
}
```

The rest of the file (`slugify`, `getCategoryPathSlugs`) is unchanged.

- [ ] **Step 2: Rewrite `context.ts`**

```typescript
import { Injectable, Signal, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, of, startWith, switchMap } from 'rxjs';
import { Product, ProductCategory, ProductVariant } from '../models/models';
import { ProductCatalog } from './product-catalog';
import { CategoryPath, findCategoryPathBySlugs } from '../utils/category-path.util';

@Injectable({
  providedIn: 'root'
})
export class Context {

    private readonly router = inject(Router);
    private readonly productCatalog = inject(ProductCatalog);

    private readonly categoryGroups = toSignal(this.productCatalog.getCategoryGroups(), { initialValue: [] });

    // Reads the current URL's segments fresh on every completed navigation, rather than
    // named route params, since products/** is a single route (any depth), so there are no
    // named route params to read off it.
    private readonly routeSegments: Signal<string[]> = toSignal(
        this.router.events.pipe(
            filter((event): event is NavigationEnd => event instanceof NavigationEnd),
            map(() => this.currentPathSegments()),
            startWith(this.currentPathSegments()),
        ),
        { initialValue: this.currentPathSegments() },
    );

    private readonly categorySlugs: Signal<string[]> = computed(() => {
        const segments = this.routeSegments();
        const productMarkerIndex = segments.indexOf('product');
        return productMarkerIndex === -1 ? segments : segments.slice(0, productMarkerIndex);
    });

    readonly selectedProductId: Signal<number | null> = computed(() => {
        return this.idAfterMarker('product');
    });

    readonly selectedVariantId: Signal<number | null> = computed(() => {
        return this.idAfterMarker('variant');
    });

    // Pure derivation: category path comes straight from the route + the (already loaded) category tree.
    readonly selectedCategoryPath: Signal<CategoryPath | null> = computed(() => {
        const slugs = this.categorySlugs();
        const groups = this.categoryGroups();
        if (slugs.length === 0) {
            return null;
        }

        return findCategoryPathBySlugs(groups, slugs);
    });

    readonly selectedCategorySignal: Signal<ProductCategory | null> = computed(() => {
        return this.selectedCategoryPath()?.category ?? null;
    });

    readonly selectedCategoryProducts: Signal<Product[]> = toSignal(
        toObservable(this.selectedCategorySignal).pipe(
            switchMap((category) => {
                if (!category) {
                    return of([]);
                }
                return this.productCatalog.getProductsByCategory(category.id);
            }),
        ),
        { initialValue: [] },
    );

    readonly selectedCategoryVariants: Signal<ProductVariant[]> = toSignal(
        toObservable(this.selectedCategoryProducts).pipe(
            switchMap((products) => {
                if (products.length === 0) {
                    return of([]);
                }
                return forkJoin(
                    products.map((product) => this.productCatalog.getVariantsByProductId(product.id)),
                ).pipe(map((variantsArrays) => variantsArrays.flat()));
            }),
        ),
        { initialValue: [] },
    );

    readonly selectedProductVariants: Signal<ProductVariant[]> = toSignal(
        toObservable(this.selectedProductId).pipe(
            switchMap((productId) => {
                if (productId === null) {
                    return of([]);
                }
                return this.productCatalog.getVariantsByProductId(productId);
            }),
        ),
        { initialValue: [] },
    );

    readonly selectedVariant: Signal<ProductVariant | null> = computed(() => {
        const variants = this.selectedProductVariants();
        if (variants.length === 0) {
            return null;
        }
        const variantId = this.selectedVariantId();
        return variants.find((variant) => variant.id === variantId) ?? variants[0];
    });

    private currentPathSegments(): string[] {
        const path = this.router.url.split('?')[0].split('#')[0];
        const segments = path.split('/').filter((segment) => segment.length > 0);
        if (segments[0] !== 'products') {
            return [];
        }
        return segments.slice(1);
    }

    private idAfterMarker(marker: string): number | null {
        const segments = this.routeSegments();
        const markerIndex = segments.indexOf(marker);
        if (markerIndex === -1) {
            return null;
        }
        const id = Number(segments[markerIndex + 1]);
        return Number.isFinite(id) ? id : null;
    }

}
```

Note: `forkJoin` must stay imported from `rxjs` (it's used by the unchanged `selectedCategoryVariants`) — add it back to the `rxjs` import alongside `filter, map, of, startWith, switchMap`.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors (any error here means a caller of `findCategoryBySlugs`/old `selectedCategorySignal` internals was missed — there should be none besides what this task already updated).

---

### Task 3: `ProductDetail` component

**Files:**
- Create: `src/app/component/product-detail/product-detail.ts`
- Create: `src/app/component/product-detail/product-detail.html`
- Create: `src/app/component/product-detail/product-detail.scss` (empty, matches convention)

**Interfaces:**
- Consumes: `Context.selectedVariant`, `Context.selectedCategoryPath`, `Context.selectedProductVariants`, `Context.selectedProductId` (Task 2); `buildVariantTagRows`, `selectionFromVariant`, `findBestMatchingVariant`, `VariantSelection` (Task 1); `getCategoryPathSlugs` (existing, unchanged)

- [ ] **Step 1: Create `product-detail.ts`**

```typescript
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
}
```

- [ ] **Step 2: Create `product-detail.html`**

```html
@if (variant(); as v) {
  <div class="min-w-0 border border-gray-200 rounded-xl bg-white p-6">
    @if (categoryPath(); as path) {
      <nav class="text-xs text-gray-500 mb-4 flex flex-wrap items-center gap-1">
        <span>{{ path.group.groupName }}</span>
        @if (path.subGroup) {
          <span>/</span>
          <span>{{ path.subGroup.groupName }}</span>
        }
        <span>/</span>
        <span>{{ path.category.categoryName }}</span>
        <span>/</span>
        <span class="text-gray-700">{{ v.product.productName }}</span>
      </nav>
    }

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div class="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-gray-300">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="9" cy="9" r="2"/>
          <path d="m21 15-5-5L5 21"/>
        </svg>
      </div>

      <div class="flex flex-col gap-4">
        <div>
          <p class="text-sm text-gray-500">{{ v.product.productName }}</p>
          <h1 class="text-xl font-semibold text-gray-900 mt-1">{{ v.variantName }}</h1>
          <p class="text-sm text-gray-500 mt-1">{{ v.variantDescription }}</p>
        </div>

        <div class="flex items-center gap-0.5">
          @for (star of starIndices; track star) {
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              [attr.fill]="star <= v.starRating ? '#f59e0b' : 'none'"
              stroke="#f59e0b"
              stroke-width="1.5"
              stroke-linejoin="round"
            >
              <polygon points="12 2 15.09 8.63 22 9.24 16.5 13.97 18.18 21 12 17.27 5.82 21 7.5 13.97 2 9.24 8.91 8.63 12 2"/>
            </svg>
          }
        </div>

        <p class="text-2xl font-bold text-gray-900">{{ v.price }} Lei</p>

        @for (row of tagRows(); track row.propertyDefinitionId) {
          <div>
            <p class="text-sm text-gray-700 mb-2">
              Alege {{ row.propertyName }}: <span class="font-medium">{{ currentSelection()[row.propertyDefinitionId] }}</span>
            </p>
            <div class="flex flex-wrap gap-2">
              @for (value of row.values; track value) {
                <button
                  type="button"
                  (click)="onTagClick(row.propertyDefinitionId, value)"
                  class="px-4 py-2 rounded-full border text-sm transition-colors"
                  [class.border-violet-600]="currentSelection()[row.propertyDefinitionId] === value"
                  [class.text-violet-600]="currentSelection()[row.propertyDefinitionId] === value"
                  [class.border-gray-300]="currentSelection()[row.propertyDefinitionId] !== value"
                  [class.text-gray-700]="currentSelection()[row.propertyDefinitionId] !== value"
                >
                  {{ value }}
                </button>
              }
            </div>
          </div>
        }

        <button
          type="button"
          class="min-h-11 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white text-sm font-medium rounded-md transition-all mt-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          Adauga in Cos
        </button>
      </div>
    </div>
  </div>
} @else {
  <div class="min-w-0 border border-gray-200 rounded-xl bg-white p-6">
    <p class="text-sm text-gray-500">Produsul nu a fost gasit.</p>
  </div>
}
```

- [ ] **Step 3: Create empty `product-detail.scss`**

Empty file (Tailwind-only styling, matches every existing component).

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

---

### Task 4: Wire `ProductDetail` into `Layout`

**Files:**
- Modify: `src/app/component/layout/layout.ts`
- Modify: `src/app/component/layout/layout.html`

**Interfaces:**
- Consumes: `Context.selectedProductId` (Task 2), `ProductDetail` (Task 3)

- [ ] **Step 1: Update `layout.ts`**

```typescript
import { Component, computed, inject, Signal } from '@angular/core';
import { Navbar } from "../navbar/navbar";
import { ProductPage } from "../product-page/product-page";
import { ProductDetail } from "../product-detail/product-detail";
import { Sidebar } from "../sidebar/sidebar";
import { Context } from '../../service/context';

@Component({
  selector: 'app-layout',
  imports: [Navbar, ProductPage, ProductDetail, Sidebar],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {

  context = inject(Context);

  isCategorySelected: Signal<boolean> = computed(() => {
    return this.context.selectedCategorySignal() !== null;
  });

  isProductSelected: Signal<boolean> = computed(() => {
    return this.context.selectedProductId() !== null;
  });

}
```

- [ ] **Step 2: Update `layout.html`**

```html
<app-navbar></app-navbar>

<div class="w-full px-6 md:px-16 lg:px-24 xl:px-32 py-8 bg-gray-50">
  <div class="flex items-start gap-4">
    @if (isProductSelected()) {
      <app-product-detail class="flex-1 min-w-0"></app-product-detail>
    } @else {
      @if (isCategorySelected()) {
        <app-sidebar></app-sidebar>
      }
      <app-product-page class="flex-1 min-w-0"></app-product-page>
    }
  </div>
</div>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

---

### Task 5: Make `ProductCard` clickable

**Files:**
- Modify: `src/app/component/product-card/product-card.ts`
- Modify: `src/app/component/product-card/product-card.html`

**Interfaces:**
- Consumes: `Context.selectedCategoryPath` (Task 2), `getCategoryPathSlugs` (existing)

- [ ] **Step 1: Update `product-card.ts`**

```typescript
import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { ProductVariant } from '../../models/models';
import { Context } from '../../service/context';
import { getCategoryPathSlugs } from '../../utils/category-path.util';

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
    if (!path) {
      return;
    }
    const slugs = getCategoryPathSlugs(path.group, path.category, path.subGroup);
    this.router.navigate(['/products', ...slugs, 'product', this.variant().product.id, 'variant', this.variant().id]);
  }
}
```

- [ ] **Step 2: Update `product-card.html`**

Add `(click)="onCardClick()"` and a pointer cursor to the root `<article>`, and stop the add-to-cart button's click from bubbling into the card's navigation:

```html
<article (click)="onCardClick()" class="border border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow cursor-pointer">
```

(keep everything else in the file the same) and on the existing "Adauga in Cos" `<button>`, add `(click)="$event.stopPropagation()"` alongside its existing attributes.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

---

### Task 6: Multi-variant seed data

**Files:**
- Modify: `/Users/adrianazoitei/workspace/estore/scripts/seed-catalog-data.sql`

- [ ] **Step 1: Add a second Apple variant (varies by RAM only) and a second Ariel variant (varies by Cantitate only)**

In the `product_variant` INSERT block, add two rows after the existing 9:

```sql
  (10, 'MacBook Pro 14 (24GB)', '14-inch MacBook Pro, 24GB RAM', 2, 11999, 5),
  (11, 'Ariel Detergent Lichid Alpine XXL', 'Detergent lichid pentru rufe Ariel, format XXL', 4, 110, 4);
```

(change the trailing `;` on the existing 9-row statement to `,` and append the two rows above, ending in `;`)

In the `property_value` INSERT block, add five rows after the existing 19 (change the trailing `;` to `,` and append):

```sql
  (20, 10, 1, '24GB'),
  (21, 10, 2, '14 inch'),
  (22, 10, 3, 'M3 Pro'),
  (23, 11, 4, 'Lichid'),
  (24, 11, 5, '5.5L');
```

- [ ] **Step 2: Re-apply the seed script and verify**

Run: `PGPASSWORD=parola123 /Library/PostgreSQL/17/bin/psql -h localhost -p 5433 -U postgres -d lavander -f scripts/seed-catalog-data.sql` (from `/Users/adrianazoitei/workspace/estore`)
Expected: `INSERT 0 11` for `product_variant`, `INSERT 0 24` for `property_value`, `COMMIT` at the end, no errors.

Then verify with:
```sql
SELECT pv.id, pv.variant_name, p.product_name FROM product_variant pv JOIN product p ON p.id = pv.product_id WHERE p.product_name IN ('Apple', 'Ariel') ORDER BY pv.id;
```
Expected: 2 rows for Apple (ids 2, 10), 2 rows for Ariel (ids 4, 11).

---

### Task 7: Full browser verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run (from `/Users/adrianazoitei/workspace/lavander`): `npm start` (or `ng serve`) in the background, confirm it compiles with no errors and serves on `http://localhost:4200`.

- [ ] **Step 2: Golden path — browse to a category, click a product, switch variants**

In a browser (or via the Playwright MCP tools): navigate to a category page with products (e.g. Electronics → Computers → Laptops), click the Apple product card, confirm the detail page loads showing the MacBook Pro 14 (18GB) or (24GB) variant, confirm a "RAM" tag row appears with both values, click the other RAM value, confirm the page navigates and now shows the other variant's data (name, price, price 11999 vs 9999) with the tag row's selected state updated to match.

- [ ] **Step 3: Second product — Ariel**

Navigate to Curatenie → Detergenti → click Ariel, confirm a "Cantitate" tag row with `3.6L` and `5.5L`, click the other value, confirm it navigates to the other variant.

- [ ] **Step 4: Single-variant product still works**

Click a product that only has one variant (e.g. Dell, Lenovo). Confirm the detail page renders correctly with no tag rows (since no property varies across a single-element list).

- [ ] **Step 5: Breadcrumb and back-navigation**

Confirm the breadcrumb shows the correct Group / Subgroup(if any) / Category / Product name for both a subgroup-nested category (Laptops) and a direct-under-group category (Detergenti). Use the browser back button, confirm it returns to the grid view for the correct category (not a stale/broken state).
