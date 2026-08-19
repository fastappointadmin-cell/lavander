# Product Reviews UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the manual "Star rating" admin input and add a real review-submission widget to the product detail page, wired to the backend's new `Review` mechanism.

**Architecture:** `ProductVariant.starRating` keeps its `number` type (already covers a fractional average) and gains `reviewCount`. `ProductVariantRequest` drops `starRating` — it's no longer settable. `ProductCatalog` gains one `submitReview` method. The product detail page renders a star-picker + submit button as a 4th sibling in its existing grid-auto-flow layout, and locally overrides the displayed variant with the POST response so the new average shows immediately without a follow-up GET.

**Tech Stack:** Angular 22 standalone components, signals, `HttpClient` — same stack as the rest of this codebase, no new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-19-product-reviews-ui-design.md`

**Depends on:** `estore`'s `docs/superpowers/plans/2026-08-19-product-reviews-api.md` must be implemented and the backend running first — `ProductVariantDto` needs to already return `reviewCount` and the `POST /api/products/variants/{id}/reviews` endpoint needs to exist for Task 3's manual verification to work. Tasks 1-2's own `tsc` checks don't need the backend running.

## Global Constraints

- Root: `src/app/`.
- Full-file rewrites for modified files (shown in full below), matching this codebase's established convention.
- Verify step for every code task: `npx tsc --noEmit -p tsconfig.app.json` from the `lavander` repo root — 0 errors.
- No new dependencies, no new routes.
- Romanian UI copy, matching the rest of the storefront (`Adauga in Cos`, `Specificatii`, etc.).
- This change removes a field (`ProductVariantRequest.starRating`) that `admin-variants.ts` builds into an object literal — TypeScript's excess-property check on object literals means removing it from the interface without also removing it from the literal breaks the build. So the type change and its one consumer (admin) are one compile-coupled task, same reasoning as the backend plan's Task 1.

---

### Task 1: Types, service method, and admin form field removal

**Files:**
- Modify: `src/app/models/models.ts`
- Modify: `src/app/models/admin-requests.ts`
- Modify: `src/app/service/product-catalog.ts`
- Modify: `src/app/component/admin/admin-variants/admin-variants.ts`
- Modify: `src/app/component/admin/admin-variants/admin-variants.html`

**Interfaces:**
- Produces: `ProductVariant.reviewCount: number` (models.ts); `ReviewRequest { rating: number }` (admin-requests.ts); `ProductCatalog.submitReview(variantId: number, request: ReviewRequest): Observable<ProductVariant>`.
- Removes: `ProductVariantRequest.starRating` — no longer sent on create/update.

- [ ] **Step 1: Add `reviewCount` to `ProductVariant`** — in `src/app/models/models.ts`, find the `ProductVariant` interface (currently lines 61-70) and replace it with:

```typescript
export interface ProductVariant {
  id: number;
  variantName: string;
  variantDescription: string;
  product: ProductRef;
  variantProperties: PropertyValue[];
  tags: Tag[];
  price: number;
  starRating: number;
  reviewCount: number;
}
```

- [ ] **Step 2: Drop `starRating` from `ProductVariantRequest`, add `ReviewRequest`** — replace the full file with:

```typescript
export interface PropertyDefinitionRequest {
  propertyName: string;
}

export interface ProductCategoryGroupRequest {
  groupName: string;
}

export interface ProductSubCategoryGroupRequest {
  groupName: string;
  parentGroupId: number;
}

export interface ProductCategoryRequest {
  categoryName: string;
  parentGroupId?: number;
  parentSubGroupId?: number;
  categoryPropertyIds: number[];
}

export interface ProductRequest {
  productName: string;
  productDescription: string;
  categoryId: number;
  extraPropertyIds: number[];
}

export interface PropertyValueInput {
  propertyDefinitionId: number;
  value: string;
}

export interface ProductVariantRequest {
  variantName: string;
  variantDescription: string;
  productId: number;
  price: number;
  variantProperties: PropertyValueInput[];
  tagIds: number[];
}

export interface TagRequest {
  tagName: string;
}

export interface PromotionGroupRequest {
  groupName: string;
  tagIds: number[];
}

