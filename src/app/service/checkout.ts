import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Order } from '../models/models';
import { OrderRequest } from '../models/order-requests';
import { CartStore } from './cart-store';
import { environment } from '../../env/env';

@Injectable({ providedIn: 'root' })
export class Checkout {
  private readonly http = inject(HttpClient);
  private readonly cartStore = inject(CartStore);
  private readonly baseUrl = environment.backendUrl;

  placeOrder(request: OrderRequest) {
    return this.http.post<Order>(`${this.baseUrl}/api/orders`, request, {
      headers: this.cartStore.cartTokenHeaders(),
    });
  }

  getMyOrders() {
    return this.http.get<Order[]>(`${this.baseUrl}/api/orders`);
  }
}
