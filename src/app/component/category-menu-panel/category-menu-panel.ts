import { Component, computed, inject, input, signal } from '@angular/core';
import { ProductCategory, ProductCategoryGroup } from '../../models/models';
import { Context } from '../../service/context';

@Component({
  selector: 'app-category-menu-panel',
  imports: [],
  templateUrl: './category-menu-panel.html',
  styleUrl: './category-menu-panel.scss',
})
export class CategoryMenuPanel {

  groups = input<ProductCategoryGroup[]>([]);
  context = inject(Context);

  private readonly hoveredGroupId = signal<number | null>(null);

  protected readonly activeGroup = computed(() => {
    const groups = this.groups();
    const hoveredId = this.hoveredGroupId();
    return groups.find((group) => group.id === hoveredId) ?? groups[0] ?? null;
  });

  protected onGroupHover(groupId: number): void {
    this.hoveredGroupId.set(groupId);
  }

  protected onCategoryClick(category: ProductCategory): void {
    this.context.setSelectedCategory(category);
  }

}
