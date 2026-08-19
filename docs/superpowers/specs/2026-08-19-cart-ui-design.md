# Shopping Cart UI — Design

## Goal

Wire the storefront's two already-present but decorative "Adaugă în Coș"
buttons (product card, product detail) and the decorative navbar cart
icon/bottom-tab entry to a real cart, backed by the new `estore` cart API
(`docs/superpowers/specs/2026-08-19-cart-api-design.md`). Add a desktop
quick-edit dropdown and a dedicated `/cart` page.

## Models

```typescript
export interface Cart {
  id: number;
  items: CartItem[];
}

export interface CartItem {
  id: number;
  variant: ProductVariant;
  quantity: number;
}
```

Added to `admin-requests.ts`, alongside `ReviewRequest` — not admin-only
actions, but this codebase already keeps all request-payload shapes there:

```typescript
export interface AddCartItemRequest {
  variantId: number;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}
```

## Cross-origin cookies

The backend identifies the cart via an HTTP-only cookie, so every request
needs to carry credentials. `app.config.ts` currently has no explicit
`provideHttpClient()` call at all (`HttpClient` injection works today
regardless — Angular resolves it some other way — but using
`withInterceptors` requires an explicit `provideHttpClient()`, so this adds
one regardless of how it worked before). New interceptor file
`src/app/interceptor/with-credentials.interceptor.ts`:

```typescript
import { HttpInterceptorFn } from '@angular/common/http';

export const withCredentialsInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req.clone({ withCredentials: true }));
};
```

`app.config.ts`:

```typescript
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { withCredentialsInterceptor } from './interceptor/with-credentials.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(),
    provideHttpClient(withInterceptors([withCredentialsInterceptor])),
  ]
};
```

Applying this globally (not per cart call) is harmless for every other
existing endpoint — none of them use cookies, so `withCredentials: true` is
a no-op for them.

## CartStore service

New file `src/app/service/cart-store.ts` — a dedicated signal-based service
(`providedIn: 'root'`, same pattern as `Context`), not folded into `Context`
itself: cart state isn't tied to category navigation and needs to be read
simultaneously from the navbar, product cards/detail, and the cart page.

```typescript
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Cart, CartItem } from '../models/models';
import { AddCartItemRequest, UpdateCartItemRequest } from '../models/admin-requests';
import { environment } from '../../env/env';

@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.backendUrl;

  private readonly cart = signal<Cart | null>(null);
  readonly items = computed(() => this.cart()?.items ?? []);
  readonly itemCount = computed(() => this.items().reduce((sum, item) => sum + item.quantity, 0));
  readonly subtotal = computed(() =>
    this.items().reduce((sum, item) => sum + item.variant.price * item.quantity, 0),
  );

  constructor() {
    this.loadCart();
  }

  loadCart(): void {
    this.http.get<Cart>(`${this.baseUrl}/api/cart`).subscribe((cart) => this.cart.set(cart));
  }

  addItem(variantId: number, quantity: number): void {
    const request: AddCartItemRequest = { variantId, quantity };
    this.http.post<Cart>(`${this.baseUrl}/api/cart/items`, request).subscribe((cart) => this.cart.set(cart));
  }

  updateItemQuantity(itemId: number, quantity: number): void {
    const request: UpdateCartItemRequest = { quantity };
    this.http.put<Cart>(`${this.baseUrl}/api/cart/items/${itemId}`, request).subscribe((cart) => this.cart.set(cart));
  }

  removeItem(itemId: number): void {
    this.http.delete<Cart>(`${this.baseUrl}/api/cart/items/${itemId}`).subscribe((cart) => this.cart.set(cart));
  }

  /** Decrementing below 1 removes the item — the backend requires quantity >= 1. */
  decrementItem(item: CartItem): void {
    if (item.quantity <= 1) {
      this.removeItem(item.id);
    } else {
      this.updateItemQuantity(item.id, item.quantity - 1);
    }
  }
}
```

`loadCart()` runs once in the constructor — `CartStore` is a root singleton,
so this fires once at first injection (in practice, when `Navbar`
constructs, since it's always present inside `Layout`), not tied to any
particular component's lifecycle. Cart state isn't route-derived like
`Context`'s signals, so an explicit imperative load (rather than a reactive
`toSignal` chain) is the simplest correct fit.

## Route

`app.routes.ts` gains a `/cart` entry, routed through `Layout` like
`products/**`/`promotions/**` so the navbar stays present:

