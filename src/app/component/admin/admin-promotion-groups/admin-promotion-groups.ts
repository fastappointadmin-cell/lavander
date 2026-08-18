import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductCatalog } from '../../../service/product-catalog';
import { PromotionGroup, Tag } from '../../../models/models';

@Component({
  selector: 'app-admin-promotion-groups',
  imports: [FormsModule],
  templateUrl: './admin-promotion-groups.html',
  styleUrl: './admin-promotion-groups.scss',
})
export class AdminPromotionGroups implements OnInit {
  private readonly productCatalog = inject(ProductCatalog);

  protected readonly items = signal<PromotionGroup[]>([]);
  protected readonly tags = signal<Tag[]>([]);
  protected readonly editingId = signal<number | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected groupName = '';
  protected selectedTagIds = new Set<number>();

  ngOnInit(): void {
    this.load();
    this.productCatalog.getTags().subscribe((tags) => this.tags.set(tags));
  }

  private load(): void {
    this.productCatalog.getPromotionGroups().subscribe((items) => this.items.set(items));
  }

  protected toggleTagId(id: number): void {
    if (this.selectedTagIds.has(id)) {
      this.selectedTagIds.delete(id);
    } else {
      this.selectedTagIds.add(id);
    }
  }

  protected startEdit(item: PromotionGroup): void {
    this.editingId.set(item.id);
    this.groupName = item.groupName;
    this.selectedTagIds = new Set(item.tags.map((t) => t.id));
    this.errorMessage.set(null);
  }

  protected cancel(): void {
    this.editingId.set(null);
    this.groupName = '';
    this.selectedTagIds = new Set();
    this.errorMessage.set(null);
  }

  protected submit(): void {
    this.errorMessage.set(null);
    const request = {
      groupName: this.groupName,
      tagIds: Array.from(this.selectedTagIds),
    };
    const id = this.editingId();
    const result$ = id === null
      ? this.productCatalog.createPromotionGroup(request)
      : this.productCatalog.updatePromotionGroup(id, request);

    result$.subscribe({
      next: () => {
        this.cancel();
        this.load();
      },
      error: (err) => this.errorMessage.set(err.error?.message ?? 'Something went wrong'),
    });
  }

  protected remove(item: PromotionGroup): void {
    if (!confirm(`Delete promotion group "${item.groupName}"?`)) {
      return;
    }
    this.errorMessage.set(null);
    this.productCatalog.deletePromotionGroup(item.id).subscribe({
      next: () => this.load(),
      error: (err) => this.errorMessage.set(err.error?.message ?? 'Something went wrong'),
    });
  }
}
