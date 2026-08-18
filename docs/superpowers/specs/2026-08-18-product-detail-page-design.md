# Product Detail Page

Date: 2026-08-18

## Context

`lavander` currently shows a category's products as a card grid
(`Layout` → `Sidebar` + `ProductPage` → `ProductCard` per variant), but
clicking a card goes nowhere — there is no single-product view. This spec
adds one, modeled on a typical e-commerce product page (reference: an eMAG
product page screenshot), with the standout feature being tags that switch
between a product's variants (e.g. different RAM configs or sizes).

Both the frontend (`lavander`) and backend (`estore`) are otherwise
already fully wired: `models.ts` matches the backend DTOs exactly
(`ProductCategoryRef`, `ProductRef`, etc.), `Context`/`ProductCatalog` are
HTTP-backed against real controllers (`ProductController`,
`ProductCategoryController`), and `mock-catalog-data.ts` is dead code (no
longer imported anywhere). This feature reuses that live data path.

## Data: no backend changes

`GET /api/products/{productId}/variants` (already implemented, already
called by `Context.selectedCategoryVariants`) returns every variant of a
product. That single call supplies everything the detail page needs: the
"current" variant and the full sibling list to build the switcher from.
No new endpoint is added.

**Mock data caveat:** every product in the seed data currently has exactly
one variant, so the switcher has nothing to switch between yet. Two
products get extra variants added to `estore/scripts/seed-catalog-data.sql`
(and re-applied to the live database):
- The Apple laptop gains a second RAM configuration (e.g. 24GB alongside
  the existing 18GB), reusing the existing RAM/Chip/Screen Size property
  definitions.
- One cleaning product (e.g. Ariel) gains a second size/quantity variant,
  reusing the existing Cantitate property definition for that category.

## Routing

Extend the existing single wildcard route (`products/**` → `Layout`) —
already deliberately a single route so `Layout` never tears down across
depth changes — to recognize a trailing `product/:productId` segment,
with an optional `variant/:variantId` after it:

```
/products/electronics/computers/laptops/product/2
/products/electronics/computers/laptops/product/2/variant/5
```

The leading segments are the same category slug path already resolved by
`findCategoryBySlugs`. No new top-level route is added — `Layout` keeps
owning the whole `/products/**` subtree, exactly as it does today.

## `Context` changes

- `currentCategorySlugs()` stops consuming segments once it reaches a
  `product` marker, so category slug resolution (and thus
  `selectedCategorySignal`) is unaffected by the trailing product/variant
  segments.
- New signals, parsed from the same router-event-driven URL read
  `categorySlugs` already uses:
  - `selectedProductId: Signal<number | null>`
  - `selectedVariantId: Signal<number | null>`
- `selectedProductVariants: Signal<ProductVariant[]>` — `toSignal` over
  `getVariantsByProductId(selectedProductId)`, same `switchMap` pattern as
  the existing `selectedCategoryVariants`.
- `selectedVariant: Signal<ProductVariant | null>` — the variant from
  `selectedProductVariants()` matching `selectedVariantId()`, or the first
  one if no variant id is in the URL (or it doesn't match any variant).

## Component: `ProductDetail`

`Layout` swaps `Sidebar` + `ProductPage` for a new `ProductDetail`
component whenever `Context.selectedProductId()` is non-null — the same
conditional-swap pattern `Layout` already uses for `Sidebar` via
`isCategorySelected`.

Sections (kept to what's actually modeled — no delivery/warranty/Q&A
sections from the reference screenshot, none of that exists in this
domain):
- Breadcrumb: Group / Subgroup (if any) / Category / Product name.
- Image placeholder (reuses the same SVG placeholder `ProductCard` already
  uses — no real product images exist).
- Title: `{{ product.productName }} {{ variant.variantName }}`.
- Star rating (reuses `ProductCard`'s existing star-row pattern).
- Price.
- Variant switcher (see below).
- Add-to-cart button (visual only, same as `ProductCard`'s — no cart
  feature exists yet).

## Variant switcher

Group `selectedProductVariants()` by `propertyDefinition.id` into rows —
one row per property that has more than one distinct value across the
product's variants (a property with only one observed value across all
variants isn't shown as a switchable row, just implied by the product
description).

```
Alege RAM: 18GB
[ 16GB ] [ 18GB ● ]
```

Clicking a tag:
1. Builds the target selection (every row's currently-selected value,
   with the clicked row's value changed).
2. Looks for a variant whose `variantProperties` match every value in the
   target selection exactly.
3. If none matches exactly (incomplete matrix), falls back to the variant
   sharing the most matching values with the target selection.
4. Navigates to `.../product/:productId/variant/:matchedVariantId`.

The currently-displayed variant's own property values seed each row's
initial selection.

## Breadcrumb data

`Context` already resolves `selectedCategorySignal` from the URL slugs
against `categoryGroups()`; the breadcrumb needs the matched group (and
subgroup, if any) alongside the category, not just the category itself.
`Context` gains `selectedCategoryPath: Signal<{ group: ProductCategoryGroup;
subGroup?: ProductSubCategoryGroup; category: ProductCategory } | null>`,
computed the same way `selectedCategorySignal` is (walking `categoryGroups()`
against the slugs), replacing the plain category lookup as the shared
source for both the breadcrumb and `selectedCategorySignal` (which becomes
a thin `computed` reading `.category` off the path signal, so existing
callers don't change).
