import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminProperties } from '../admin-properties/admin-properties';
import { AdminGroups } from '../admin-groups/admin-groups';
import { AdminSubgroups } from '../admin-subgroups/admin-subgroups';
import { AdminCategories } from '../admin-categories/admin-categories';
import { AdminProducts } from '../admin-products/admin-products';
import { AdminVariants } from '../admin-variants/admin-variants';
import { AdminTags } from '../admin-tags/admin-tags';
import { AdminPromotionGroups } from '../admin-promotion-groups/admin-promotion-groups';

type AdminSection = 'properties' | 'groups' | 'subgroups' | 'categories' | 'products' | 'variants' | 'tags' | 'promotionGroups';

@Component({
  selector: 'app-admin-page',
  imports: [RouterLink, AdminProperties, AdminGroups, AdminSubgroups, AdminCategories, AdminProducts, AdminVariants, AdminTags, AdminPromotionGroups],
  templateUrl: './admin-page.html',
  styleUrl: './admin-page.scss',
})
export class AdminPage {
  protected readonly activeSection = signal<AdminSection>('properties');

  protected readonly sections: { id: AdminSection; label: string }[] = [
    { id: 'properties', label: 'Properties' },
    { id: 'groups', label: 'Groups' },
    { id: 'subgroups', label: 'Subgroups' },
    { id: 'categories', label: 'Categories' },
    { id: 'products', label: 'Products' },
    { id: 'variants', label: 'Variants' },
    { id: 'tags', label: 'Tags' },
    { id: 'promotionGroups', label: 'Promotion Groups' },
  ];

  protected readonly activeSectionLabel = computed(
    () => this.sections.find((section) => section.id === this.activeSection())?.label ?? '',
  );

  protected readonly mobileSectionsOpen = signal(false);

  protected selectSection(section: AdminSection): void {
    this.activeSection.set(section);
    this.mobileSectionsOpen.set(false);
  }

  protected onMobileSectionsToggle(): void {
    this.mobileSectionsOpen.update((open) => !open);
  }
}
