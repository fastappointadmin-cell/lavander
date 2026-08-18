# Promotion Tags UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface the backend's new Tag/PromotionGroup entities (`estore`'s `docs/superpowers/plans/2026-08-18-promotion-tags-api.md`) in the admin, and integrate promotion groups into the site's existing category menu and browsing experience — mixed into the same "Produse" dropdown, per the user's explicit choice, rather than a separate nav section.

**Architecture:** Two new admin sections (Tags, Promotion Groups) follow the exact CRUD pattern every other admin section already uses. The Variants admin form gains a tag multi-select alongside its existing property rows. On the customer-facing site, `CategoryMenuPanel` renders promotion groups as extra flat entries (no flyout) below the existing category groups; clicking one navigates to a new `/promotions/:slug` page listing the pooled variants. Since that pooled listing can include variants from categories other than the one currently being browsed, `ProductCard`'s click handler falls back to resolving a variant's real category (via the new `ProductRef.categoryId`) when the current route doesn't already supply one — landing on the same, already-working `ProductDetail` page rather than a parallel promotion-specific detail view.

**Tech Stack:** Angular (standalone components, signals, `@if`/`@for`/`@switch`, template-driven forms via `FormsModule`/`ngModel`), Tailwind CSS — same stack as the rest of this codebase.

## Global Constraints

