import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs';
import { ProductCatalog } from '../../service/product-catalog';
import { CartStore } from '../../service/cart-store';
import { CategoryMenuPanel } from '../category-menu-panel/category-menu-panel';
import { CartDropdown } from '../cart-dropdown/cart-dropdown';
import { Context } from '../../service/context';
import { ProductCategory, ProductCategoryGroup, ProductSubCategoryGroup, PromotionGroup } from '../../models/models';
import { getCategoryPathSlugs, slugify } from '../../utils/category-path.util';

@Component({
  selector: 'app-navbar',
  imports: [CategoryMenuPanel, RouterLink, RouterLinkActive, CartDropdown],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  private readonly productCatalog = inject(ProductCatalog);
  private readonly context = inject(Context);
  private readonly router = inject(Router);
  protected readonly cartStore = inject(CartStore);

  protected readonly categoryGroups = toSignal(this.productCatalog.getCategoryGroups(), {
    initialValue: [],
  });

  protected readonly promotionGroups = toSignal(this.productCatalog.getPromotionGroups(), {
    initialValue: [],
  });

  private readonly hovered = signal(false);

  private readonly isCartRoute = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.router.url === '/cart'),
    ),
    { initialValue: this.router.url === '/cart' },
  );

  // A category, a promotion, or the cart route counts as "something selected" — any of
  // these should let the menu default to closed, not just category selection.
  private readonly menuTargetSelected = computed(
    () =>
      this.context.selectedCategorySignal() !== null ||
      this.context.selectedPromotionGroup() !== null ||
      this.isCartRoute(),
  );
  private closeTimeoutId: ReturnType<typeof setTimeout> | undefined;

  protected readonly categoriesMenuOpen = computed(() => !this.menuTargetSelected() || this.hovered());

  // "Acasa" returns to the last /products/** view the user was on — a specific
  // product if they were viewing one, otherwise the category list — rather than
  // always resetting to the empty catalog view. Matters on mobile, where
  // cart/promotions have no sidebar to re-select a category from.
  protected readonly homeLink = computed(() => {
    const segments = this.context.lastProductsPath();
    return segments ? ['/products', ...segments] : ['/'];
  });

  protected readonly homeQueryParams = computed(() => this.context.lastProductsQueryParams());

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

  protected readonly cartDropdownOpen = signal(false);

  protected onCartIconClick(): void {
    this.cartDropdownOpen.update((open) => !open);
  }

  protected onCartDropdownBackdropClick(): void {
    this.cartDropdownOpen.set(false);
  }
}