export interface ReviewRequest {
  rating: number;
}
```

- [ ] **Step 3: Add `submitReview` to `ProductCatalog`** — replace the full file with:

```typescript
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import {
  Product,
  ProductCategory,
  ProductCategoryGroup,
  ProductSubCategoryGroup,
  ProductVariant,
  PromotionGroup,
  PropertyDefinition,
  Tag,
} from '../models/models';
import {
  ProductCategoryGroupRequest,
  ProductCategoryRequest,
  ProductRequest,
  ProductSubCategoryGroupRequest,
  ProductVariantRequest,
  PromotionGroupRequest,
  PropertyDefinitionRequest,
  ReviewRequest,
  TagRequest,
} from '../models/admin-requests';
import { environment } from '../../env/env';

@Injectable({
  providedIn: 'root'
})
export class ProductCatalog {

    constructor(private http: HttpClient){}

    private readonly baseUrl = environment.backendUrl;

    // --- Read ---

    getCategoryGroups(): Observable<ProductCategoryGroup[]> {
      return this.http.get<ProductCategoryGroup[]>(`${this.baseUrl}/api/product-categories/groups`);
    }

    getProductsByCategory(categoryId: number): Observable<Product[]> {
        return this.http.get<Product[]>(`${this.baseUrl}/api/products/category/${categoryId}`);
    }

    getVariantsByProductId(productId: number): Observable<ProductVariant[]> {
        return this.http.get<ProductVariant[]>(`${this.baseUrl}/api/products/${productId}/variants`);
    }

    // --- Property definitions ---

    getPropertyDefinitions(): Observable<PropertyDefinition[]> {
        return this.http.get<PropertyDefinition[]>(`${this.baseUrl}/api/property-definitions`);
    }

    createPropertyDefinition(request: PropertyDefinitionRequest): Observable<PropertyDefinition> {
        return this.http.post<PropertyDefinition>(`${this.baseUrl}/api/property-definitions`, request);
    }

    updatePropertyDefinition(id: number, request: PropertyDefinitionRequest): Observable<PropertyDefinition> {
        return this.http.put<PropertyDefinition>(`${this.baseUrl}/api/property-definitions/${id}`, request);
    }

