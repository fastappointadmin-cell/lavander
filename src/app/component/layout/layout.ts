import { Component, computed, inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { Navbar } from "../navbar/navbar";
import { ProductPage } from "../product-page/product-page";
import { ProductDetail } from "../product-detail/product-detail";
import { PromotionPage } from "../promotion-page/promotion-page";
import { CartPage } from "../cart-page/cart-page";
import { CheckoutPage } from "../checkout-page/checkout-page";
import { LoginPage } from "../login-page/login-page";
import { RegisterPage } from "../register-page/register-page";
import { AccountPage } from "../account-page/account-page";
import { OrdersPage } from "../orders-page/orders-page";
import { FavoritesPage } from "../favorites-page/favorites-page";
import { Sidebar } from "../sidebar/sidebar";
import { Context } from '../../service/context';

@Component({
  selector: 'app-layout',
  imports: [Navbar, ProductPage, ProductDetail, PromotionPage, CartPage, CheckoutPage, LoginPage, RegisterPage, AccountPage, OrdersPage, FavoritesPage, Sidebar],
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

  private readonly currentUrl: Signal<string> = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  isCartSelected: Signal<boolean> = computed(() => this.currentUrl() === '/cart');

  isCheckoutSelected: Signal<boolean> = computed(() => this.currentUrl() === '/checkout');

  isLoginSelected: Signal<boolean> = computed(() => this.currentUrl() === '/login');

  isRegisterSelected: Signal<boolean> = computed(() => this.currentUrl() === '/register');

  isAccountSelected: Signal<boolean> = computed(() => this.currentUrl() === '/account');

  isOrdersSelected: Signal<boolean> = computed(() => this.currentUrl() === '/orders');

  isFavoritesSelected: Signal<boolean> = computed(() => this.currentUrl() === '/favorites');

}
