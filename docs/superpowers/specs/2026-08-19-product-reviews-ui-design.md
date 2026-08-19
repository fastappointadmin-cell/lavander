# Product Reviews UI — Design

## Goal

Remove the manual "Star rating" input from the admin variant form and add a real
review-submission widget to the product detail page, wired to the backend's new
`Review` mechanism (`estore`'s `2026-08-19-product-reviews-api-design.md`).

## Models

`ProductVariant.starRating` stays the same TS type (`number` already covers a
fractional average) — no shape change needed there. It gains `reviewCount: number`.

`ProductVariantRequest` drops `starRating` — it's no longer sent on create/update.

New `ReviewRequest` in `admin-requests.ts` (kept alongside the other
request-payload shapes for consistency, even though submitting a review isn't an
admin-only action):

```typescript
export interface ReviewRequest {
  rating: number;
}
```

## Service

`ProductCatalog` gains one method:

```typescript
submitReview(variantId: number, request: ReviewRequest): Observable<ProductVariant> {
    return this.http.post<ProductVariant>(`${this.baseUrl}/api/products/variants/${variantId}/reviews`, request);
}
```

## Admin — remove the field entirely

`admin-variants.ts`: delete the `starRating` field, its `null`-check in `submit()`'s
validation, its assignment in `startEdit`/`copyFrom`/`cancel`, and its entry in the
request object built in `submit()`.

`admin-variants.html`: delete the "Star rating" `<label>`/`<input>` block from the
form. Nothing else in the admin UI references star rating (the table listing
already doesn't show it).

## Product detail page

**Existing display row** (`product-detail.html`): unchanged rendering logic
(`star <= v.starRating`, still a reasonable approximation for a fractional average —
it visually floors, e.g. `4.3` shows 4 filled stars, which is an acceptable
simplification, not a half-star renderer). Gains a review-count caption next to it:

```html
<div class="flex items-center gap-2">
  <div class="flex items-center gap-0.5">
    @for (star of starIndices; track star) {
      <svg ... [attr.fill]="star <= v.starRating ? '#f59e0b' : 'none'" ...> ... </svg>
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
```

**New "Evalueaza acest produs" widget** — a 4th sibling in the page's top-level
grid (alongside the image, the info column, and the existing "Specificatii" block).
With `grid-cols-2` auto-flow, a 4th item lands under the info column on desktop
(row 2, column 2) and simply stacks last on mobile (after Specificatii) — no new
layout classes needed, same trick already used to place Specificatii under the
image.

```html
@if (v.variantProperties.length > 0) {
  <div class="max-w-md w-full mx-auto lg:mx-0"> <!-- existing Specificatii block --> </div>
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
```

**Component (`product-detail.ts`):**

- `selectedReviewRating = signal(0)`, `submittingReview = signal(false)`,
  `reviewSubmitted = signal(false)`.
- `onStarPick(rating: number): void` sets `selectedReviewRating`.
- A local `reviewOverride = signal<ProductVariant | null>(null)`, and `variant`
  changes from a direct signal reference to a `computed` that prefers the override
  **only while its id still matches the live context variant** — so navigating to a
  different variant (e.g. via the tag-switcher) can't leak a stale override onto
  the wrong page, with no explicit reset call needed:

```typescript
protected readonly variant = computed(() => {
    const live = this.context.selectedVariant();
    const override = this.reviewOverride();
    return override && live && override.id === live.id ? override : live;
});
```

  (This exists because `Context.selectedVariant` is a `toSignal`-derived read from
  a GET request with no built-in manual-refresh hook — overriding locally with the
  POST response is simpler than restructuring `Context` to support refreshing.)

- `onSubmitReview(): void` — no-ops if no variant or `selectedReviewRating() === 0`;
  otherwise calls `productCatalog.submitReview(variant.id, { rating })`, and on
  success sets `reviewOverride` to the response, resets `selectedReviewRating` to
  `0`, and sets `reviewSubmitted` to `true` (so the confirmation line shows).

## Testing

No new algorithmic complexity — manual browser verification, matching this
session's established pattern: submit a rating on a variant with no prior reviews
(confirm the display row updates immediately and the count goes from "Fara evaluari
inca" to "(1 evaluare)"), submit a second rating on the same variant (confirm the
average changes and the count becomes "(2 evaluari)"), and confirm the admin
variant form no longer has a Star rating field and create/edit still works without
it.