    deletePropertyDefinition(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/api/property-definitions/${id}`);
    }

    // --- Groups ---

    createGroup(request: ProductCategoryGroupRequest): Observable<ProductCategoryGroup> {
        return this.http.post<ProductCategoryGroup>(`${this.baseUrl}/api/product-categories/groups`, request);
    }

    updateGroup(id: number, request: ProductCategoryGroupRequest): Observable<ProductCategoryGroup> {
        return this.http.put<ProductCategoryGroup>(`${this.baseUrl}/api/product-categories/groups/${id}`, request);
    }

    deleteGroup(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/api/product-categories/groups/${id}`);
    }

    // --- Subgroups ---

    createSubGroup(request: ProductSubCategoryGroupRequest): Observable<ProductSubCategoryGroup> {
        return this.http.post<ProductSubCategoryGroup>(`${this.baseUrl}/api/product-categories/subgroups`, request);
    }

    updateSubGroup(id: number, request: ProductSubCategoryGroupRequest): Observable<ProductSubCategoryGroup> {
        return this.http.put<ProductSubCategoryGroup>(`${this.baseUrl}/api/product-categories/subgroups/${id}`, request);
    }

    deleteSubGroup(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/api/product-categories/subgroups/${id}`);
    }

    // --- Categories ---

    createCategory(request: ProductCategoryRequest): Observable<ProductCategory> {
        return this.http.post<ProductCategory>(`${this.baseUrl}/api/product-categories`, request);
    }

    updateCategory(id: number, request: ProductCategoryRequest): Observable<ProductCategory> {
        return this.http.put<ProductCategory>(`${this.baseUrl}/api/product-categories/${id}`, request);
    }

    deleteCategory(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/api/product-categories/${id}`);
    }

    // --- Products ---

    getAllProducts(): Observable<Product[]> {
        return this.http.get<Product[]>(`${this.baseUrl}/api/products`);
    }

    createProduct(request: ProductRequest): Observable<Product> {
        return this.http.post<Product>(`${this.baseUrl}/api/products`, request);
    }

    updateProduct(id: number, request: ProductRequest): Observable<Product> {
        return this.http.put<Product>(`${this.baseUrl}/api/products/${id}`, request);
    }

    deleteProduct(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/api/products/${id}`);
    }

    // --- Variants ---

    getAllVariants(): Observable<ProductVariant[]> {
        return this.http.get<ProductVariant[]>(`${this.baseUrl}/api/products/variants`);
    }

    createVariant(request: ProductVariantRequest): Observable<ProductVariant> {
        return this.http.post<ProductVariant>(`${this.baseUrl}/api/products/variants`, request);
    }

    updateVariant(id: number, request: ProductVariantRequest): Observable<ProductVariant> {
        return this.http.put<ProductVariant>(`${this.baseUrl}/api/products/variants/${id}`, request);
    }

    deleteVariant(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/api/products/variants/${id}`);
    }

    submitReview(variantId: number, request: ReviewRequest): Observable<ProductVariant> {
        return this.http.post<ProductVariant>(`${this.baseUrl}/api/products/variants/${variantId}/reviews`, request);
    }

    // --- Tags ---

    getTags(): Observable<Tag[]> {
        return this.http.get<Tag[]>(`${this.baseUrl}/api/tags`);
    }

    createTag(request: TagRequest): Observable<Tag> {
        return this.http.post<Tag>(`${this.baseUrl}/api/tags`, request);
    }

    updateTag(id: number, request: TagRequest): Observable<Tag> {
        return this.http.put<Tag>(`${this.baseUrl}/api/tags/${id}`, request);
    }

    deleteTag(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/api/tags/${id}`);
    }

    // --- Promotion groups ---

    getPromotionGroups(): Observable<PromotionGroup[]> {
        return this.http.get<PromotionGroup[]>(`${this.baseUrl}/api/promotion-groups`);
    }

    createPromotionGroup(request: PromotionGroupRequest): Observable<PromotionGroup> {
        return this.http.post<PromotionGroup>(`${this.baseUrl}/api/promotion-groups`, request);
    }

    updatePromotionGroup(id: number, request: PromotionGroupRequest): Observable<PromotionGroup> {
        return this.http.put<PromotionGroup>(`${this.baseUrl}/api/promotion-groups/${id}`, request);
    }

    deletePromotionGroup(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/api/promotion-groups/${id}`);
    }

    getPromotionGroupVariants(id: number): Observable<ProductVariant[]> {
        return this.http.get<ProductVariant[]>(`${this.baseUrl}/api/promotion-groups/${id}/variants`);
    }
}
```

- [ ] **Step 4: Remove `starRating` from the admin variants component** — replace the full file with:

```typescript
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductCatalog } from '../../../service/product-catalog';
import { Product, ProductVariant, PropertyDefinition, Tag } from '../../../models/models';
import { PropertyValueInput } from '../../../models/admin-requests';
import { flattenCategories } from '../../../utils/admin-category-tree.util';

interface VariantPropertyRow {
  propertyDefinitionId: number | null;
  value: string;
}

@Component({
  selector: 'app-admin-variants',
  imports: [FormsModule],
  templateUrl: './admin-variants.html',
  styleUrl: './admin-variants.scss',
})
export class AdminVariants implements OnInit {
  private readonly productCatalog = inject(ProductCatalog);

  protected readonly items = signal<ProductVariant[]>([]);
  protected readonly products = signal<Product[]>([]);
  protected readonly properties = signal<PropertyDefinition[]>([]);
  protected readonly tags = signal<Tag[]>([]);
  protected readonly editingId = signal<number | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected variantName = '';
  protected variantDescription = '';
  protected productId: number | null = null;
  protected price: number | null = null;
  protected propertyRows: VariantPropertyRow[] = [];
  protected selectedTagIds = new Set<number>();

  private categoryPropertiesByCategoryId = new Map<number, PropertyDefinition[]>();

  ngOnInit(): void {
    this.load();
    this.productCatalog.getAllProducts().subscribe((products) => this.products.set(products));
    this.productCatalog.getPropertyDefinitions().subscribe((properties) => this.properties.set(properties));
    this.productCatalog.getTags().subscribe((tags) => this.tags.set(tags));
    this.productCatalog.getCategoryGroups().subscribe((groups) => {
      this.categoryPropertiesByCategoryId = new Map(
        flattenCategories(groups).map((flattened) => [flattened.category.id, flattened.category.categoryProperties]),
      );
    });
  }

