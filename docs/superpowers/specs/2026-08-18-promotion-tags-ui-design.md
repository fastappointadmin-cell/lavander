# Promotion Tags UI — Design

## Goal

Surface the backend's new Tag/PromotionGroup entities (see the `estore` repo's
`2026-08-18-promotion-tags-api-design.md`) in the admin, and integrate promotion
groups into the site's existing category menu and browsing experience — mixed into
the same "Produse" dropdown, per the user's explicit choice, rather than a separate
nav section.

## Models

`src/app/models/models.ts` gains:

```typescript
export interface Tag {
  id: number;
  tagName: string;
}

export interface PromotionGroup {
  id: number;
  groupName: string;
  tags: Tag[];
}
```

`ProductRef` gains `categoryId: number` (mirrors the backend's `ProductRefDto.categoryId`).
`ProductVariant` gains `tags: Tag[]`.

`src/app/models/admin-requests.ts` gains:

```typescript
export interface TagRequest {
  tagName: string;
}

export interface PromotionGroupRequest {
  groupName: string;
  tagIds: number[];
}
```

`ProductVariantRequest` gains `tagIds: number[]`.

## Service

`ProductCatalog` gains, following the existing CRUD method pattern exactly:

```typescript
getTags(): Observable<Tag[]>
createTag(request: TagRequest): Observable<Tag>
updateTag(id: number, request: TagRequest): Observable<Tag>
deleteTag(id: number): Observable<void>

getPromotionGroups(): Observable<PromotionGroup[]>
createPromotionGroup(request: PromotionGroupRequest): Observable<PromotionGroup>
updatePromotionGroup(id: number, request: PromotionGroupRequest): Observable<PromotionGroup>
deletePromotionGroup(id: number): Observable<void>
getPromotionGroupVariants(id: number): Observable<ProductVariant[]>
```

## Admin UI

Two new sections in `admin-page`, alongside the existing six, following their exact
structure (`items`/`editingId`/`errorMessage` signals, `load`/`startEdit`/`cancel`/
`submit`/`remove`):

- **`admin-tags`** — plain CRUD, identical shape to `admin-properties` (single
  `tagName` field).
- **`admin-promotion-groups`** — CRUD with a tag multi-select, following the exact
  checkbox pattern `admin-products` already uses for `extraPropertyIds`
  (`selectedTagIds: Set<number>` + `toggleTagId(id)` + `[checked]="selectedTagIds.has(tag.id)"`).

**`admin-variants`** gets the same tag multi-select added to its form (alongside the
existing property rows), so a variant can be flagged with one or more tags directly
when creating or editing it — `selectedTagIds`/`toggleTagId`, submitted as `tagIds` in
`ProductVariantRequest`.

## Site Integration

### Routing

`app.routes.ts` gains a route mirroring the existing `products/**` one:

```typescript
{ path: 'promotions/**', component: Layout, title: 'Lavander' },
```

A promotion page is a flat listing (no nested product/variant sub-routes) — clicking a
variant inside it navigates to that variant's **real** category-based product-detail
URL (`/products/<slugs>/product/:id/variant/:id`), reusing the existing, already-working
`ProductDetail` page/breadcrumb/variant-switcher rather than building a parallel detail
view for promotions. This is what `ProductRef.categoryId` is for (see below).

### `Context`

Additive signals, independent of the existing `/products/...`-scoped
`routeSegments`/`selectedProductId`/etc. (which stay untouched — no regression risk to
the working product-browsing flow):

```typescript
private readonly promotionGroups = toSignal(this.productCatalog.getPromotionGroups(), { initialValue: [] });

private readonly currentUrl: Signal<string> = toSignal(
    this.router.events.pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        map(() => this.router.url),
        startWith(this.router.url),
    ),
    { initialValue: this.router.url },
);

readonly selectedPromotionSlug: Signal<string | null> = computed(() => {
    const segments = this.currentUrl().split('?')[0].split('#')[0].split('/').filter((s) => s.length > 0);
    return segments[0] === 'promotions' ? (segments[1] ?? null) : null;
});

readonly selectedPromotionGroup: Signal<PromotionGroup | null> = computed(() => {
    const slug = this.selectedPromotionSlug();
    return slug ? this.promotionGroups().find((g) => slugify(g.groupName) === slug) ?? null : null;
});

readonly selectedPromotionVariants: Signal<ProductVariant[]> = toSignal(
    toObservable(this.selectedPromotionGroup).pipe(
        switchMap((group) => group ? this.productCatalog.getPromotionGroupVariants(group.id) : of([])),
    ),
    { initialValue: [] },
);
```

`categoryGroups` (currently `private`) becomes `readonly` (still a read-only signal) —
`ProductCard` needs it to resolve a variant's category path when navigating away from a
promotion listing (see below).

### `Layout`

Gains `isPromotionSelected = computed(() => this.context.selectedPromotionGroup() !== null)`.
Template gains a branch: when a promotion is selected, render `<app-promotion-page>`
instead of `<app-sidebar>` + `<app-product-page>` — no sidebar on promotion pages, since
`Sidebar`'s filters are category-property-based and don't generalize across a listing
pooled from unrelated categories.

### `PromotionPage` (new component)

Mirrors `ProductPage`: `app-product-toolbar [count]="variants().length"` + a grid of
`app-product-card` over `context.selectedPromotionVariants()`, with
`context.selectedPromotionGroup()?.groupName` as the heading.

### `ProductCard`

`onCardClick()` currently builds the target URL from `context.selectedCategoryPath()`,
which is only populated on `/products/...` routes. On a promotion page it's null, so
click resolution falls back to the variant's own category:

```typescript
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
```

`category-path.util.ts` gains:

```typescript
export function findCategoryPathByCategoryId(groups: ProductCategoryGroup[], categoryId: number): CategoryPath | null {
  for (const group of groups) {
    const direct = group.categories.find((c) => c.id === categoryId);
    if (direct) {
      return { group, category: direct };
    }
    for (const subGroup of group.subGroups) {
      const nested = subGroup.categories.find((c) => c.id === categoryId);
      if (nested) {
        return { group, subGroup, category: nested };
      }
    }
  }
  return null;
}
```

### `CategoryMenuPanel`

Gains a second input, `promotionGroups = input<PromotionGroup[]>([])`, rendered as
extra `<li>` entries appended below the existing category groups in the same
left-hand list — but without the `›` chevron (they have no flyout) and with
`(click)="onPromotionClick(promo)"` instead of `(mouseenter)`:

```typescript
protected onPromotionClick(promo: PromotionGroup): void {
  this.router.navigate(['/promotions', slugify(promo.groupName)]);
  this.categorySelected.emit();
}
```

Reuses the existing `categorySelected` output (already used to close the flyout on a
category click) rather than introducing a new event — it's really "a menu item was
picked," which a promotion click also is.

### `Navbar`

Gains `protected readonly promotionGroups = toSignal(this.productCatalog.getPromotionGroups(), { initialValue: [] });`
(mirrors its existing independent `categoryGroups` fetch) and passes it to the panel:
`[promotionGroups]="promotionGroups()"`.

## Testing

No new algorithmic complexity beyond straightforward CRUD forms and the category-path
fallback lookup — manual browser verification (as done for every other admin/site
feature this session) is sufficient. Specifically verify: creating a tag, creating a
promotion group referencing it, tagging a variant with it, seeing the group appear in
the "Produse" menu, clicking through to the pooled listing, and clicking a pooled card
that belongs to a *different* category than the currently browsed one (proving the
`categoryId` fallback routing actually works, not just the case where it happens to
match the current route).
