import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ProductCatalog } from '../../service/product-catalog';
import { CartStore } from '../../service/cart-store';
import { CategoryMenuPanel } from '../category-menu-panel/category-menu-panel';
import { CartDropdown } from '../cart-dropdown/cart-dropdown';
import { SearchResults } from '../search-results/search-results';
import { Context } from '../../service/context';
import { Auth } from '../../service/auth';
import { ProductCategory, ProductCategoryGroup, ProductSubCategoryGroup, PromotionGroup } from '../../models/models';
import { findCategoryPathByCategoryId, getCategoryPathSlugs, slugify } from '../../utils/category-path.util';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-navbar',
  imports: [CategoryMenuPanel, RouterLink, RouterLinkActive, CartDropdown, SearchResults, FormsModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  private readonly productCatalog = inject(ProductCatalog);
  private readonly context = inject(Context);
  private readonly router = inject(Router);
  protected readonly cartStore = inject(CartStore);
  protected readonly auth = inject(Auth);

  protected readonly categoryGroups = toSignal(this.productCatalog.getCategoryGroups(), {
    initialValue: [],
  });

  protected readonly promotionGroups = toSignal(this.productCatalog.getPromotionGroups(), {
    initialValue: [],
  });

  protected readonly featuredPromotions = computed(() => this.promotionGroups().filter((g) => g.featured));

  // Routed through toSignal (like every other async value in this component) rather
  // than a raw setInterval, since this app runs zoneless — a plain timer callback's
  // signal write never reaches the renderer, `toSignal`'s subscription does.
  private readonly featuredTick = toSignal(interval(5000), { initialValue: 0 });

  protected readonly currentFeaturedPromotion = computed(() => {
    const list = this.featuredPromotions();
    return list.length > 0 ? list[this.featuredTick() % list.length] : null;
  });

  protected readonly currentFeaturedSlug = computed(() => {
    const promotion = this.currentFeaturedPromotion();
    return promotion ? slugify(promotion.groupName) : null;
  });

  // The catalog is small enough that fetching it whole and filtering client-side (no
  // separate search endpoint) is simpler and plenty fast — same tradeoff already made
  // for the "recommended products" home page.
  private readonly allVariants = toSignal(this.productCatalog.getAllVariants(), { initialValue: [] });

  protected readonly searchQuery = signal('');

  protected readonly searchResults = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) {
      return [];
    }
    const groups = this.categoryGroups();
    return this.allVariants()
      .filter((variant) => {
        if (
          variant.variantName.toLowerCase().includes(query) ||
          variant.product.productName.toLowerCase().includes(query) ||
          variant.variantDescription.toLowerCase().includes(query) ||
          variant.variantProperties.some((property) => property.propertyValue.toLowerCase().includes(query))
        ) {
          return true;
        }
        const categoryName = findCategoryPathByCategoryId(groups, variant.product.categoryId)?.category
          .categoryName;
        return categoryName?.toLowerCase().includes(query) ?? false;
      })
      .slice(0, 8);
  });

  protected readonly searchDropdownOpen = computed(() => this.searchQuery().trim().length > 0);

  protected onSearchInput(value: string): void {
    this.searchQuery.set(value);
  }

  protected onSearchResultSelected(): void {
    this.searchQuery.set('');
  }

  protected onSearchDismiss(): void {
    this.searchQuery.set('');
  }

  private readonly hovered = signal(false);
  private closeTimeoutId: ReturnType<typeof setTimeout> | undefined;

  // Purely hover/click-driven — never defaults open on its own, regardless of route.
  protected readonly categoriesMenuOpen = computed(() => this.hovered());

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