  private load(): void {
    this.productCatalog.getAllVariants().subscribe((items) => this.items.set(items));
  }

  /**
   * Rows for every property the product's category defines plus the
   * product's own extra properties, keeping values already entered for
   * matching properties and preserving any ad-hoc rows the admin added
   * that aren't part of that set.
   */
  private buildPropertyRowsForProduct(productId: number | null, existingRows: VariantPropertyRow[]): VariantPropertyRow[] {
    if (productId === null) {
      return existingRows;
    }
    const product = this.products().find((p) => p.id === productId);
    if (!product) {
      return existingRows;
    }

    const applicable = new Map<number, PropertyDefinition>();
    for (const property of this.categoryPropertiesByCategoryId.get(product.category.id) ?? []) {
      applicable.set(property.id, property);
    }
    for (const property of product.extraProperties) {
      applicable.set(property.id, property);
    }

    const existingValueByPropertyId = new Map(existingRows.map((row) => [row.propertyDefinitionId, row.value]));
    const rows: VariantPropertyRow[] = Array.from(applicable.values()).map((property) => ({
      propertyDefinitionId: property.id,
      value: existingValueByPropertyId.get(property.id) ?? '',
    }));

    for (const row of existingRows) {
      if (row.propertyDefinitionId !== null && !applicable.has(row.propertyDefinitionId)) {
        rows.push(row);
      }
    }
    return rows;
  }

  protected addPropertyRow(): void {
    this.propertyRows = [...this.propertyRows, { propertyDefinitionId: null, value: '' }];
  }

  protected removePropertyRow(index: number): void {
    this.propertyRows = this.propertyRows.filter((_, i) => i !== index);
  }

  protected toggleTagId(id: number): void {
    if (this.selectedTagIds.has(id)) {
      this.selectedTagIds.delete(id);
    } else {
      this.selectedTagIds.add(id);
    }
  }

  protected onProductChange(value: number | null): void {
    this.productId = value;
    this.propertyRows = this.buildPropertyRowsForProduct(value, this.propertyRows);
  }

  protected startEdit(item: ProductVariant): void {
    this.editingId.set(item.id);
    this.variantName = item.variantName;
    this.variantDescription = item.variantDescription;
    this.productId = item.product.id;
    this.price = item.price;
    const rows = item.variantProperties.map((pv) => ({
      propertyDefinitionId: pv.propertyDefinition.id,
      value: pv.propertyValue,
    }));
    this.propertyRows = this.buildPropertyRowsForProduct(item.product.id, rows);
    this.selectedTagIds = new Set(item.tags.map((t) => t.id));
    this.errorMessage.set(null);
  }

  /** Pre-fills the create form from an existing variant, ready to tweak and save as a new one. */
  protected copyFrom(item: ProductVariant): void {
    this.editingId.set(null);
    this.variantName = item.variantName;
    this.variantDescription = item.variantDescription;
    this.productId = item.product.id;
    this.price = item.price;
    const rows = item.variantProperties.map((pv) => ({
      propertyDefinitionId: pv.propertyDefinition.id,
      value: pv.propertyValue,
    }));
    this.propertyRows = this.buildPropertyRowsForProduct(item.product.id, rows);
    this.selectedTagIds = new Set(item.tags.map((t) => t.id));
    this.errorMessage.set(null);
  }

  protected cancel(): void {
    this.editingId.set(null);
    this.variantName = '';
    this.variantDescription = '';
    this.productId = null;
    this.price = null;
    this.propertyRows = [];
    this.selectedTagIds = new Set();
    this.errorMessage.set(null);
  }

  protected submit(): void {
    if (this.productId === null || this.price === null) {
      this.errorMessage.set('Product and price are required');
      return;
    }
    this.errorMessage.set(null);

    const variantProperties: PropertyValueInput[] = this.propertyRows
      .filter((row) => row.propertyDefinitionId !== null && row.value.trim().length > 0)
      .map((row) => ({ propertyDefinitionId: row.propertyDefinitionId as number, value: row.value }));

    const request = {
      variantName: this.variantName,
      variantDescription: this.variantDescription,
      productId: this.productId,
      price: this.price,
      variantProperties,
      tagIds: Array.from(this.selectedTagIds),
    };
    const id = this.editingId();
    const result$ = id === null
      ? this.productCatalog.createVariant(request)
      : this.productCatalog.updateVariant(id, request);

    result$.subscribe({
      next: () => {
        this.cancel();
        this.load();
      },
      error: (err) => this.errorMessage.set(err.error?.message ?? 'Something went wrong'),
    });
  }

