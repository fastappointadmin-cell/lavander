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
