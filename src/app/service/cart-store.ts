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
