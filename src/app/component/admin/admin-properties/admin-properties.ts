import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductCatalog } from '../../../service/product-catalog';
import { PropertyDefinition } from '../../../models/models';

@Component({
  selector: 'app-admin-properties',
  imports: [FormsModule],
  templateUrl: './admin-properties.html',
  styleUrl: './admin-properties.scss',
})
export class AdminProperties implements OnInit {
  private readonly productCatalog = inject(ProductCatalog);

  protected readonly items = signal<PropertyDefinition[]>([]);
  protected readonly editingId = signal<number | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected propertyName = '';

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.productCatalog.getPropertyDefinitions().subscribe((items) => this.items.set(items));
  }

  protected startEdit(item: PropertyDefinition): void {
    this.editingId.set(item.id);
    this.propertyName = item.propertyName;
    this.errorMessage.set(null);
  }

  protected cancel(): void {
    this.editingId.set(null);
    this.propertyName = '';
    this.errorMessage.set(null);
  }

  protected submit(): void {
    this.errorMessage.set(null);
    const request = { propertyName: this.propertyName };
    const id = this.editingId();
    const result$ = id === null
      ? this.productCatalog.createPropertyDefinition(request)
      : this.productCatalog.updatePropertyDefinition(id, request);

    result$.subscribe({
      next: () => {
        this.cancel();
        this.load();
      },
      error: (err) => this.errorMessage.set(err.error?.message ?? 'Something went wrong'),
    });
  }

  protected remove(item: PropertyDefinition): void {
    if (!confirm(`Delete property "${item.propertyName}"?`)) {
      return;
    }
    this.errorMessage.set(null);
    this.productCatalog.deletePropertyDefinition(item.id).subscribe({
      next: () => this.load(),
      error: (err) => this.errorMessage.set(err.error?.message ?? 'Something went wrong'),
    });
  }
}
