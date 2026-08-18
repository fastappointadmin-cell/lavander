import { Component, computed, inject, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ProductCategory, ProductCategoryGroup, ProductSubCategoryGroup, PromotionGroup } from '../../models/models';
import { getCategoryPathSlugs, slugify } from '../../utils/category-path.util';

@Component({
  selector: 'app-category-menu-panel',
  imports: [],
  templateUrl: './category-menu-panel.html',
  styleUrl: './category-menu-panel.scss',
})
export class CategoryMenuPanel {

  groups = input<ProductCategoryGroup[]>([]);
  promotionGroups = input<PromotionGroup[]>([]);
  categorySelected = output<void>();
  private readonly router = inject(Router);

  private readonly hoveredGroupId = signal<number | null>(null);

  protected readonly activeGroup = computed(() => {
    const groups = this.groups();
    const hoveredId = this.hoveredGroupId();
    return groups.find((group) => group.id === hoveredId) ?? groups[0] ?? null;
  });

  protected onGroupHover(groupId: number): void {
    this.hoveredGroupId.set(groupId);
  }

  protected onCategoryClick(
    category: ProductCategory,
    group: ProductCategoryGroup,
    subGroup?: ProductSubCategoryGroup,
  ): void {
    this.router.navigate(['/products', ...getCategoryPathSlugs(group, category, subGroup)]);
    this.categorySelected.emit();
  }

  protected onPromotionClick(promotionGroup: PromotionGroup): void {
    this.router.navigate(['/promotions', slugify(promotionGroup.groupName)]);
    this.categorySelected.emit();
  }

}
