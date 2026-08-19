import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartStore } from '../../service/cart-store';
import { CartItem } from '../../models/models';

@Component({
  selector: 'app-cart-dropdown',
  imports: [RouterLink],
  templateUrl: './cart-dropdown.html',
  styleUrl: './cart-dropdown.scss',
})
export class CartDropdown {
  protected readonly cartStore = inject(CartStore);

  protected onIncrement(item: CartItem): void {
    this.cartStore.updateItemQuantity(item.id, item.quantity + 1);
  }

  protected onDecrement(item: CartItem): void {
    this.cartStore.decrementItem(item);
  }

  protected onRemove(item: CartItem): void {
    this.cartStore.removeItem(item.id);
  }

  protected variantPropertiesLabel(item: CartItem): string {
    return item.variant.variantProperties.map((p) => p.propertyValue).join(', ');
  }
}
