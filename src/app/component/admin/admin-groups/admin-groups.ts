import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductCatalog } from '../../../service/product-catalog';
import { ProductCategoryGroup } from '../../../models/models';

@Component({
  selector: 'app-admin-groups',
  imports: [FormsModule],
  templateUrl: './admin-groups.html',
  styleUrl: './admin-groups.scss',
})
export class AdminGroups implements OnInit {
  private readonly productCatalog = inject(ProductCatalog);

  protected readonly items = signal<ProductCategoryGroup[]>([]);
  protected readonly editingId = signal<number | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected groupName = '';

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.productCatalog.getCategoryGroups().subscribe((items) => this.items.set(items));
  }

  protected startEdit(item: ProductCategoryGroup): void {
    this.editingId.set(item.id);
    this.groupName = item.groupName;
    this.errorMessage.set(null);
  }

  protected cancel(): void {
    this.editingId.set(null);
    this.groupName = '';
    this.errorMessage.set(null);
  }

  protected submit(): void {
    this.errorMessage.set(null);
    const request = { groupName: this.groupName };
    const id = this.editingId();
    const result$ = id === null
      ? this.productCatalog.createGroup(request)
      : this.productCatalog.updateGroup(id, request);

    result$.subscribe({
      next: () => {
        this.cancel();
        this.load();
      },
      error: (err) => this.errorMessage.set(err.error?.message ?? 'Something went wrong'),
    });
  }

  protected remove(item: ProductCategoryGroup): void {
    if (!confirm(`Delete group "${item.groupName}"?`)) {
      return;
    }
    this.errorMessage.set(null);
    this.productCatalog.deleteGroup(item.id).subscribe({
      next: () => this.load(),
      error: (err) => this.errorMessage.set(err.error?.message ?? 'Something went wrong'),
    });
  }
}