- Frontend root: `src/app`.
- Depends on the backend plan `estore/docs/superpowers/plans/2026-08-18-promotion-tags-api.md` being implemented first — `/api/tags` and `/api/promotion-groups` must exist for Task 8's verification to pass (Tasks 1-7 are otherwise self-consistent TypeScript and will compile regardless).
- Component file naming matches this project's existing convention: bare names, no `.component.ts` suffix (e.g. `admin-tags.ts`, not `admin-tags.component.ts`).
- Every admin section component follows the established pattern: `items` signal, `editingId` signal (`number | null`, `null` = create mode), `errorMessage` signal (`string | null`, populated from `err.error?.message`), `load()`/`startEdit()`/`cancel()`/`submit()`/`remove()`. Multi-select fields use the `selectedXIds: Set<number>` + `toggleXId(id)` + `[checked]="selectedXIds.has(id)"` pattern already used for category/product properties.
- Delete confirmation: plain `confirm()` — no custom modal.
- No automated tests — matches this project's established convention for frontend component work. Verification is a full manual browser walkthrough in the final task.
- **Task 4 modifies `admin-variants.ts`/`.html` and `admin-page.ts`/`.html`, which already carry unrelated work from this session** (a "Copy from variant" action and auto-filled property rows from the product's category/extra properties, added earlier). The full-file contents shown in Task 4 already include that existing work — copy them exactly rather than reverting to an older version of these files.
- `JAVA_HOME` for backend restarts during verification: `export JAVA_HOME=/Users/adrianazoitei/Library/Java/JavaVirtualMachines/openjdk-26.0.1/Contents/Home`.
- Git safety: this repo has another session working in it concurrently. Stage only the exact files each task lists, and commit with a trailing pathspec (`git commit -m "..." -- <exact paths>`), never a bare `git commit` that could sweep in another session's staged-but-uncommitted changes.

---

### Task 1: Models, admin request types, `ProductCatalog` CRUD methods

**Files:**
- Modify: `src/app/models/models.ts`
- Modify: `src/app/models/admin-requests.ts`
- Modify: `src/app/service/product-catalog.ts`

**Interfaces:**
- Produces: `Tag`, `PromotionGroup` (models); `TagRequest`, `PromotionGroupRequest` (admin-requests); `ProductCatalog.getTags/createTag/updateTag/deleteTag`, `getPromotionGroups/createPromotionGroup/updatePromotionGroup/deletePromotionGroup/getPromotionGroupVariants` — all consumed by Tasks 2-7.

- [ ] **Step 1: Add `Tag`/`PromotionGroup`, `categoryId`, and `tags` to `models.ts`** — replace the full file with:

```typescript
export interface PropertyDefinition {
  id: number;
  propertyName: string;
}

export interface ProductCategoryGroup {
  id: number;
  groupName: string;
  subGroups: ProductSubCategoryGroup[];
  categories: ProductCategory[];
}

export interface ProductSubCategoryGroup {
  id: number;
  groupName: string;
  categories: ProductCategory[];
}

export interface ProductCategory {
  id: number;
  categoryName: string;
  categoryProperties: PropertyDefinition[];
}

export interface ProductCategoryRef {
  id: number;
  categoryName: string;
}

export interface Product {
  id: number;
  productName: string;
  productDescription: string;
  category: ProductCategoryRef;
  extraProperties: PropertyDefinition[];
}

export interface ProductRef {
  id: number;
  productName: string;
  categoryId: number;
}

export interface PropertyValue {
  id: number;
  propertyDefinition: PropertyDefinition;
  propertyValue: string;
}

export interface Tag {
  id: number;
  tagName: string;
}

export interface PromotionGroup {
  id: number;
  groupName: string;
  tags: Tag[];
}

export interface ProductVariant {
  id: number;
  variantName: string;
  variantDescription: string;
  product: ProductRef;
  variantProperties: PropertyValue[];
  tags: Tag[];
  price: number;
  starRating: number;
}
```

- [ ] **Step 2: Add `TagRequest`/`PromotionGroupRequest` and `tagIds` to `admin-requests.ts`** — replace the full file with:

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
  starRating: number;
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
```

- [ ] **Step 3: Add Tag/PromotionGroup CRUD to `product-catalog.ts`** — replace the full file with:

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

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/models/models.ts src/app/models/admin-requests.ts src/app/service/product-catalog.ts
git commit -m "Add Tag/PromotionGroup models, requests, and CRUD methods" -- src/app/models/models.ts src/app/models/admin-requests.ts src/app/service/product-catalog.ts
```

---

### Task 2: Admin Tags section

**Files:**
- Create: `src/app/component/admin/admin-tags/admin-tags.ts`
- Create: `src/app/component/admin/admin-tags/admin-tags.html`
- Create: `src/app/component/admin/admin-tags/admin-tags.scss` (empty)

**Interfaces:**
- Consumes: `Tag` (Task 1 models), `ProductCatalog.getTags/createTag/updateTag/deleteTag` (Task 1)

- [ ] **Step 1: Create `admin-tags.ts`**

```typescript
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductCatalog } from '../../../service/product-catalog';
import { Tag } from '../../../models/models';

@Component({
  selector: 'app-admin-tags',
  imports: [FormsModule],
  templateUrl: './admin-tags.html',
  styleUrl: './admin-tags.scss',
})
export class AdminTags implements OnInit {
  private readonly productCatalog = inject(ProductCatalog);

  protected readonly items = signal<Tag[]>([]);
  protected readonly editingId = signal<number | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected tagName = '';

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.productCatalog.getTags().subscribe((items) => this.items.set(items));
  }

  protected startEdit(item: Tag): void {
    this.editingId.set(item.id);
    this.tagName = item.tagName;
    this.errorMessage.set(null);
  }

  protected cancel(): void {
    this.editingId.set(null);
    this.tagName = '';
    this.errorMessage.set(null);
  }

  protected submit(): void {
    this.errorMessage.set(null);
    const request = { tagName: this.tagName };
    const id = this.editingId();
    const result$ = id === null
      ? this.productCatalog.createTag(request)
      : this.productCatalog.updateTag(id, request);

    result$.subscribe({
      next: () => {
        this.cancel();
        this.load();
      },
      error: (err) => this.errorMessage.set(err.error?.message ?? 'Something went wrong'),
    });
  }

  protected remove(item: Tag): void {
    if (!confirm(`Delete tag "${item.tagName}"?`)) {
      return;
    }
    this.errorMessage.set(null);
    this.productCatalog.deleteTag(item.id).subscribe({
      next: () => this.load(),
      error: (err) => this.errorMessage.set(err.error?.message ?? 'Something went wrong'),
    });
  }
}
```

- [ ] **Step 2: Create `admin-tags.html`**

```html
<div class="border border-gray-200 rounded-xl bg-white p-6">
  <h2 class="text-lg font-semibold text-gray-900 mb-4">Tags</h2>

  @if (errorMessage()) {
    <div class="mb-4 px-4 py-2 rounded-md bg-red-50 text-red-700 text-sm">{{ errorMessage() }}</div>
  }

  <form (ngSubmit)="submit()" class="flex items-end gap-3 mb-6">
    <label class="flex flex-col gap-1 text-sm text-gray-700">
      Tag name
      <input [(ngModel)]="tagName" name="tagName" required class="border border-gray-300 rounded-md px-3 py-2 text-sm" />
    </label>
    <button type="submit" class="px-4 py-2 rounded-md bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium">
      {{ editingId() === null ? 'Create' : 'Save' }}
    </button>
    @if (editingId() !== null) {
      <button type="button" (click)="cancel()" class="px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700">Cancel</button>
    }
  </form>

  <table class="w-full text-sm">
    <thead>
      <tr class="text-left text-gray-500 border-b border-gray-200">
        <th class="py-2">ID</th>
        <th class="py-2">Name</th>
        <th class="py-2"></th>
      </tr>
    </thead>
    <tbody>
      @for (item of items(); track item.id) {
        <tr class="border-b border-gray-100">
          <td class="py-2">{{ item.id }}</td>
          <td class="py-2">{{ item.tagName }}</td>
          <td class="py-2 text-right">
            <button type="button" (click)="startEdit(item)" class="text-violet-600 hover:underline mr-3">Edit</button>
            <button type="button" (click)="remove(item)" class="text-red-600 hover:underline">Delete</button>
          </td>
        </tr>
      }
    </tbody>
  </table>
</div>
```

- [ ] **Step 3: Create empty `admin-tags.scss`**

- [ ] **Step 4: Commit**

```bash
git add src/app/component/admin/admin-tags/
git commit -m "Add admin Tags section" -- src/app/component/admin/admin-tags/
```

---

### Task 3: Admin Promotion Groups section

**Files:**
- Create: `src/app/component/admin/admin-promotion-groups/admin-promotion-groups.ts`
- Create: `src/app/component/admin/admin-promotion-groups/admin-promotion-groups.html`
- Create: `src/app/component/admin/admin-promotion-groups/admin-promotion-groups.scss` (empty)

**Interfaces:**
- Consumes: `PromotionGroup`, `Tag` (Task 1 models), `ProductCatalog.getPromotionGroups/createPromotionGroup/updatePromotionGroup/deletePromotionGroup`, `getTags` (Task 1)

- [ ] **Step 1: Create `admin-promotion-groups.ts`**

```typescript
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductCatalog } from '../../../service/product-catalog';
import { PromotionGroup, Tag } from '../../../models/models';

@Component({
  selector: 'app-admin-promotion-groups',
  imports: [FormsModule],
  templateUrl: './admin-promotion-groups.html',
  styleUrl: './admin-promotion-groups.scss',
})
export class AdminPromotionGroups implements OnInit {
  private readonly productCatalog = inject(ProductCatalog);

  protected readonly items = signal<PromotionGroup[]>([]);
  protected readonly tags = signal<Tag[]>([]);
  protected readonly editingId = signal<number | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected groupName = '';
  protected selectedTagIds = new Set<number>();

  ngOnInit(): void {
    this.load();
    this.productCatalog.getTags().subscribe((tags) => this.tags.set(tags));
  }

  private load(): void {
    this.productCatalog.getPromotionGroups().subscribe((items) => this.items.set(items));
  }

  protected toggleTagId(id: number): void {
    if (this.selectedTagIds.has(id)) {
      this.selectedTagIds.delete(id);
    } else {
      this.selectedTagIds.add(id);
    }
  }

  protected startEdit(item: PromotionGroup): void {
    this.editingId.set(item.id);
    this.groupName = item.groupName;
    this.selectedTagIds = new Set(item.tags.map((t) => t.id));
    this.errorMessage.set(null);
  }

  protected cancel(): void {
    this.editingId.set(null);
    this.groupName = '';
    this.selectedTagIds = new Set();
    this.errorMessage.set(null);
  }

  protected submit(): void {
    this.errorMessage.set(null);
    const request = {
      groupName: this.groupName,
      tagIds: Array.from(this.selectedTagIds),
    };
    const id = this.editingId();
    const result$ = id === null
      ? this.productCatalog.createPromotionGroup(request)
      : this.productCatalog.updatePromotionGroup(id, request);

    result$.subscribe({
      next: () => {
        this.cancel();
        this.load();
      },
      error: (err) => this.errorMessage.set(err.error?.message ?? 'Something went wrong'),
    });
  }

  protected remove(item: PromotionGroup): void {
    if (!confirm(`Delete promotion group "${item.groupName}"?`)) {
      return;
    }
    this.errorMessage.set(null);
    this.productCatalog.deletePromotionGroup(item.id).subscribe({
      next: () => this.load(),
      error: (err) => this.errorMessage.set(err.error?.message ?? 'Something went wrong'),
    });
  }
}
```

- [ ] **Step 2: Create `admin-promotion-groups.html`**

```html
<div class="border border-gray-200 rounded-xl bg-white p-6">
  <h2 class="text-lg font-semibold text-gray-900 mb-4">Promotion Groups</h2>

  @if (errorMessage()) {
    <div class="mb-4 px-4 py-2 rounded-md bg-red-50 text-red-700 text-sm">{{ errorMessage() }}</div>
  }

  <form (ngSubmit)="submit()" class="flex flex-col gap-3 mb-6">
    <label class="flex flex-col gap-1 text-sm text-gray-700 w-64">
      Name
      <input [(ngModel)]="groupName" name="groupName" required class="border border-gray-300 rounded-md px-3 py-2 text-sm" />
    </label>

    <div>
      <p class="text-sm text-gray-700 mb-1">Tags</p>
      <div class="flex flex-wrap gap-3">
        @for (tag of tags(); track tag.id) {
          <label class="flex items-center gap-1.5 text-sm text-gray-700">
            <input type="checkbox" [checked]="selectedTagIds.has(tag.id)" (change)="toggleTagId(tag.id)" />
            {{ tag.tagName }}
          </label>
        }
      </div>
    </div>

    <div class="flex items-center gap-3">
      <button type="submit" class="px-4 py-2 rounded-md bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium">
        {{ editingId() === null ? 'Create' : 'Save' }}
      </button>
      @if (editingId() !== null) {
        <button type="button" (click)="cancel()" class="px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700">Cancel</button>
      }
    </div>
  </form>

  <table class="w-full text-sm">
    <thead>
      <tr class="text-left text-gray-500 border-b border-gray-200">
        <th class="py-2">ID</th>
        <th class="py-2">Name</th>
        <th class="py-2">Tags</th>
        <th class="py-2"></th>
      </tr>
    </thead>
    <tbody>
      @for (item of items(); track item.id) {
        <tr class="border-b border-gray-100">
          <td class="py-2">{{ item.id }}</td>
          <td class="py-2">{{ item.groupName }}</td>
          <td class="py-2">{{ item.tags.length }}</td>
          <td class="py-2 text-right">
            <button type="button" (click)="startEdit(item)" class="text-violet-600 hover:underline mr-3">Edit</button>
            <button type="button" (click)="remove(item)" class="text-red-600 hover:underline">Delete</button>
          </td>
        </tr>
      }
    </tbody>
  </table>
</div>
```

- [ ] **Step 3: Create empty `admin-promotion-groups.scss`**

- [ ] **Step 4: Commit**

```bash
git add src/app/component/admin/admin-promotion-groups/
git commit -m "Add admin Promotion Groups section" -- src/app/component/admin/admin-promotion-groups/
```

---

### Task 4: Wire Tags/Promotion Groups into `AdminPage`, add tag multi-select to Variants

**Files:**
- Modify: `src/app/component/admin/admin-page/admin-page.ts`
- Modify: `src/app/component/admin/admin-page/admin-page.html`
- Modify: `src/app/component/admin/admin-variants/admin-variants.ts`
- Modify: `src/app/component/admin/admin-variants/admin-variants.html`

**Interfaces:**
- Consumes: `AdminTags` (Task 2), `AdminPromotionGroups` (Task 3), `Tag` (Task 1)

- [ ] **Step 1: Add the two new sections to `admin-page.ts`** — replace the full file with:

```typescript
import { Component, signal } from '@angular/core';
import { AdminProperties } from '../admin-properties/admin-properties';
import { AdminGroups } from '../admin-groups/admin-groups';
import { AdminSubgroups } from '../admin-subgroups/admin-subgroups';
import { AdminCategories } from '../admin-categories/admin-categories';
import { AdminProducts } from '../admin-products/admin-products';
import { AdminVariants } from '../admin-variants/admin-variants';
import { AdminTags } from '../admin-tags/admin-tags';
import { AdminPromotionGroups } from '../admin-promotion-groups/admin-promotion-groups';

type AdminSection = 'properties' | 'groups' | 'subgroups' | 'categories' | 'products' | 'variants' | 'tags' | 'promotionGroups';

@Component({
  selector: 'app-admin-page',
  imports: [AdminProperties, AdminGroups, AdminSubgroups, AdminCategories, AdminProducts, AdminVariants, AdminTags, AdminPromotionGroups],
  templateUrl: './admin-page.html',
  styleUrl: './admin-page.scss',
})
export class AdminPage {
  protected readonly activeSection = signal<AdminSection>('properties');

  protected readonly sections: { id: AdminSection; label: string }[] = [
    { id: 'properties', label: 'Properties' },
    { id: 'groups', label: 'Groups' },
    { id: 'subgroups', label: 'Subgroups' },
    { id: 'categories', label: 'Categories' },
    { id: 'products', label: 'Products' },
    { id: 'variants', label: 'Variants' },
    { id: 'tags', label: 'Tags' },
    { id: 'promotionGroups', label: 'Promotion Groups' },
  ];

  protected selectSection(section: AdminSection): void {
    this.activeSection.set(section);
  }
}
```

- [ ] **Step 2: Add the two `@case`s to `admin-page.html`** — replace the full file with:

```html
<div class="w-full px-6 md:px-16 lg:px-24 xl:px-32 py-8 bg-gray-50">
  <div class="flex items-start gap-6">
    <nav class="w-48 shrink-0 flex flex-col gap-1 border border-gray-200 rounded-xl bg-white p-3">
      @for (section of sections; track section.id) {
        <button
          type="button"
          (click)="selectSection(section.id)"
          class="text-left px-3 py-2 rounded-md text-sm transition-colors"
          [class.bg-violet-600]="activeSection() === section.id"
          [class.text-white]="activeSection() === section.id"
          [class.text-gray-700]="activeSection() !== section.id"
        >
          {{ section.label }}
        </button>
      }
    </nav>

    <div class="flex-1 min-w-0">
      @switch (activeSection()) {
        @case ('properties') { <app-admin-properties /> }
        @case ('groups') { <app-admin-groups /> }
        @case ('subgroups') { <app-admin-subgroups /> }
        @case ('categories') { <app-admin-categories /> }
        @case ('products') { <app-admin-products /> }
        @case ('variants') { <app-admin-variants /> }
        @case ('tags') { <app-admin-tags /> }
        @case ('promotionGroups') { <app-admin-promotion-groups /> }
      }
    </div>
  </div>
</div>
```

- [ ] **Step 3: Add a tag multi-select to `admin-variants.ts`** — replace the full file with (this already includes the "Copy from variant" action and category/extra-property auto-fill added earlier this session; only the `tags`/`selectedTagIds`/`toggleTagId` pieces are new):

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
  protected starRating: number | null = null;
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
    this.starRating = item.starRating;
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
    this.starRating = item.starRating;
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
    this.starRating = null;
    this.propertyRows = [];
    this.selectedTagIds = new Set();
    this.errorMessage.set(null);
  }

  protected submit(): void {
    if (this.productId === null || this.price === null || this.starRating === null) {
      this.errorMessage.set('Product, price and star rating are required');
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
      starRating: this.starRating,
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

- [ ] **Step 4: Add the tag checkboxes to `admin-variants.html`** — replace the full file with:

```html
<div class="border border-gray-200 rounded-xl bg-white p-6">
  <h2 class="text-lg font-semibold text-gray-900 mb-4">Variants</h2>

  @if (errorMessage()) {
    <div class="mb-4 px-4 py-2 rounded-md bg-red-50 text-red-700 text-sm">{{ errorMessage() }}</div>
  }

  <form (ngSubmit)="submit()" class="flex flex-col gap-3 mb-6">
    <div class="flex items-end gap-3 flex-wrap">
      <label class="flex flex-col gap-1 text-sm text-gray-700">
        Name
        <input [(ngModel)]="variantName" name="variantName" required class="border border-gray-300 rounded-md px-3 py-2 text-sm" />
      </label>
      <label class="flex flex-col gap-1 text-sm text-gray-700">
        Description
        <input [(ngModel)]="variantDescription" name="variantDescription" class="border border-gray-300 rounded-md px-3 py-2 text-sm" />
      </label>
      <label class="flex flex-col gap-1 text-sm text-gray-700">
        Product
        <select [ngModel]="productId" (ngModelChange)="onProductChange($event)" name="productId" class="border border-gray-300 rounded-md px-3 py-2 text-sm">
          <option [ngValue]="null">Select a product</option>
          @for (product of products(); track product.id) {
            <option [ngValue]="product.id">{{ product.productName }}</option>
          }
        </select>
      </label>
      <label class="flex flex-col gap-1 text-sm text-gray-700">
        Price
        <input type="number" step="0.01" [(ngModel)]="price" name="price" class="border border-gray-300 rounded-md px-3 py-2 text-sm w-28" />
      </label>
      <label class="flex flex-col gap-1 text-sm text-gray-700">
        Star rating
        <input type="number" min="1" max="5" [(ngModel)]="starRating" name="starRating" class="border border-gray-300 rounded-md px-3 py-2 text-sm w-20" />
      </label>
    </div>

    <div>
      <p class="text-sm text-gray-700 mb-1">Variant properties</p>
      <p class="text-xs text-gray-500 mb-2">Pre-filled from the selected product's category and extra properties &mdash; just fill in the values, or add more.</p>
      @for (row of propertyRows; track $index) {
        <div class="flex items-center gap-2 mb-2">
          <select [(ngModel)]="row.propertyDefinitionId" [name]="'propertyDefinitionId' + $index" class="border border-gray-300 rounded-md px-3 py-2 text-sm">
            <option [ngValue]="null">Select a property</option>
            @for (property of properties(); track property.id) {
              <option [ngValue]="property.id">{{ property.propertyName }}</option>
            }
          </select>
          <input [(ngModel)]="row.value" [name]="'value' + $index" placeholder="Value" class="border border-gray-300 rounded-md px-3 py-2 text-sm" />
          <button type="button" (click)="removePropertyRow($index)" class="text-red-600 hover:underline text-sm">Remove</button>
        </div>
      }
      <button type="button" (click)="addPropertyRow()" class="text-violet-600 hover:underline text-sm">+ Add property</button>
    </div>

    <div>
      <p class="text-sm text-gray-700 mb-1">Tags</p>
      <div class="flex flex-wrap gap-3">
        @for (tag of tags(); track tag.id) {
          <label class="flex items-center gap-1.5 text-sm text-gray-700">
            <input type="checkbox" [checked]="selectedTagIds.has(tag.id)" (change)="toggleTagId(tag.id)" />
            {{ tag.tagName }}
          </label>
        }
      </div>
    </div>

    <div class="flex items-center gap-3">
      <button type="submit" class="px-4 py-2 rounded-md bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium">
        {{ editingId() === null ? 'Create' : 'Save' }}
      </button>
      @if (editingId() !== null) {
        <button type="button" (click)="cancel()" class="px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700">Cancel</button>
      }
    </div>
  </form>

  <table class="w-full text-sm">
    <thead>
      <tr class="text-left text-gray-500 border-b border-gray-200">
        <th class="py-2">ID</th>
        <th class="py-2">Name</th>
        <th class="py-2">Product</th>
        <th class="py-2">Price</th>
        <th class="py-2"></th>
      </tr>
    </thead>
    <tbody>
      @for (item of items(); track item.id) {
        <tr class="border-b border-gray-100">
          <td class="py-2">{{ item.id }}</td>
          <td class="py-2">{{ item.variantName }}</td>
          <td class="py-2">{{ item.product.productName }}</td>
          <td class="py-2">{{ item.price }} Lei</td>
          <td class="py-2 text-right">
            <button type="button" (click)="startEdit(item)" class="text-violet-600 hover:underline mr-3">Edit</button>
            <button type="button" (click)="copyFrom(item)" class="text-violet-600 hover:underline mr-3">Copy</button>
            <button type="button" (click)="remove(item)" class="text-red-600 hover:underline">Delete</button>
          </td>
        </tr>
      }
    </tbody>
  </table>
</div>
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/component/admin/admin-page/admin-page.ts src/app/component/admin/admin-page/admin-page.html src/app/component/admin/admin-variants/admin-variants.ts src/app/component/admin/admin-variants/admin-variants.html
git commit -m "Wire Tags/Promotion Groups sections into AdminPage; add tag multi-select to Variants" -- src/app/component/admin/admin-page/admin-page.ts src/app/component/admin/admin-page/admin-page.html src/app/component/admin/admin-variants/admin-variants.ts src/app/component/admin/admin-variants/admin-variants.html
```

---

### Task 5: `Context` promotion signals, `ProductCard` category fallback

**Files:**
- Modify: `src/app/utils/category-path.util.ts`
- Modify: `src/app/service/context.ts`
- Modify: `src/app/component/product-card/product-card.ts`

**Interfaces:**
- Consumes: `PromotionGroup` (Task 1), `ProductCatalog.getPromotionGroups/getPromotionGroupVariants` (Task 1)
- Produces: `findCategoryPathByCategoryId(groups, categoryId)`; `Context.categoryGroups` (now public), `selectedPromotionSlug`, `selectedPromotionGroup`, `selectedPromotionVariants` — consumed by Task 7 (`Layout`, `PromotionPage`)

- [ ] **Step 1: Add `findCategoryPathByCategoryId` to `category-path.util.ts`** — replace the full file with:

```typescript
import { ProductCategory, ProductCategoryGroup, ProductSubCategoryGroup } from '../models/models';

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Builds the URL slug segments for a category, e.g. ['electronics', 'computers', 'laptops']
 * or ['curatenie', 'detergenti'] when the category sits directly under a group.
 *
 * Takes the group (and, if applicable, subGroup) explicitly rather than reading
 * a parentGroup back-reference off the category, since ProductCategory doesn't carry
 * one (it isn't part of the backend's DTO shape).
 */
export function getCategoryPathSlugs(
  group: ProductCategoryGroup,
  category: ProductCategory,
  subGroup?: ProductSubCategoryGroup,
): string[] {
  if (subGroup) {
    return [slugify(group.groupName), slugify(subGroup.groupName), slugify(category.categoryName)];
  }
  return [slugify(group.groupName), slugify(category.categoryName)];
}

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

/**
 * Resolves a category's group/subGroup from its id alone, for callers that only
 * have a category id (e.g. a variant reached via a promotion listing, which pools
 * variants from categories other than the one currently being browsed).
 */
export function findCategoryPathByCategoryId(
  groups: ProductCategoryGroup[],
  categoryId: number,
): CategoryPath | null {
  for (const group of groups) {
    const direct = group.categories.find((candidate) => candidate.id === categoryId);
    if (direct) {
      return { group, category: direct };
    }
    for (const subGroup of group.subGroups) {
      const nested = subGroup.categories.find((candidate) => candidate.id === categoryId);
      if (nested) {
        return { group, subGroup, category: nested };
      }
    }
  }
  return null;
}
```

- [ ] **Step 2: Add promotion signals to `context.ts`, make `categoryGroups` public** — replace the full file with:

```typescript
import { Injectable, Signal, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, forkJoin, map, of, startWith, switchMap } from 'rxjs';
import { Product, ProductCategory, ProductVariant, PromotionGroup } from '../models/models';
import { ProductCatalog } from './product-catalog';
import { CategoryPath, findCategoryPathBySlugs, slugify } from '../utils/category-path.util';

@Injectable({
  providedIn: 'root'
})
export class Context {

    private readonly router = inject(Router);
    private readonly productCatalog = inject(ProductCatalog);

    readonly categoryGroups = toSignal(this.productCatalog.getCategoryGroups(), { initialValue: [] });

    private readonly promotionGroups = toSignal(this.productCatalog.getPromotionGroups(), { initialValue: [] });

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

    private readonly currentUrl: Signal<string> = toSignal(
        this.router.events.pipe(
            filter((event): event is NavigationEnd => event instanceof NavigationEnd),
            map(() => this.router.url),
            startWith(this.router.url),
        ),
        { initialValue: this.router.url },
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

    readonly selectedPromotionSlug: Signal<string | null> = computed(() => {
        const path = this.currentUrl().split('?')[0].split('#')[0];
        const segments = path.split('/').filter((segment) => segment.length > 0);
        return segments[0] === 'promotions' ? (segments[1] ?? null) : null;
    });

    readonly selectedPromotionGroup: Signal<PromotionGroup | null> = computed(() => {
        const slug = this.selectedPromotionSlug();
        if (!slug) {
            return null;
        }
        return this.promotionGroups().find((group) => slugify(group.groupName) === slug) ?? null;
    });

    readonly selectedPromotionVariants: Signal<ProductVariant[]> = toSignal(
        toObservable(this.selectedPromotionGroup).pipe(
            switchMap((group) => {
                if (!group) {
                    return of([]);
                }
                return this.productCatalog.getPromotionGroupVariants(group.id);
            }),
        ),
        { initialValue: [] },
    );

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

- [ ] **Step 3: Add the category fallback to `product-card.ts`** — replace the full file with:

```typescript
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
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/utils/category-path.util.ts src/app/service/context.ts src/app/component/product-card/product-card.ts
git commit -m "Add promotion signals to Context and category fallback to ProductCard" -- src/app/utils/category-path.util.ts src/app/service/context.ts src/app/component/product-card/product-card.ts
```

---

### Task 6: Promotion entries in `CategoryMenuPanel`, `Navbar` wiring

**Files:**
- Modify: `src/app/component/category-menu-panel/category-menu-panel.ts`
- Modify: `src/app/component/category-menu-panel/category-menu-panel.html`
- Modify: `src/app/component/navbar/navbar.ts`
- Modify: `src/app/component/navbar/navbar.html`

**Interfaces:**
- Consumes: `PromotionGroup` (Task 1), `slugify` (Task 5), `ProductCatalog.getPromotionGroups` (Task 1)

- [ ] **Step 1: Add promotion entries to `category-menu-panel.ts`** — replace the full file with:

```typescript
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ProductCategory, ProductCategoryGroup, ProductSubCategoryGroup, PromotionGroup } from '../../models/models';
import { getCategoryPathSlugs, slugify } from '../../utils/category-path.util';

@Component({
  selector: 'app-category-menu-panel',
  imports: [],
  templateUrl: './category-menu-panel.html',
  styleUrl: './category-menu-panel.scss',
})
export class CategoryMenuPanel {

  groups = input<ProductCategoryGroup[]>([]);
  promotionGroups = input<PromotionGroup[]>([]);
  categorySelected = output<void>();
  private readonly router = inject(Router);

  private readonly hoveredGroupId = signal<number | null>(null);

  protected readonly activeGroup = computed(() => {
    const groups = this.groups();
    const hoveredId = this.hoveredGroupId();
    return groups.find((group) => group.id === hoveredId) ?? groups[0] ?? null;
  });

  protected onGroupHover(groupId: number): void {
    this.hoveredGroupId.set(groupId);
  }

  protected onCategoryClick(
    category: ProductCategory,
    group: ProductCategoryGroup,
    subGroup?: ProductSubCategoryGroup,
  ): void {
    this.router.navigate(['/products', ...getCategoryPathSlugs(group, category, subGroup)]);
    this.categorySelected.emit();
  }

  protected onPromotionClick(promotionGroup: PromotionGroup): void {
    this.router.navigate(['/promotions', slugify(promotionGroup.groupName)]);
    this.categorySelected.emit();
  }

}
```

- [ ] **Step 2: Append promotion `<li>`s in `category-menu-panel.html`** — replace the full file with:

```html
<div class="flex bg-white shadow-sm border border-gray-100 overflow-hidden">
  <ul class="w-64 border-r border-gray-100">
    @for (group of groups(); track group.id) {
      <li
        (mouseenter)="onGroupHover(group.id)"
        class="flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-colors"
        [class.bg-violet-50]="activeGroup()?.id === group.id"
        [class.text-violet-600]="activeGroup()?.id === group.id"
        [class.text-gray-900]="activeGroup()?.id !== group.id"
      >
        <span>{{ group.groupName }}</span>
        <span class="text-gray-400">&rsaquo;</span>
      </li>
    }
    @for (promo of promotionGroups(); track promo.id) {
      <li
        (click)="onPromotionClick(promo)"
        class="px-4 py-2.5 text-sm cursor-pointer transition-colors text-gray-900 hover:bg-violet-50 hover:text-violet-600"
      >
        <span>{{ promo.groupName }}</span>
      </li>
    }
  </ul>
  @if (activeGroup(); as active) {
    <div class="flex gap-8 p-6 min-w-[32rem]">
      @for (subGroup of active.subGroups; track subGroup.id) {
        <div class="w-48">
          <p class="font-semibold text-sm text-gray-900 mb-2">{{ subGroup.groupName }}</p>
          <ul class="space-y-1.5">
            @for (category of subGroup.categories; track category.id) {
              <li class="text-sm text-gray-600 hover:text-violet-600 cursor-pointer" (click)="onCategoryClick(category, active, subGroup)">{{ category.categoryName }}</li>
            }
          </ul>
        </div>
      }

      @if (active.categories.length > 0) {
        <div class="w-48">
          <ul class="space-y-1.5">
            @for (category of active.categories; track category.id) {
              <li class="text-sm text-gray-600 hover:text-violet-600 cursor-pointer" (click)="onCategoryClick(category, active, undefined)">{{ category.categoryName }}</li>
            }
          </ul>
        </div>
      }
    </div>
  }
</div>
```

- [ ] **Step 3: Fetch promotion groups in `navbar.ts`** — replace the full file with:

```typescript
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ProductCatalog } from '../../service/product-catalog';
import { CategoryMenuPanel } from '../category-menu-panel/category-menu-panel';
import { Context } from '../../service/context';

