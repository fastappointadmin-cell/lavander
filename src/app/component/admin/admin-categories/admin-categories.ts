import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductCatalog } from '../../../service/product-catalog';
import { ProductCategoryGroup, PropertyDefinition } from '../../../models/models';
import {
  flattenCategories,
  flattenSubGroups,
  FlattenedCategory,
  FlattenedSubGroup,
} from '../../../utils/admin-category-tree.util';

type ParentType = 'group' | 'subgroup';

@Component({
  selector: 'app-admin-categories',
  imports: [FormsModule],
  templateUrl: './admin-categories.html',
  styleUrl: './admin-categories.scss',
})
export class AdminCategories implements OnInit {
  private readonly productCatalog = inject(ProductCatalog);

  protected readonly groups = signal<ProductCategoryGroup[]>([]);
  protected readonly subGroups = signal<FlattenedSubGroup[]>([]);
  protected readonly items = signal<FlattenedCategory[]>([]);
  protected readonly properties = signal<PropertyDefinition[]>([]);
  protected readonly editingId = signal<number | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected categoryName = '';
  protected parentType: ParentType = 'group';
  protected parentGroupId: number | null = null;
  protected parentSubGroupId: number | null = null;
  protected selectedPropertyIds = new Set<number>();

  ngOnInit(): void {
    this.load();
    this.productCatalog.getPropertyDefinitions().subscribe((properties) => this.properties.set(properties));
  }

  private load(): void {
    this.productCatalog.getCategoryGroups().subscribe((groups) => {
      this.groups.set(groups);
      this.subGroups.set(flattenSubGroups(groups));
      this.items.set(flattenCategories(groups));
    });
  }

  protected togglePropertyId(id: number): void {
    if (this.selectedPropertyIds.has(id)) {
      this.selectedPropertyIds.delete(id);
    } else {
      this.selectedPropertyIds.add(id);
    }
  }

  protected startEdit(entry: FlattenedCategory): void {
    this.editingId.set(entry.category.id);
    this.categoryName = entry.category.categoryName;
    this.parentType = entry.parentSubGroupId !== undefined ? 'subgroup' : 'group';
    this.parentGroupId = entry.parentGroupId ?? null;
    this.parentSubGroupId = entry.parentSubGroupId ?? null;
    this.selectedPropertyIds = new Set(entry.category.categoryProperties.map((p) => p.id));
    this.errorMessage.set(null);
  }

  protected cancel(): void {
    this.editingId.set(null);
    this.categoryName = '';
    this.parentType = 'group';
    this.parentGroupId = null;
    this.parentSubGroupId = null;
    this.selectedPropertyIds = new Set();
    this.errorMessage.set(null);
  }

  protected submit(): void {
    this.errorMessage.set(null);
    const request = {
      categoryName: this.categoryName,
      parentGroupId: this.parentType === 'group' ? (this.parentGroupId ?? undefined) : undefined,
      parentSubGroupId: this.parentType === 'subgroup' ? (this.parentSubGroupId ?? undefined) : undefined,
      categoryPropertyIds: Array.from(this.selectedPropertyIds),
    };
    const id = this.editingId();
    const result$ = id === null
      ? this.productCatalog.createCategory(request)
      : this.productCatalog.updateCategory(id, request);

    result$.subscribe({
      next: () => {
        this.cancel();
        this.load();
      },
      error: (err) => this.errorMessage.set(err.error?.message ?? 'Something went wrong'),
    });
  }

  protected remove(entry: FlattenedCategory): void {
    if (!confirm(`Delete category "${entry.category.categoryName}"?`)) {
      return;
    }
    this.errorMessage.set(null);
    this.productCatalog.deleteCategory(entry.category.id).subscribe({
      next: () => this.load(),
      error: (err) => this.errorMessage.set(err.error?.message ?? 'Something went wrong'),
    });
  }

  protected parentLabel(entry: FlattenedCategory): string {
    if (entry.parentSubGroupId !== undefined) {
      return this.subGroups().find((s) => s.subGroup.id === entry.parentSubGroupId)?.subGroup.groupName ?? '';
    }
    return this.groups().find((g) => g.id === entry.parentGroupId)?.groupName ?? '';
  }
}
