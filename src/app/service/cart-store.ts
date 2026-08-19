import { Injectable, PLATFORM_ID, inject, signal, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Cart, CartItem } from '../models/models';
import { AddCartItemRequest, UpdateCartItemRequest } from '../models/admin-requests';
import { environment } from '../../env/env';

const CART_TOKEN_STORAGE_KEY = 'cart_token';

@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.backendUrl;

  // Frontend and backend live on different origins, so a cookie can't carry the cart
  // identity (it would be a third-party cookie and browsers drop those). The cart token
  // travels in the response body instead and is echoed back as a request header, held in
  // localStorage — which only exists in the browser, not during SSR.
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly cart = signal<Cart | null>(null);
  readonly items = computed(() => this.cart()?.items ?? []);
  readonly itemCount = computed(() => this.items().reduce((sum, item) => sum + item.quantity, 0));
  readonly subtotal = computed(() =>
    this.items().reduce((sum, item) => sum + item.variant.price * item.quantity, 0),
  );

  constructor() {
    if (this.isBrowser) {
      this.loadCart();
    }
  }

  loadCart(): void {
    this.http
      .get<Cart>(`${this.baseUrl}/api/cart`, { headers: this.headers() })
      .subscribe((cart) => this.setCart(cart));
  }

  addItem(variantId: number, quantity: number): void {
    const request: AddCartItemRequest = { variantId, quantity };
    this.http
      .post<Cart>(`${this.baseUrl}/api/cart/items`, request, { headers: this.headers() })
      .subscribe((cart) => this.setCart(cart));
  }

  updateItemQuantity(itemId: number, quantity: number): void {
    const request: UpdateCartItemRequest = { quantity };
    this.http
      .put<Cart>(`${this.baseUrl}/api/cart/items/${itemId}`, request, { headers: this.headers() })
      .subscribe((cart) => this.setCart(cart));
  }

  removeItem(itemId: number): void {
    this.http
      .delete<Cart>(`${this.baseUrl}/api/cart/items/${itemId}`, { headers: this.headers() })
      .subscribe((cart) => this.setCart(cart));
  }

  /** Decrementing below 1 removes the item — the backend requires quantity >= 1. */
  decrementItem(item: CartItem): void {
    if (item.quantity <= 1) {
      this.removeItem(item.id);
    } else {
      this.updateItemQuantity(item.id, item.quantity - 1);
    }
  }

  private setCart(cart: Cart): void {
    this.cart.set(cart);
    if (this.isBrowser) {
      localStorage.setItem(CART_TOKEN_STORAGE_KEY, cart.ownerToken);
    }
  }

  private headers(): HttpHeaders {
    const token = this.isBrowser ? localStorage.getItem(CART_TOKEN_STORAGE_KEY) : null;
    return token ? new HttpHeaders({ 'X-Cart-Token': token }) : new HttpHeaders();
  }
}