@Component({
  selector: 'app-navbar',
  imports: [CategoryMenuPanel, RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  private readonly productCatalog = inject(ProductCatalog);
  private readonly context = inject(Context);

  protected readonly categoryGroups = toSignal(this.productCatalog.getCategoryGroups(), {
    initialValue: [],
  });

  protected readonly promotionGroups = toSignal(this.productCatalog.getPromotionGroups(), {
    initialValue: [],
  });

  private readonly hovered = signal(false);
  private readonly categorySelected = computed(() => this.context.selectedCategorySignal() !== null);
  private closeTimeoutId: ReturnType<typeof setTimeout> | undefined;

  protected readonly categoriesMenuOpen = computed(() => !this.categorySelected() || this.hovered());

  protected onMenuEnter(): void {
    clearTimeout(this.closeTimeoutId);
    this.hovered.set(true);
  }

  // Debounced: the button and the panel aren't visually flush against each other,
  // so briefly crossing the gap between them shouldn't close the menu.
  protected onMenuLeave(): void {
    this.closeTimeoutId = setTimeout(() => this.hovered.set(false), 200);
  }

  protected onMenuButtonClick(): void {
    clearTimeout(this.closeTimeoutId);
    this.hovered.set(true);
  }

  protected onCategorySelected(): void {
    clearTimeout(this.closeTimeoutId);
    this.hovered.set(false);
  }
}
```

- [ ] **Step 4: Pass `promotionGroups` into the panel in `navbar.html`** — replace the full file with:

```html
<div class="text-sm text-white w-full">
    <div class="text-center font-medium py-2 bg-gradient-to-r from-violet-500 via-[#9938CA] to-[#E0724A]">
       <p>Pentru promotii in desfasurare <span class="underline underline-offset-2">link</span></p>
    </div>
   <nav class="relative h-[70px] grid grid-cols-3 items-center gap-4 px-6 md:px-16 lg:px-24 xl:px-32 py-4 bg-white text-gray-900 transition-all shadow">
       <div
           class="justify-self-start"
           #categoriesMenuWrapper
           (mouseenter)="onMenuEnter()"
           (mouseleave)="onMenuLeave()"
       >
           <button
               aria-label="categories-menu-btn"
               type="button"
               (click)="onMenuButtonClick()"
               class="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 active:scale-95 transition-all text-gray-900"
           >
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                   <line x1="4" y1="6" x2="20" y2="6"/>
                   <line x1="4" y1="12" x2="20" y2="12"/>
                   <line x1="4" y1="18" x2="20" y2="18"/>
               </svg>
               <span class="hidden sm:inline">Produse</span>
           </button>

           @if (categoriesMenuOpen()) {
               <app-category-menu-panel
                   class="absolute left-6 md:left-16 lg:left-24 xl:left-32 top-full z-50"
                   [groups]="categoryGroups()"
                   [promotionGroups]="promotionGroups()"
                   (categorySelected)="onCategorySelected()"
               />
           }
       </div>

       <label class="hidden md:flex w-full items-center border border-gray-300 rounded-full pl-4 pr-1.5 py-1.5 gap-2 text-gray-500 focus-within:border-gray-400 transition">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
               <circle cx="11" cy="11" r="7"/>
               <line x1="21" y1="21" x2="16.65" y2="16.65"/>
           </svg>
           <input type="search" placeholder="Cauta produse..." class="outline-none bg-transparent text-sm w-full text-gray-900 placeholder:text-gray-400" />
       </label>

       <div class="flex items-center gap-3 justify-self-end">
           <a routerLink="/admin" class="hidden md:inline-flex items-center px-3 py-2 rounded-full hover:bg-gray-50 active:scale-95 transition-all text-gray-700 text-sm">
               Admin
           </a>

           <button aria-label="account" type="button" class="hidden md:inline-flex p-2 rounded-full hover:bg-gray-50 active:scale-95 transition-all text-gray-700">
               <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                   <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                   <circle cx="12" cy="7" r="4"/>
               </svg>
           </button>

           <button aria-label="favorites" type="button" class="hidden md:inline-flex p-2 rounded-full hover:bg-gray-50 active:scale-95 transition-all text-gray-700">
               <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                   <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/>
               </svg>
           </button>

           <button aria-label="cart" type="button" class="hidden md:inline-flex p-2 rounded-full hover:bg-gray-50 active:scale-95 transition-all text-gray-700">
               <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                   <circle cx="9" cy="21" r="1"/>
                   <circle cx="20" cy="21" r="1"/>
                   <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
               </svg>
           </button>

           <button aria-label="menu-btn" type="button" class="menu-btn inline-block md:hidden active:scale-90 transition">
               <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
                   <path d="M3 7a1 1 0 1 0 0 2h24a1 1 0 1 0 0-2zm0 7a1 1 0 1 0 0 2h24a1 1 0 1 0 0-2zm0 7a1 1 0 1 0 0 2h24a1 1 0 1 0 0-2z"/>
               </svg>
           </button>
       </div>
   </nav>
</div>
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/component/category-menu-panel/category-menu-panel.ts src/app/component/category-menu-panel/category-menu-panel.html src/app/component/navbar/navbar.ts src/app/component/navbar/navbar.html
git commit -m "Show promotion groups in the category menu" -- src/app/component/category-menu-panel/category-menu-panel.ts src/app/component/category-menu-panel/category-menu-panel.html src/app/component/navbar/navbar.ts src/app/component/navbar/navbar.html
```

---

### Task 7: `/promotions/:slug` route, `PromotionPage`, `Layout` branch

**Files:**
- Modify: `src/app/app.routes.ts`
- Create: `src/app/component/promotion-page/promotion-page.ts`
- Create: `src/app/component/promotion-page/promotion-page.html`
- Create: `src/app/component/promotion-page/promotion-page.scss` (empty)
- Modify: `src/app/component/layout/layout.ts`
- Modify: `src/app/component/layout/layout.html`

**Interfaces:**
- Consumes: `Context.selectedPromotionGroup`, `selectedPromotionVariants` (Task 5); `ProductCard`, `ProductToolbar` (existing)

- [ ] **Step 1: Add the `promotions/**` route to `app.routes.ts`** — replace the full file with:

```typescript
import { Routes } from '@angular/router';
import { Layout } from './component/layout/layout';
import { AdminPage } from './component/admin/admin-page/admin-page';

export const routes: Routes = [
    // A single route for any /products/... depth (group/category or group/subGroup/category)
    // so Angular never treats a depth change as a different route config and tears down
    // Layout (and everything inside it, including the navbar) between them.
    {
        path: 'products/**',
        component: Layout,
        title: 'Lavander',
    },
    // A promotion page is a flat listing (no nested product/variant sub-routes) — but still
    // routed through Layout/** for the same reason as products/** above.
    {
        path: 'promotions/**',
        component: Layout,
        title: 'Lavander',
    },
    {
        path: 'admin',
        component: AdminPage,
        title: 'Lavander Admin',
    },
    {
        path: '',
        component: Layout,
        title: 'Lavander',
    }
];
```

- [ ] **Step 2: Create `promotion-page.ts`**

```typescript
import { Component, computed, inject } from '@angular/core';
import { Context } from '../../service/context';
import { ProductCard } from '../product-card/product-card';
import { ProductToolbar } from '../product-toolbar/product-toolbar';

@Component({
  selector: 'app-promotion-page',
  imports: [ProductCard, ProductToolbar],
  templateUrl: './promotion-page.html',
  styleUrl: './promotion-page.scss',
})
export class PromotionPage {
  protected readonly context = inject(Context);
  protected readonly variants = this.context.selectedPromotionVariants;
  protected readonly groupName = computed(() => this.context.selectedPromotionGroup()?.groupName ?? '');
}
```

- [ ] **Step 3: Create `promotion-page.html`**

```html
<div class="min-w-0 border border-gray-200 rounded-xl bg-white p-6">
  <h1 class="text-lg font-semibold text-gray-900 mb-4">{{ groupName() }}</h1>
  <app-product-toolbar [count]="variants().length" />

  @if (variants().length > 0) {
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      @for (variant of variants(); track variant.id) {
        <app-product-card [variant]="variant" />
      }
    </div>
  } @else {
    <p class="text-sm text-gray-500">Niciun produs gasit pentru aceasta promotie.</p>
  }
</div>
```

- [ ] **Step 4: Create empty `promotion-page.scss`**

- [ ] **Step 5: Branch to `PromotionPage` in `Layout`** — replace `layout.ts` with:

```typescript
import { Component, computed, inject, Signal } from '@angular/core';
import { Navbar } from "../navbar/navbar";
import { ProductPage } from "../product-page/product-page";
import { ProductDetail } from "../product-detail/product-detail";
import { PromotionPage } from "../promotion-page/promotion-page";
import { Sidebar } from "../sidebar/sidebar";
import { Context } from '../../service/context';

@Component({
  selector: 'app-layout',
  imports: [Navbar, ProductPage, ProductDetail, PromotionPage, Sidebar],
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

  isPromotionSelected: Signal<boolean> = computed(() => {
    return this.context.selectedPromotionGroup() !== null;
  });

}
```

And replace `layout.html` with:

```html
<app-navbar></app-navbar>

<div class="w-full px-6 md:px-16 lg:px-24 xl:px-32 py-8 bg-gray-50">
  <div class="flex items-start gap-4">
    @if (isProductSelected()) {
      <app-product-detail class="flex-1 min-w-0"></app-product-detail>
    } @else if (isPromotionSelected()) {
      <app-promotion-page class="flex-1 min-w-0"></app-promotion-page>
    } @else {
      @if (isCategorySelected()) {
        <app-sidebar></app-sidebar>
      }
      <app-product-page class="flex-1 min-w-0"></app-product-page>
    }
  </div>
</div>
```

No sidebar on a promotion page: `Sidebar`'s filters are built from a single category's properties (`context.selectedCategorySignal()`), which doesn't generalize to a listing pooled from unrelated categories.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/app.routes.ts src/app/component/promotion-page/ src/app/component/layout/layout.ts src/app/component/layout/layout.html
git commit -m "Add /promotions/:slug route, PromotionPage, and Layout branch" -- src/app/app.routes.ts src/app/component/promotion-page/ src/app/component/layout/layout.ts src/app/component/layout/layout.html
```

---

### Task 8: Full manual verification

**Files:** none (verification only)

**Prerequisite:** the backend plan `estore/docs/superpowers/plans/2026-08-18-promotion-tags-api.md` must already be implemented and its seed data loaded (it seeds a "Produse sub 20 Lei" promotion group tagging "Domestos Pine Fresh" and "Alint Hartie Igienica Piersica" — two variants in different top-level category groups, Curatenie and Igiena si Cosmetice — which Step 5 below relies on to prove cross-category routing).

- [ ] **Step 1: Restart both servers**

Backend: from `estore/`, stop any running instance on port 8080, then `export JAVA_HOME=/Users/adrianazoitei/Library/Java/JavaVirtualMachines/openjdk-26.0.1/Contents/Home && ./gradlew bootRun` (background). Frontend: confirm the `lavander` dev server is running with live reload (start it if not).

- [ ] **Step 2: Admin — Tags and Promotion Groups CRUD**

Navigate to `http://localhost:4200/admin`. Open the Tags section: confirm the seeded "Produs sub 20 Lei" tag is listed, create a second test tag, edit it, delete it. Open the Promotion Groups section: confirm the seeded "Produse sub 20 Lei" group is listed with its tag; create a second test group referencing the seeded tag, then delete it.

- [ ] **Step 3: Admin — tag a variant via the Variants form**

Open the Variants section, edit "Dell XPS 13", check the seeded tag's checkbox, save. Confirm the update succeeds with no error. Edit it again and confirm the checkbox is still checked (round-trips correctly).

- [ ] **Step 4: Promotion group appears in the site menu**

Navigate to `http://localhost:4200/`. Hover/click the "Produse" menu button. Confirm "Produse sub 20 Lei" appears as a flat entry below the category groups (Electronics/Curatenie/Igiena si Cosmetice) — with no `›` chevron and no flyout panel on hover, unlike the category groups above it.

- [ ] **Step 5: Cross-category pooled listing and fallback routing**

Click "Produse sub 20 Lei". Confirm the URL is `/promotions/produse-sub-20-lei` and the page lists exactly two variants: "Domestos Pine Fresh" and "Alint Hartie Igienica Piersica". Click "Domestos Pine Fresh" (Curatenie category). Confirm it navigates to its real category URL (`/products/curatenie/detergenti/...` or whichever category the seed assigns it — the exact slugs come from `scripts/seed-catalog-data.sql`) and the product detail page renders correctly with a working breadcrumb, not a blank or broken page. Use the browser back button, return to the promotion listing, and click "Alint Hartie Igienica Piersica" (Igiena si Cosmetice category, a different top-level group) — confirm it also correctly reaches its own real category page. This proves `ProductCard`'s `categoryId` fallback works for variants whose category isn't the one currently being browsed, not just the happy-path case.

- [ ] **Step 6: Console check**

Check the browser console throughout Steps 4-5 for errors — none expected.

- [ ] **Step 7: Regression check — normal category browsing still works**

Navigate to `http://localhost:4200/products/electronics/computers/laptops`, confirm the grid renders, click a product card, confirm it still routes correctly via the original (non-fallback) path in `ProductCard.onCardClick`, and confirm the variant tag-switcher on the product detail page still works as before.