```typescript
{
    path: 'cart',
    component: Layout,
    title: 'Lavander - Cos',
},
```

`Layout` currently switches its content via `Context`-derived signals
(`isProductSelected`, `isPromotionSelected`, `isCategorySelected`). It has
no existing signal for "on `/cart`", so it gains one, using the same
`toSignal(router.events.pipe(filter(NavigationEnd), ...))` pattern already
used in `Context` (`src/app/service/context.ts`):

```typescript
import { Component, computed, inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { Navbar } from "../navbar/navbar";
import { ProductPage } from "../product-page/product-page";
import { ProductDetail } from "../product-detail/product-detail";
import { PromotionPage } from "../promotion-page/promotion-page";
import { CartPage } from "../cart-page/cart-page";
import { Sidebar } from "../sidebar/sidebar";
import { Context } from '../../service/context';

@Component({
  selector: 'app-layout',
  imports: [Navbar, ProductPage, ProductDetail, PromotionPage, CartPage, Sidebar],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {

  context = inject(Context);
  private readonly router = inject(Router);

  isCategorySelected: Signal<boolean> = computed(() => {
    return this.context.selectedCategorySignal() !== null;
  });

  isProductSelected: Signal<boolean> = computed(() => {
    return this.context.selectedProductId() !== null;
  });

  isPromotionSelected: Signal<boolean> = computed(() => {
    return this.context.selectedPromotionGroup() !== null;
  });

  isCartSelected: Signal<boolean> = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.router.url === '/cart'),
    ),
    { initialValue: this.router.url === '/cart' },
  );
}
```

`layout.html` gains a branch checked before the existing product/promotion
branches (cart takes priority over any stale category/product selection
state left over from a prior route):

```html
@if (isCartSelected()) {
  <app-cart-page class="flex-1 min-w-0"></app-cart-page>
} @else if (isProductSelected()) {
  ...
```

## Cart page

New files `src/app/component/cart-page/cart-page.ts` + `.html`. Same
white-card container convention as `product-page.html`
(`border border-gray-200 rounded-xl bg-white p-6`), one row per item
(variant name + properties, quantity stepper using
`cartStore.updateItemQuantity`/`decrementItem`, line price, remove button
calling `cartStore.removeItem`), and a subtotal footer bound to
`cartStore.subtotal()`. An empty cart shows "Coșul tău este gol." (matching
the "niciun produs gasit" empty-state phrasing already used elsewhere).

## Navbar wiring

`Navbar` gains: `inject(CartStore)`, a `cartDropdownOpen = signal(false)`
toggled by clicking the existing (currently inert) desktop cart button, and
a badge on that button showing `cartStore.itemCount()` when it's non-zero.
The mobile bottom-tab "Coș" entry (`navbar.html`, currently a decorative
`<button>`) becomes a `routerLink="/cart"` `<a>`, matching how "Acasa"
already works there — mobile doesn't get the dropdown, it navigates
straight to the cart page (reuses the dedicated page instead of building a
third UI surface, consistent with how mobile already reuses full-screen
overlays elsewhere in this app rather than small desktop-style panels).

## Cart dropdown

New files `src/app/component/cart-dropdown/cart-dropdown.ts` + `.html`,
rendered by `Navbar` (`@if (cartDropdownOpen())`), absolutely positioned
under the desktop cart button. Same item-row content as the cart page,
compact — quantity stepper, remove button, subtotal — plus a "Vezi coșul"
link to `/cart` and a close (click-outside or explicit X) affordance,
matching the click-outside-to-close pattern already used for the mobile
category drawer's backdrop.

## Wiring the two existing "Adaugă în Coș" buttons

`product-card.ts`/`.html` and `product-detail.ts`/`.html`: both inject
`CartStore` and call `cartStore.addItem(variant.id, 1)` on click — the
button's markup/styling is unchanged, only the (previously missing)
`(click)` handler is added.

## Testing

No unit tests in this codebase for Angular components — manual browser
verification, matching this session's established pattern: add an item
from a product card, confirm the navbar badge updates immediately; add the
same variant again from the product detail page, confirm quantity
increments rather than duplicating a row; open the desktop dropdown, adjust
quantity down to 1 then decrement again, confirm the item is removed (not
set to quantity 0); navigate to `/cart`, confirm the same state is
reflected there; reload the page, confirm the cart persists (cookie
survives); confirm the mobile bottom-tab "Coș" navigates to `/cart`.
