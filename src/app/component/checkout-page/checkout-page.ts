import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CartStore } from '../../service/cart-store';
import { Checkout } from '../../service/checkout';
import { Order, PaymentMethod } from '../../models/models';
import { OrderRequest } from '../../models/order-requests';

@Component({
  selector: 'app-checkout-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './checkout-page.html',
  styleUrl: './checkout-page.scss',
})
export class CheckoutPage {
  protected readonly cartStore = inject(CartStore);
  private readonly checkout = inject(Checkout);

  protected customerFullName = '';
  protected customerPhone = '';
  protected customerEmail = '';
  protected shippingStreet = '';
  protected shippingCity = '';
  protected shippingCounty = '';
  protected shippingPostalCode = '';
  protected paymentMethod: PaymentMethod = 'CASH_ON_DELIVERY';
  protected promoCode = '';

  protected readonly promoCodeNote = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly placedOrder = signal<Order | null>(null);

  protected onApplyPromoCode(): void {
    this.promoCodeNote.set('Codurile promo vor fi disponibile in curand.');
  }

  protected onSubmit(): void {
    this.errorMessage.set(null);
    this.submitting.set(true);

    const request: OrderRequest = {
      customerFullName: this.customerFullName,
      customerPhone: this.customerPhone,
      customerEmail: this.customerEmail,
      deliveryMethod: 'COURIER',
      shippingStreet: this.shippingStreet,
      shippingCity: this.shippingCity,
      shippingCounty: this.shippingCounty,
      shippingPostalCode: this.shippingPostalCode,
      paymentMethod: this.paymentMethod,
      promoCode: this.promoCode || undefined,
    };

    this.checkout.placeOrder(request).subscribe({
      next: (order) => {
        this.submitting.set(false);
        this.placedOrder.set(order);
        this.cartStore.loadCart();
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(err.error?.message ?? 'A aparut o eroare. Incearca din nou.');
      },
    });
  }
}
