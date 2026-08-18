import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductCatalog } from '../../../service/product-catalog';
import { Tag } from '../../../models/models';

@Component({
  selector: 'app-admin-tags',
  imports: [FormsModule],
  templateUrl: './admin-tags.html',
  styleUrl: './admin-tags.scss',
})
export class AdminTags implements OnInit {
  private readonly productCatalog = inject(ProductCatalog);

  protected readonly items = signal<Tag[]>([]);
  protected readonly editingId = signal<number | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected tagName = '';

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.productCatalog.getTags().subscribe((items) => this.items.set(items));
  }

  protected startEdit(item: Tag): void {
    this.editingId.set(item.id);
    this.tagName = item.tagName;
    this.errorMessage.set(null);
  }

  protected cancel(): void {
    this.editingId.set(null);
    this.tagName = '';
    this.errorMessage.set(null);
  }

  protected submit(): void {
    this.errorMessage.set(null);
    const request = { tagName: this.tagName };
    const id = this.editingId();
    const result$ = id === null
      ? this.productCatalog.createTag(request)
      : this.productCatalog.updateTag(id, request);

    result$.subscribe({
      next: () => {
        this.cancel();
        this.load();
      },
      error: (err) => this.errorMessage.set(err.error?.message ?? 'Something went wrong'),
    });
  }

  protected remove(item: Tag): void {
    if (!confirm(`Delete tag "${item.tagName}"?`)) {
      return;
    }
    this.errorMessage.set(null);
    this.productCatalog.deleteTag(item.id).subscribe({
      next: () => this.load(),
      error: (err) => this.errorMessage.set(err.error?.message ?? 'Something went wrong'),
    });
  }
}
