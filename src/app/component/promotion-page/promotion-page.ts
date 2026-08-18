import { Component, computed, inject } from '@angular/core';
import { Context } from '../../service/context';
import { ProductCard } from '../product-card/product-card';
import { ProductToolbar } from '../product-toolbar/product-toolbar';

@Component({
  selector: 'app-promotion-page',
  imports: [ProductCard, ProductToolbar],
  templateUrl: './promotion-page.html',
  styleUrl: './promotion-page.scss',
})
export class PromotionPage {
  protected readonly context = inject(Context);
  protected readonly variants = this.context.selectedPromotionVariants;
  protected readonly groupName = computed(() => this.context.selectedPromotionGroup()?.groupName ?? '');
}
