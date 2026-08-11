# Product Catalog Model + Mock Server — Design

## Problem

The current `Product`/`ProductVariant` model has no link between a subcategory's
declared properties and a variant's actual property values — a variant just
declares its own free-floating `propertyName`/`propertyValue` pairs, so nothing
ties them back to what the subcategory (or product) requires. The goal is a
model where a category has subcategories, a subcategory declares required
properties, a product can add extra properties on top of that, and a variant's
property values reference those declarations — making "does this variant define
everything it's required to" a checkable statement (checking itself is out of
scope for this pass).

On top of the model, we also want a small mock data layer so the catalog can be
exercised in the app before any real backend exists: an `Electronics` category
with a `Laptops` subcategory, a few laptop brands as products, and a couple of
variants with filled-in property values.

## Data model (`src/app/models/models.ts`)

```typescript
interface PropertyDefinition {
  id: number;
  propertyName: string;
}

interface ProductCategory {
  id: number;
  categoryName: string;
  listOfSubCategories: ProductSubCategory[];
}

interface ProductSubCategory {
  id: number;
  subCategoryName: string;
  listOfCategoryProperties: PropertyDefinition[]; // required for every variant in this subcategory
}

interface Product {
  id: number;
  productName: string;
  productDescription: string;
  productCategory: ProductCategory;
  productSubCategory: ProductSubCategory;
  listOfProductExtraProperties: PropertyDefinition[]; // additional properties this product requires, on top of the subcategory's
}

interface PropertyValue {
  id: number;
  propertyDefinition: PropertyDefinition; // which required property this fulfills
  propertyValue: string;
}

interface ProductVariant {
  id: number;
  variantName: string;
  variantDescription: string;
  product: Product;
  listOfVariantProperties: PropertyValue[]; // must contain one entry per definition in product.productSubCategory.listOfCategoryProperties + product.listOfProductExtraProperties
}
```

Changes from the original file:
- `ProductCategoryProperty` and `ProductProperty` are unified into one
  `PropertyDefinition` (name only), reused by both subcategories and products —
  both are just "declaring a property exists."
- The old `ProductProperty` (name + value) becomes `PropertyValue`, used only at
  the variant level, referencing a `PropertyDefinition` instead of re-declaring
  the name.
- `ProductCategory`, `Product`'s other fields, and `ProductVariant`'s other
  fields are unchanged in shape.
- Enforcement (validating that a variant's `listOfVariantProperties` actually
  covers every required definition) is explicitly **out of scope** for this
  pass — the model just makes it representable/checkable later.

## Mock data + service

**Files:**
- `src/app/mock-data/mock-catalog-data.ts` — plain exported constants:
  `MOCK_CATEGORIES`, `MOCK_PRODUCTS`, `MOCK_VARIANTS`.
- `src/app/services/product-catalog.service.ts` — injectable service
  (`providedIn: 'root'`) with `getCategories()`, `getProducts()`,
  `getVariants()`, each returning an `Observable` via `of(...)` to mimic an
  async API without any real HTTP call.

**Sample data:**
- Category: `Electronics` → Subcategory: `Laptops`, with required
  `PropertyDefinition`s `RAM` and `Screen Size`.
- Products (brands) in `Laptops`: Dell, Apple, Lenovo. Apple additionally
  declares an extra property `Chip`.
- Variants: one or two per brand (e.g. "Dell XPS 13", "MacBook Pro 14",
  "Lenovo ThinkPad X1"), each with `PropertyValue`s covering RAM + Screen Size,
  and Chip for the Apple variant — demonstrating the model's enforcement rule
  with real data.

## Non-goals

- No runtime/form validation logic that checks a variant against required
  properties — model only, per explicit scope decision.
- No real HTTP layer (no `angular-in-memory-web-api`, no Express routes) — the
  service returns static data wrapped in `of(...)`.
