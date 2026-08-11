import { Component, computed, inject, Signal } from '@angular/core';
import { Navbar } from "../navbar/navbar";
import { ProductPage } from "../product-page/product-page";
import { Sidebar } from "../sidebar/sidebar";
import { Context } from '../../service/context';

@Component({
  selector: 'app-layout',
  imports: [Navbar, ProductPage, Sidebar],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {

  context = inject(Context);

  isCategorySelected: Signal<boolean> = computed(() => {
    return this.context.selectedCategorySignal() !== null;
  });

}
