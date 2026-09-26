import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Checkout } from '../../service/checkout';
import { Order, PaymentMethod } from '../../models/models';

const STATUS_LABELS: Record<string, string> = {
  PLACED: 'Plasata',
};

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  CARD: 'Card',
  CASH_ON_DELIVERY: 'Numerar la livrare',
};

@Component({
  selector: 'app-orders-page',
  imports: [RouterLink, DatePipe],
  templateUrl: './orders-page.html',
  styleUrl: './orders-page.scss',
})
export class OrdersPage {
  private readonly checkout = inject(Checkout);

  protected readonly orders = signal<Order[] | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.checkout.getMyOrders().subscribe({
      next: (orders) => this.orders.set(orders),
      error: () => this.errorMessage.set('Nu am putut incarca istoricul comenzilor.'),
    });
  }

  protected statusLabel(status: string): string {
    return STATUS_LABELS[status] ?? status;
  }

  protected paymentLabel(method: PaymentMethod): string {
    return PAYMENT_LABELS[method];
  }

  protected itemsSummary(order: Order): string {
    return order.items.map((item) => `${item.variantName} x${item.quantity}`).join(', ');
  }
}
