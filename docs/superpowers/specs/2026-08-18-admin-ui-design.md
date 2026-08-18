# Admin UI (Frontend)

Date: 2026-08-18

## Context

Sub-project 2 of the admin feature (sub-project 1, the backend CRUD API,
is done and committed). This adds the `/admin` page itself: full
create/edit/delete for all 6 catalog entities, built against that API.

## Backend prerequisite: two new list-all endpoints

Everything else needed already exists (`GET /api/product-categories/groups`
returns the full group→subgroup→category tree; `GET
/api/property-definitions` already lists all property definitions from
sub-project 1). Two gaps remain, both trivial additions to the existing
controllers/services from sub-project 1:

- `GET /api/products` → `ProductService.getAllProducts()` →
  `productRepository.findAll()` mapped to `ProductDto`.
- `GET /api/products/variants` → `ProductService.getAllVariants()` →
  `productVariantRepository.findAll()` mapped to `ProductVariantDto`.

Without these, the admin Products/Variants sections and the Variants
section's "pick a product" dropdown would have no way to see the full set.

## Frontend: new request DTOs

New file `src/app/models/admin-requests.ts` (kept separate from
`models.ts`'s read-side domain shapes — these change together with the
admin feature, not with catalog display code), mirroring the backend's
request DTOs exactly:

```typescript
export interface PropertyDefinitionRequest { propertyName: string; }
export interface ProductCategoryGroupRequest { groupName: string; }
export interface ProductSubCategoryGroupRequest { groupName: string; parentGroupId: number; }
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
export interface PropertyValueInput { propertyDefinitionId: number; value: string; }
export interface ProductVariantRequest {
  variantName: string;
  variantDescription: string;
  productId: number;
  price: number;
  starRating: number;
  variantProperties: PropertyValueInput[];
}
```

## `ProductCatalog` service additions

One `get`/`create`/`update`/`delete` method per entity (list methods
where a list-all endpoint exists), added alongside the existing
read methods — no abstraction over the repetition; each is a one-line
`this.http.get/post/put/delete` call, matching the service's existing
style.

## Tree-flattening utility

New file `src/app/utils/admin-category-tree.util.ts`. Subgroups and
categories don't carry their parent's id in their response DTOs (by
design, from the original data model — avoids JSON cycles), but the
group tree response nests them under their actual parent, so the parent
association is recovered by flattening:

```typescript
flattenSubGroups(groups: ProductCategoryGroup[]): { subGroup: ProductSubCategoryGroup; parentGroupId: number }[]
flattenCategories(groups: ProductCategoryGroup[]): { category: ProductCategory; parentGroupId?: number; parentSubGroupId?: number }[]
```

Used to populate the Subgroups and Categories admin lists (with the
correct parent pre-selected in edit mode) from the single already-fetched
groups tree — no new "list all subgroups"/"list all categories" backend
endpoint needed.

## Structure

```
src/app/component/admin/
  admin-page/                 — shell: left-hand section nav + router-outlet-free section switch (a signal, not a route per section)
  admin-properties/
  admin-groups/
  admin-subgroups/
  admin-categories/
  admin-products/
  admin-variants/
```

Route: `/admin` → `AdminPage` (added to `app.routes.ts` as a sibling of
the existing `products/**` and `''` routes — a plain new route, not
nested under `products/**`). A small "Admin" link is added to the navbar.

Each section component independently fetches whatever lists it depends
on (its own entity list, plus any parent/reference lists for its
dropdowns) on init — no shared cross-section state coordinator. At this
dataset's scale (~15 properties, ~9 products) a few redundant GETs per
section switch is a non-issue, and it keeps each section a fully
self-contained, independently understandable component.

## Per-section pattern (identical shape across all 6)

- One form, top of the section. Create mode by default (`editingId` signal
  = `null`). Clicking a list row's "Edit" populates the form and sets
  `editingId`; the form's submit button calls `create` or `update`
  accordingly. "Cancel" resets to create mode.
- A list below, one row per item, with Edit/Delete actions.
- Delete: a plain `confirm()` dialog, then `DELETE`. A `409` response's
  `message` is shown inline (the section's delete-guard rejection —
  e.g. "still has subgroups") rather than swallowed.
- A `400` (validation, or the category exactly-one-parent rule) shows the
  response body's `message` (or the first `fieldErrors` entry) inline
  above the form.
- Foreign-key fields are `<select>` dropdowns over an already-fetched
  list (e.g. Subgroup's `parentGroupId` over the Groups list).
- Multi-select fields (`categoryPropertyIds`, `extraPropertyIds`) are
  checkboxes over the Properties list.
- `ProductVariantRequest.variantProperties` is a dynamic add/remove list
  of rows, each a property-definition `<select>` (over *all* property
  definitions, not filtered to the product's category — keeps the form
  simple; a mismatched pick is an admin data-entry mistake, not a
  technical block) plus a free-text value input.

## Field list per section

| Section | Fields | Dropdown/checkbox sources |
|---|---|---|
| Properties | `propertyName` | — |
| Groups | `groupName` | — |
| Subgroups | `groupName`, `parentGroupId` | Groups |
| Categories | `categoryName`, parent-type radio (Group/Subgroup) + matching select, `categoryPropertyIds` | Groups, Subgroups, Properties |
| Products | `productName`, `productDescription`, `categoryId`, `extraPropertyIds` | Categories (flattened), Properties |
| Variants | `variantName`, `variantDescription`, `productId`, `price`, `starRating`, `variantProperties[]` | Products, Properties |

## Out of scope

- Authentication (per the earlier decision on sub-project 1).
- Pagination (dataset is small).
- Editing which properties a category/product has after the fact via
  anything richer than the checkbox list (no drag-reorder, etc).
