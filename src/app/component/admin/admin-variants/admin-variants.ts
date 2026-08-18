import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductCatalog } from '../../../service/product-catalog';
import { Product, ProductVariant, PropertyDefinition, Tag } from '../../../models/models';
import { PropertyValueInput } from '../../../models/admin-requests';
import { flattenCategories } from '../../../utils/admin-category-tree.util';

interface VariantPropertyRow {
  propertyDefinitionId: number | null;
  value: string;
}

@Component({
  selector: 'app-admin-variants',
  imports: [FormsModule],
  templateUrl: './admin-variants.html',
  styleUrl: './admin-variants.scss',
})
export class AdminVariants implements OnInit {
  private readonly productCatalog = inject(ProductCatalog);

  protected readonly items = signal<ProductVariant[]>([]);
  protected readonly products = signal<Product[]>([]);
  protected readonly properties = signal<PropertyDefinition[]>([]);
  protected readonly tags = signal<Tag[]>([]);
  protected readonly editingId = signal<number | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected variantName = '';
  protected variantDescription = '';
  protected productId: number | null = null;
  protected price: number | null = null;
  protected starRating: number | null = null;
  protected propertyRows: VariantPropertyRow[] = [];
  protected selectedTagIds = new Set<number>();

  private categoryPropertiesByCategoryId = new Map<number, PropertyDefinition[]>();

  ngOnInit(): void {
    this.load();
    this.productCatalog.getAllProducts().subscribe((products) => this.products.set(products));
    this.productCatalog.getPropertyDefinitions().subscribe((properties) => this.properties.set(properties));
    this.productCatalog.getTags().subscribe((tags) => this.tags.set(tags));
    this.productCatalog.getCategoryGroups().subscribe((groups) => {
      this.categoryPropertiesByCategoryId = new Map(
        flattenCategories(groups).map((flattened) => [flattened.category.id, flattened.category.categoryProperties]),
      );
    });
  }

  private load(): void {
    this.productCatalog.getAllVariants().subscribe((items) => this.items.set(items));
  }

  /**
   * Rows for every property the product's category defines plus the
   * product's own extra properties, keeping values already entered for
   * matching properties and preserving any ad-hoc rows the admin added
   * that aren't part of that set.
   */
  private buildPropertyRowsForProduct(productId: number | null, existingRows: VariantPropertyRow[]): VariantPropertyRow[] {
    if (productId === null) {
      return existingRows;
    }
    const product = this.products().find((p) => p.id === productId);
    if (!product) {
      return existingRows;
    }

    const applicable = new Map<number, PropertyDefinition>();
    for (const property of this.categoryPropertiesByCategoryId.get(product.category.id) ?? []) {
      applicable.set(property.id, property);
    }
    for (const property of product.extraProperties) {
      applicable.set(property.id, property);
    }

    const existingValueByPropertyId = new Map(existingRows.map((row) => [row.propertyDefinitionId, row.value]));
    const rows: VariantPropertyRow[] = Array.from(applicable.values()).map((property) => ({
      propertyDefinitionId: property.id,
      value: existingValueByPropertyId.get(property.id) ?? '',
    }));

    for (const row of existingRows) {
      if (row.propertyDefinitionId !== null && !applicable.has(row.propertyDefinitionId)) {
        rows.push(row);
      }
    }
    return rows;
  }

  protected addPropertyRow(): void {
    this.propertyRows = [...this.propertyRows, { propertyDefinitionId: null, value: '' }];
  }

  protected removePropertyRow(index: number): void {
    this.propertyRows = this.propertyRows.filter((_, i) => i !== index);
  }

  protected toggleTagId(id: number): void {
    if (this.selectedTagIds.has(id)) {
      this.selectedTagIds.delete(id);
    } else {
      this.selectedTagIds.add(id);
    }
  }

  protected onProductChange(value: number | null): void {
    this.productId = value;
    this.propertyRows = this.buildPropertyRowsForProduct(value, this.propertyRows);
  }

  protected startEdit(item: ProductVariant): void {
    this.editingId.set(item.id);
    this.variantName = item.variantName;
    this.variantDescription = item.variantDescription;
    this.productId = item.product.id;
    this.price = item.price;
    this.starRating = item.starRating;
    const rows = item.variantProperties.map((pv) => ({
      propertyDefinitionId: pv.propertyDefinition.id,
      value: pv.propertyValue,
    }));
    this.propertyRows = this.buildPropertyRowsForProduct(item.product.id, rows);
    this.selectedTagIds = new Set(item.tags.map((t) => t.id));
    this.errorMessage.set(null);
  }

  /** Pre-fills the create form from an existing variant, ready to tweak and save as a new one. */
  protected copyFrom(item: ProductVariant): void {
    this.editingId.set(null);
    this.variantName = item.variantName;
    this.variantDescription = item.variantDescription;
    this.productId = item.product.id;
    this.price = item.price;
    this.starRating = item.starRating;
    const rows = item.variantProperties.map((pv) => ({
      propertyDefinitionId: pv.propertyDefinition.id,
      value: pv.propertyValue,
    }));
    this.propertyRows = this.buildPropertyRowsForProduct(item.product.id, rows);
    this.selectedTagIds = new Set(item.tags.map((t) => t.id));
    this.errorMessage.set(null);
  }

  protected cancel(): void {
    this.editingId.set(null);
    this.variantName = '';
    this.variantDescription = '';
    this.productId = null;
    this.price = null;
    this.starRating = null;
    this.propertyRows = [];
    this.selectedTagIds = new Set();
    this.errorMessage.set(null);
  }

  protected submit(): void {
    if (this.productId === null || this.price === null || this.starRating === null) {
      this.errorMessage.set('Product, price and star rating are required');
      return;
    }
    this.errorMessage.set(null);

    const variantProperties: PropertyValueInput[] = this.propertyRows
      .filter((row) => row.propertyDefinitionId !== null && row.value.trim().length > 0)
      .map((row) => ({ propertyDefinitionId: row.propertyDefinitionId as number, value: row.value }));

    const request = {
      variantName: this.variantName,
      variantDescription: this.variantDescription,
      productId: this.productId,
      price: this.price,
      starRating: this.starRating,
      variantProperties,
      tagIds: Array.from(this.selectedTagIds),
    };
    const id = this.editingId();
    const result$ = id === null
      ? this.productCatalog.createVariant(request)
      : this.productCatalog.updateVariant(id, request);

    result$.subscribe({
      next: () => {
        this.cancel();
        this.load();
      },
      error: (err) => this.errorMessage.set(err.error?.message ?? 'Something went wrong'),
    });
  }

  protected remove(item: ProductVariant): void {
    if (!confirm(`Delete variant "${item.variantName}"?`)) {
      return;
    }
    this.errorMessage.set(null);
    this.productCatalog.deleteVariant(item.id).subscribe({
      next: () => this.load(),
      error: (err) => this.errorMessage.set(err.error?.message ?? 'Something went wrong'),
    });
  }
}
