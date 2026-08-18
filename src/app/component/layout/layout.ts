import { Component, computed, inject, Signal } from '@angular/core';
import { Navbar } from "../navbar/navbar";
import { ProductPage } from "../product-page/product-page";
import { ProductDetail } from "../product-detail/product-detail";
import { PromotionPage } from "../promotion-page/promotion-page";
import { Sidebar } from "../sidebar/sidebar";
import { Context } from '../../service/context';

@Component({
  selector: 'app-layout',
  imports: [Navbar, ProductPage, ProductDetail, PromotionPage, Sidebar],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {

  context = inject(Context);

  isCategorySelected: Signal<boolean> = computed(() => {
    return this.context.selectedCategorySignal() !== null;
  });

  isProductSelected: Signal<boolean> = computed(() => {
    return this.context.selectedProductId() !== null;
  });

  isPromotionSelected: Signal<boolean> = computed(() => {
    return this.context.selectedPromotionGroup() !== null;
  });

}
