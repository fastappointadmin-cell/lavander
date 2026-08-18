import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ProductCatalog } from '../../service/product-catalog';
import { CategoryMenuPanel } from '../category-menu-panel/category-menu-panel';
import { Context } from '../../service/context';

@Component({
  selector: 'app-navbar',
  imports: [CategoryMenuPanel, RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  private readonly productCatalog = inject(ProductCatalog);
  private readonly context = inject(Context);

  protected readonly categoryGroups = toSignal(this.productCatalog.getCategoryGroups(), {
    initialValue: [],
  });

  private readonly hovered = signal(false);
  private readonly categorySelected = computed(() => this.context.selectedCategorySignal() !== null);
  private closeTimeoutId: ReturnType<typeof setTimeout> | undefined;

  protected readonly categoriesMenuOpen = computed(() => !this.categorySelected() || this.hovered());

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
}
