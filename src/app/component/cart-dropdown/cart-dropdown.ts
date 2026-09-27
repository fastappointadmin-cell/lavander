import { Component, inject, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { CartStore } from '../../service/cart-store';
import { ProductCatalog } from '../../service/product-catalog';
import { CartItem } from '../../models/models';
import { findCategoryPathByCategoryId, getCategoryPathSlugs } from '../../utils/category-path.util';

@Component({
  selector: 'app-cart-dropdown',
  imports: [RouterLink],
  templateUrl: './cart-dropdown.html',
  styleUrl: './cart-dropdown.scss',
})
export class CartDropdown {
  protected readonly cartStore = inject(CartStore);
  private readonly productCatalog = inject(ProductCatalog);
  private readonly router = inject(Router);

  private readonly categoryGroups = toSignal(this.productCatalog.getCategoryGroups(), { initialValue: [] });

  readonly itemSelected = output<void>();

  protected onItemClick(item: CartItem): void {
    const path = findCategoryPathByCategoryId(this.categoryGroups(), item.variant.product.categoryId);
    if (!path) {
      return;
    }
    const slugs = getCategoryPathSlugs(path.group, path.category, path.subGroup);
    this.router.navigate(['/products', ...slugs, 'product', item.variant.product.id, 'variant', item.variant.id]);
    this.itemSelected.emit();
  }

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
