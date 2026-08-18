import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductCatalog } from '../../../service/product-catalog';
import { Product, ProductVariant, PropertyDefinition } from '../../../models/models';
import { PropertyValueInput } from '../../../models/admin-requests';

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
  protected readonly editingId = signal<number | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected variantName = '';
  protected variantDescription = '';
  protected productId: number | null = null;
  protected price: number | null = null;
  protected starRating: number | null = null;
  protected propertyRows: VariantPropertyRow[] = [];

  ngOnInit(): void {
    this.load();
    this.productCatalog.getAllProducts().subscribe((products) => this.products.set(products));
    this.productCatalog.getPropertyDefinitions().subscribe((properties) => this.properties.set(properties));
  }

  private load(): void {
    this.productCatalog.getAllVariants().subscribe((items) => this.items.set(items));
  }

  protected addPropertyRow(): void {
    this.propertyRows = [...this.propertyRows, { propertyDefinitionId: null, value: '' }];
  }

  protected removePropertyRow(index: number): void {
    this.propertyRows = this.propertyRows.filter((_, i) => i !== index);
  }

  protected startEdit(item: ProductVariant): void {
    this.editingId.set(item.id);
    this.variantName = item.variantName;
    this.variantDescription = item.variantDescription;
    this.productId = item.product.id;
    this.price = item.price;
    this.starRating = item.starRating;
    this.propertyRows = item.variantProperties.map((pv) => ({
      propertyDefinitionId: pv.propertyDefinition.id,
      value: pv.propertyValue,
    }));
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
