import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ProductCatalog } from '../../service/product-catalog';
import { CategoryMenuPanel } from '../category-menu-panel/category-menu-panel';
import { Context } from '../../service/context';
import { ProductCategory, ProductCategoryGroup, ProductSubCategoryGroup, PromotionGroup } from '../../models/models';
import { getCategoryPathSlugs, slugify } from '../../utils/category-path.util';

@Component({
  selector: 'app-navbar',
  imports: [CategoryMenuPanel, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  private readonly productCatalog = inject(ProductCatalog);
  private readonly context = inject(Context);
  private readonly router = inject(Router);

  protected readonly categoryGroups = toSignal(this.productCatalog.getCategoryGroups(), {
    initialValue: [],
  });

  protected readonly promotionGroups = toSignal(this.productCatalog.getPromotionGroups(), {
    initialValue: [],
  });

  private readonly hovered = signal(false);
  // A category or a promotion counts as "something selected" — either one should let
  // the menu default to closed, not just category selection.
  private readonly menuTargetSelected = computed(
    () => this.context.selectedCategorySignal() !== null || this.context.selectedPromotionGroup() !== null,
  );
  private closeTimeoutId: ReturnType<typeof setTimeout> | undefined;

  protected readonly categoriesMenuOpen = computed(() => !this.menuTargetSelected() || this.hovered());

  protected onMenuEnter(): void {
    clearTimeout(this.closeTimeoutId);
    this.hovered.set(true);
  }

  // Debounced: the button and the panel aren't visually flush against each other,
  // so briefly crossing the gap between them shouldn't close the menu.
  protected onMenuLeave(): void {
    this.closeTimeoutId = setTimeout(() => this.hovered.set(false), 200);
  }

  protected onMenuButtonClick(): void {
    clearTimeout(this.closeTimeoutId);
    this.hovered.set(true);
  }

  protected onCategorySelected(): void {
    clearTimeout(this.closeTimeoutId);
    this.hovered.set(false);
  }

  // Mobile: a full-screen overlay menu, separate from the desktop hover flyout above.
  protected readonly mobileMenuOpen = signal(false);
  protected readonly expandedGroupId = signal<number | null>(null);

  protected onMobileMenuToggle(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  protected onMobileGroupToggle(groupId: number): void {
    this.expandedGroupId.update((current) => (current === groupId ? null : groupId));
  }

  protected onMobileCategoryClick(
    category: ProductCategory,
    group: ProductCategoryGroup,
    subGroup?: ProductSubCategoryGroup,
  ): void {
    this.router.navigate(['/products', ...getCategoryPathSlugs(group, category, subGroup)]);
    this.mobileMenuOpen.set(false);
  }

  protected onMobilePromotionClick(promotionGroup: PromotionGroup): void {
    this.router.navigate(['/promotions', slugify(promotionGroup.groupName)]);
    this.mobileMenuOpen.set(false);
  }
}
