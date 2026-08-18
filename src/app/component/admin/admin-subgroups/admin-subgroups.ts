import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductCatalog } from '../../../service/product-catalog';
import { ProductCategoryGroup } from '../../../models/models';
import { flattenSubGroups, FlattenedSubGroup } from '../../../utils/admin-category-tree.util';

@Component({
  selector: 'app-admin-subgroups',
  imports: [FormsModule],
  templateUrl: './admin-subgroups.html',
  styleUrl: './admin-subgroups.scss',
})
export class AdminSubgroups implements OnInit {
  private readonly productCatalog = inject(ProductCatalog);

  protected readonly groups = signal<ProductCategoryGroup[]>([]);
  protected readonly items = signal<FlattenedSubGroup[]>([]);
  protected readonly editingId = signal<number | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected groupName = '';
  protected parentGroupId: number | null = null;

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.productCatalog.getCategoryGroups().subscribe((groups) => {
      this.groups.set(groups);
      this.items.set(flattenSubGroups(groups));
    });
  }

  protected groupNameFor(id: number): string {
    return this.groups().find((g) => g.id === id)?.groupName ?? '';
  }

  protected startEdit(entry: FlattenedSubGroup): void {
    this.editingId.set(entry.subGroup.id);
    this.groupName = entry.subGroup.groupName;
    this.parentGroupId = entry.parentGroupId;
    this.errorMessage.set(null);
  }

  protected cancel(): void {
    this.editingId.set(null);
    this.groupName = '';
    this.parentGroupId = null;
    this.errorMessage.set(null);
  }

  protected submit(): void {
    if (this.parentGroupId === null) {
      this.errorMessage.set('Select a parent group');
      return;
    }
    this.errorMessage.set(null);
    const request = { groupName: this.groupName, parentGroupId: this.parentGroupId };
    const id = this.editingId();
    const result$ = id === null
      ? this.productCatalog.createSubGroup(request)
      : this.productCatalog.updateSubGroup(id, request);

    result$.subscribe({
      next: () => {
        this.cancel();
        this.load();
      },
      error: (err) => this.errorMessage.set(err.error?.message ?? 'Something went wrong'),
    });
  }

  protected remove(entry: FlattenedSubGroup): void {
    if (!confirm(`Delete subgroup "${entry.subGroup.groupName}"?`)) {
      return;
    }
    this.errorMessage.set(null);
    this.productCatalog.deleteSubGroup(entry.subGroup.id).subscribe({
      next: () => this.load(),
      error: (err) => this.errorMessage.set(err.error?.message ?? 'Something went wrong'),
    });
  }
}
