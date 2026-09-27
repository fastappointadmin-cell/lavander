import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductCatalog } from '../../../service/product-catalog';
import { BucketImage, Product, ProductVariant, PropertyDefinition, Tag } from '../../../models/models';
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
  protected readonly addFormOpen = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly uploadingImage = signal(false);

  protected readonly editingVariant = computed(
    () => this.items().find((item) => item.id === this.editingId()) ?? null,
  );

  protected readonly searchQuery = signal('');
  protected readonly expandedProductIds = signal<Set<number>>(new Set());

  protected readonly groupedVariants = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const productsById = new Map(this.products().map((product) => [product.id, product]));
    const groups = new Map<number, { product: Product; variants: ProductVariant[] }>();

    for (const variant of this.items()) {
      const product = productsById.get(variant.product.id);
      if (!product) {
        continue;
      }
      const matchesProduct = product.productName.toLowerCase().includes(query);
      const matchesVariant = variant.variantName.toLowerCase().includes(query);
      if (query && !matchesProduct && !matchesVariant) {
        continue;
      }
      if (!groups.has(product.id)) {
        groups.set(product.id, { product, variants: [] });
      }
      groups.get(product.id)!.variants.push(variant);
    }

    return Array.from(groups.values()).sort((a, b) => a.product.productName.localeCompare(b.product.productName));
  });

  // While searching, every matching group stays expanded regardless of the
  // manually toggled state, so results are never hidden behind a collapsed header.
  protected isGroupExpanded(productId: number): boolean {
    return this.searchQuery().trim().length > 0 || this.expandedProductIds().has(productId);
  }

  protected toggleProductGroup(productId: number): void {
    this.expandedProductIds.update((current) => {
      const next = new Set(current);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }

  private expandProductGroup(productId: number): void {
    this.expandedProductIds.update((current) => new Set(current).add(productId));
  }

  protected variantName = '';
  protected variantDescription = '';
  protected productId: number | null = null;
  protected price: number | null = null;
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

  protected openAddForm(): void {
    this.editingId.set(null);
    this.variantName = '';
    this.variantDescription = '';
    this.productId = null;
    this.price = null;
    this.propertyRows = [];
    this.selectedTagIds = new Set();
    this.errorMessage.set(null);
    this.addFormOpen.set(true);
  }

  protected toggleEdit(item: ProductVariant): void {
    this.addFormOpen.set(false);
    if (this.editingId() === item.id) {
      this.editingId.set(null);
      return;
    }
    this.editingId.set(item.id);
    this.variantName = item.variantName;
    this.variantDescription = item.variantDescription;
    this.productId = item.product.id;
    this.price = item.price;
    const rows = item.variantProperties.map((pv) => ({
      propertyDefinitionId: pv.propertyDefinition.id,
      value: pv.propertyValue,
    }));
    this.propertyRows = this.buildPropertyRowsForProduct(item.product.id, rows);
    this.selectedTagIds = new Set(item.tags.map((t) => t.id));
    this.errorMessage.set(null);
    this.expandProductGroup(item.product.id);
  }

  /** Pre-fills the add form from an existing variant, ready to tweak and save as a new one. */
  protected copyFrom(item: ProductVariant): void {
    this.editingId.set(null);
    this.variantName = item.variantName;
    this.variantDescription = item.variantDescription;
    this.productId = item.product.id;
    this.price = item.price;
    const rows = item.variantProperties.map((pv) => ({
      propertyDefinitionId: pv.propertyDefinition.id,
      value: pv.propertyValue,
    }));
    this.propertyRows = this.buildPropertyRowsForProduct(item.product.id, rows);
    this.selectedTagIds = new Set(item.tags.map((t) => t.id));
    this.errorMessage.set(null);
    this.addFormOpen.set(true);
  }

  protected cancel(): void {
    this.editingId.set(null);
    this.addFormOpen.set(false);
    this.variantName = '';
    this.variantDescription = '';
    this.productId = null;
    this.price = null;
    this.propertyRows = [];
    this.selectedTagIds = new Set();
    this.errorMessage.set(null);
  }

  protected submit(): void {
    if (this.productId === null || this.price === null) {
      this.errorMessage.set('Product and price are required');
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
      variantProperties,
      tagIds: Array.from(this.selectedTagIds),
    };
    const id = this.editingId();
    const result$ = id === null
      ? this.productCatalog.createVariant(request)
      : this.productCatalog.updateVariant(id, request);

    result$.subscribe({
      next: () => {
        this.expandProductGroup(this.productId as number);
        this.cancel();
        this.load();
      },
      error: (err) => this.errorMessage.set(err.error?.message ?? 'Something went wrong'),
    });
  }

  protected readonly isDragOver = signal(false);

  protected onImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.uploadFiles(input.files);
    }
    input.value = '';
  }

  protected onImageDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  protected onImageDragLeave(): void {
    this.isDragOver.set(false);
  }

  protected onImageDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
    if (event.dataTransfer?.files) {
      this.uploadFiles(event.dataTransfer.files);
    }
  }

  private uploadFiles(fileList: FileList): void {
    const variantId = this.editingId();
    const files = Array.from(fileList).filter((file) => file.type.startsWith('image/'));
    if (variantId === null || files.length === 0) {
      return;
    }
    this.errorMessage.set(null);
    this.uploadingImage.set(true);
    this.uploadNext(variantId, files, 0);
  }

  // Uploaded one at a time (not in parallel) so each image's displayOrder,
  // computed server-side from the current image count, doesn't race.
  private uploadNext(variantId: number, files: File[], index: number): void {
    if (index >= files.length) {
      this.uploadingImage.set(false);
      this.load();
      return;
    }
    this.productCatalog.uploadVariantImage(variantId, files[index]).subscribe({
      next: () => this.uploadNext(variantId, files, index + 1),
      error: (err) => {
        this.uploadingImage.set(false);
        this.errorMessage.set(err.error?.message ?? 'Image upload failed');
        this.load();
      },
    });
  }

  protected onDeleteImage(variantId: number, imageId: number): void {
    this.productCatalog.deleteVariantImage(variantId, imageId).subscribe({
      next: () => this.load(),
      error: (err) => this.errorMessage.set(err.error?.message ?? 'Something went wrong'),
    });
  }

  protected readonly bucketPickerOpen = signal(false);
  protected readonly bucketImages = signal<BucketImage[]>([]);
  protected readonly loadingBucketImages = signal(false);
  protected readonly selectedBucketKeys = signal<Set<string>>(new Set());
  protected readonly attachingBucketImages = signal(false);

  protected openBucketPicker(): void {
    this.bucketPickerOpen.set(true);
    this.selectedBucketKeys.set(new Set());
    this.loadingBucketImages.set(true);
    this.productCatalog.browseBucketImages().subscribe({
      next: (images) => {
        this.bucketImages.set(images);
        this.loadingBucketImages.set(false);
      },
      error: (err) => {
        this.loadingBucketImages.set(false);
        this.errorMessage.set(err.error?.message ?? 'Could not load bucket images');
      },
    });
  }

  protected closeBucketPicker(): void {
    this.bucketPickerOpen.set(false);
  }

  protected toggleBucketSelection(image: BucketImage): void {
    this.selectedBucketKeys.update((current) => {
      const next = new Set(current);
      if (next.has(image.thumbnailKey)) {
        next.delete(image.thumbnailKey);
      } else {
        next.add(image.thumbnailKey);
      }
      return next;
    });
  }

  protected confirmBucketSelection(): void {
    const variantId = this.editingId();
    const keys = Array.from(this.selectedBucketKeys());
    if (variantId === null || keys.length === 0) {
      return;
    }
    this.attachingBucketImages.set(true);
    this.attachBucketImagesNext(variantId, keys, 0);
  }

  // Attached one at a time (not in parallel), same reasoning as sequential
  // file uploads: each image's displayOrder is computed server-side from the
  // current image count, which would race under concurrent requests.
  private attachBucketImagesNext(variantId: number, keys: string[], index: number): void {
    if (index >= keys.length) {
      this.attachingBucketImages.set(false);
      this.closeBucketPicker();
      this.load();
      return;
    }
    this.productCatalog.attachVariantImageFromBucket(variantId, keys[index]).subscribe({
      next: () => this.attachBucketImagesNext(variantId, keys, index + 1),
      error: (err) => {
        this.attachingBucketImages.set(false);
        this.errorMessage.set(err.error?.message ?? 'Something went wrong');
        this.closeBucketPicker();
        this.load();
      },
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