  protected remove(item: ProductVariant): void {
    if (!confirm(`Delete variant "${item.variantName}"?`)) {
      return;
    }
    this.errorMessage.set(null);
    this.productCatalog.deleteVariant(item.id).subscribe({
      next: () => this.load(),
      error: (err) => this.errorMessage.set(err.error?.message ?? 'Something went wrong'),
    });
  }
}
```

- [ ] **Step 5: Remove the "Star rating" field from the admin variants template** — in `src/app/component/admin/admin-variants/admin-variants.html`, delete this block (currently lines 31-34):

```html
      <label class="flex flex-col gap-1 text-sm text-gray-700">
        Star rating
        <input type="number" min="1" max="5" [(ngModel)]="starRating" name="starRating" class="border border-gray-300 rounded-md px-3 py-2 text-sm w-20" />
      </label>
```

so the `<div class="flex items-end gap-3 flex-wrap">` block ends right after the Price `</label>`. Nothing else in the admin UI references star rating — the table listing already doesn't show it.

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit -p tsconfig.app.json` (from the `lavander` repo root)
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/models/models.ts src/app/models/admin-requests.ts src/app/service/product-catalog.ts src/app/component/admin/admin-variants/admin-variants.ts src/app/component/admin/admin-variants/admin-variants.html
git commit -m "Drop the manual star-rating admin field; add reviewCount and submitReview"
```

---

### Task 2: Product detail page — review count caption and submission widget

**Files:**
- Modify: `src/app/component/product-detail/product-detail.ts`
- Modify: `src/app/component/product-detail/product-detail.html`

**Interfaces:**
- Consumes: `ProductVariant.reviewCount` (Task 1); `ProductCatalog.submitReview(variantId, { rating }): Observable<ProductVariant>` (Task 1).
- Produces: `ProductDetail.selectedReviewRating: Signal<number>`, `onStarPick(rating: number): void`, `onSubmitReview(): void`, `submittingReview: Signal<boolean>`, `reviewSubmitted: Signal<boolean>`.

- [ ] **Step 1: Add the review widget's state and the override-merging `variant` computed** — replace the full file with:

```typescript
import { Component, computed, inject, signal } from '@angular/core';
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
```

`reviewOverride` is guarded by an id check in the `variant` computed rather than
reset on navigation: if the id no longer matches the live context variant (the
tag-switcher navigated elsewhere), the override is simply ignored, so a stale
override can never leak onto the wrong page.

- [ ] **Step 2: Add the review-count caption and the review widget** — replace the full file with:

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
        <button type="button" (click)="onCategoryBreadcrumbClick()" class="hover:text-violet-600 hover:underline cursor-pointer">{{ path.category.categoryName }}</button>
        <span>/</span>
        <span class="text-gray-700">{{ v.product.productName }}</span>
      </nav>
    }

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div class="aspect-square max-w-md w-full mx-auto lg:mx-0 bg-gray-100 rounded-lg flex items-center justify-center">
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

        <div class="flex items-center gap-2">
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
          <span class="text-xs text-gray-500">
            @if (v.reviewCount > 0) {
              ({{ v.reviewCount }} {{ v.reviewCount === 1 ? 'evaluare' : 'evaluari' }})
            } @else {
              Fara evaluari inca
            }
          </span>
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
          class="min-h-11 flex items-center justify-start pl-6 gap-2 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white text-sm font-medium rounded-md transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          Adauga in Cos
        </button>
      </div>

      @if (v.variantProperties.length > 0) {
        <div class="max-w-md w-full mx-auto lg:mx-0">
          <p class="text-sm font-medium text-gray-900 mb-2">Specificatii</p>
          <div class="border border-gray-200 rounded-md divide-y divide-gray-100">
            @for (pv of v.variantProperties; track pv.id) {
              <div class="flex items-center justify-between px-3 py-2 text-sm">
                <span class="text-gray-500">{{ pv.propertyDefinition.propertyName }}</span>
                <span class="text-gray-900 font-medium">{{ pv.propertyValue }}</span>
              </div>
            }
          </div>
        </div>
      }

      <div class="max-w-md w-full mx-auto lg:mx-0">
        <p class="text-sm font-medium text-gray-900 mb-2">Evalueaza acest produs</p>
        <div class="flex items-center gap-1 mb-3">
          @for (star of starIndices; track star) {
            <button type="button" (click)="onStarPick(star)" class="p-0.5">
              <svg width="24" height="24" viewBox="0 0 24 24"
                   [attr.fill]="star <= selectedReviewRating() ? '#f59e0b' : 'none'"
                   stroke="#f59e0b" stroke-width="1.5" stroke-linejoin="round">
                <polygon points="12 2 15.09 8.63 22 9.24 16.5 13.97 18.18 21 12 17.27 5.82 21 7.5 13.97 2 9.24 8.91 8.63 12 2"/>
              </svg>
            </button>
          }
        </div>
        <button
          type="button"
          (click)="onSubmitReview()"
          [disabled]="selectedReviewRating() === 0 || submittingReview()"
          class="min-h-11 px-4 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Trimite evaluarea
        </button>
        @if (reviewSubmitted()) {
          <p class="text-sm text-green-600 mt-2">Multumim pentru evaluare!</p>
        }
      </div>
    </div>
  </div>
} @else {
  <div class="min-w-0 border border-gray-200 rounded-xl bg-white p-6">
    <p class="text-sm text-gray-500">Produsul nu a fost gasit.</p>
  </div>
}
```

