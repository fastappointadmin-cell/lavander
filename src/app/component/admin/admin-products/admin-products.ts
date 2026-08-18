import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductCatalog } from '../../../service/product-catalog';
import { Product, ProductCategoryGroup, PropertyDefinition } from '../../../models/models';
import { flattenCategories, FlattenedCategory } from '../../../utils/admin-category-tree.util';

@Component({
  selector: 'app-admin-products',
  imports: [FormsModule],
  templateUrl: './admin-products.html',
  styleUrl: './admin-products.scss',
})
export class AdminProducts implements OnInit {
  private readonly productCatalog = inject(ProductCatalog);

  protected readonly items = signal<Product[]>([]);
  protected readonly categories = signal<FlattenedCategory[]>([]);
  protected readonly properties = signal<PropertyDefinition[]>([]);
  protected readonly editingId = signal<number | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected productName = '';
  protected productDescription = '';
  protected categoryId: number | null = null;
  protected selectedPropertyIds = new Set<number>();

  ngOnInit(): void {
    this.load();
    this.productCatalog.getCategoryGroups().subscribe((groups: ProductCategoryGroup[]) => {
      this.categories.set(flattenCategories(groups));
    });
    this.productCatalog.getPropertyDefinitions().subscribe((properties) => this.properties.set(properties));
  }

  private load(): void {
    this.productCatalog.getAllProducts().subscribe((items) => this.items.set(items));
  }

  protected togglePropertyId(id: number): void {
    if (this.selectedPropertyIds.has(id)) {
      this.selectedPropertyIds.delete(id);
    } else {
      this.selectedPropertyIds.add(id);
    }
  }

  protected startEdit(item: Product): void {
    this.editingId.set(item.id);
    this.productName = item.productName;
    this.productDescription = item.productDescription;
    this.categoryId = item.category.id;
    this.selectedPropertyIds = new Set(item.extraProperties.map((p) => p.id));
    this.errorMessage.set(null);
  }

  protected cancel(): void {
    this.editingId.set(null);
    this.productName = '';
    this.productDescription = '';
    this.categoryId = null;
    this.selectedPropertyIds = new Set();
    this.errorMessage.set(null);
  }

  protected submit(): void {
    if (this.categoryId === null) {
      this.errorMessage.set('Select a category');
      return;
    }
    this.errorMessage.set(null);
    const request = {
      productName: this.productName,
      productDescription: this.productDescription,
      categoryId: this.categoryId,
      extraPropertyIds: Array.from(this.selectedPropertyIds),
    };
    const id = this.editingId();
    const result$ = id === null
      ? this.productCatalog.createProduct(request)
      : this.productCatalog.updateProduct(id, request);

    result$.subscribe({
      next: () => {
        this.cancel();
        this.load();
      },
      error: (err) => this.errorMessage.set(err.error?.message ?? 'Something went wrong'),
    });
  }

  protected remove(item: Product): void {
    if (!confirm(`Delete product "${item.productName}"?`)) {
      return;
    }
    this.errorMessage.set(null);
    this.productCatalog.deleteProduct(item.id).subscribe({
      next: () => this.load(),
      error: (err) => this.errorMessage.set(err.error?.message ?? 'Something went wrong'),
    });
  }
}