The widget is a 4th unwrapped sibling in the `grid-cols-1 lg:grid-cols-2` grid
(alongside the image, the info column, and the conditional Specificatii block) —
the same auto-flow trick already used to place Specificatii under the image: on
desktop it lands in row 2, column 2 (under the info column); on mobile it simply
stacks last, after Specificatii.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/component/product-detail/product-detail.ts src/app/component/product-detail/product-detail.html
git commit -m "Add review-count caption and a review-submission widget to the product detail page"
```

---

### Task 3: Manual browser verification

Requires the backend from `estore`'s `2026-08-19-product-reviews-api.md` plan
running (`./gradlew bootRun`) with its seed data loaded, and `npm start` running
in `lavander`.

- [ ] **Step 1: Confirm the admin form no longer has a Star rating field**

Navigate to the admin variants page. Confirm the create form shows only Name,
Description, Product, and Price — no Star rating input. Confirm creating a new
variant still succeeds (200, appears in the table) without it.

- [ ] **Step 2: Confirm editing an existing variant still works**

Click "Edit" on an existing row, change the price, save. Confirm the change
persists (reload the table) and no console error appears.

- [ ] **Step 3: Confirm the product detail page shows the seeded rating and count**

Navigate to a product detail page for a variant seeded with one review (e.g.
Dell XPS 13). Confirm the star row shows the filled-star count matching its
seeded rating, and the caption reads "(1 evaluare)".

- [ ] **Step 4: Submit a review and confirm the display updates immediately**

Click a star (e.g. the 3rd) in the "Evalueaza acest produs" widget, confirm it
and the ones before it highlight. Click "Trimite evaluarea". Confirm: the
"Trimite evaluarea" button is disabled while the request is in flight; the
"Multumim pentru evaluare!" confirmation line appears; the star row above (not
just the widget) updates to the new average immediately, without a page reload;
the caption updates to "(2 evaluari)".

- [ ] **Step 5: Confirm a second submission on the same page works**

Pick a different star rating and submit again. Confirm the average changes
again and the caption becomes "(3 evaluari)" — proving the override doesn't get
stuck after the first submission.

- [ ] **Step 6: Confirm reloading the page shows the persisted state**

Reload the product detail page. Confirm the star row and caption reflect the
same average/count as after Step 5 (proving the backend persisted it, not just
the in-memory override).

- [ ] **Step 7: Confirm switching variants via the tag-switcher doesn't leak the override**

On a product with multiple variants (via tag rows), submit a review on one
variant, then click a tag to switch to a different variant. Confirm the new
variant's own rating/count show (not the previous variant's just-submitted
one), and the review widget resets to no stars selected.

- [ ] **Step 8: Check the browser console**

Confirm no errors were logged during any of the above steps.
