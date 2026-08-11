import { Component, computed, inject } from '@angular/core';
import { Context } from '../../service/context';
import { FilterSection, FilterOption } from '../filter-section/filter-section';

interface FilterSectionData {
  title: string;
  options: FilterOption[];
}

@Component({
  selector: 'app-sidebar',
  imports: [FilterSection],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  private readonly context = inject(Context);

  protected readonly filterSections = computed<FilterSectionData[]>(() => {
    const category = this.context.selectedCategorySignal();
    if (!category) {
      return [];
    }

    const propertyNamesById = new Map<number, string>();
    for (const property of category.listOfCategoryProperties) {
      propertyNamesById.set(property.id, property.propertyName);
    }
    for (const product of this.context.selectedCategoryProducts()) {
      for (const property of product.listOfProductExtraProperties) {
        propertyNamesById.set(property.id, property.propertyName);
      }
    }

    const variants = this.context.selectedCategoryVariants();

    const propertySections: FilterSectionData[] = Array.from(propertyNamesById.entries()).map(
      ([propertyId, propertyName]) => {
        const counts = new Map<string, number>();
        for (const variant of variants) {
          const match = variant.listOfVariantProperties.find(
            (propertyValue) => propertyValue.propertyDefinition.id === propertyId,
          );
          if (match) {
            counts.set(match.propertyValue, (counts.get(match.propertyValue) ?? 0) + 1);
          }
        }
        return {
          title: propertyName,
          options: Array.from(counts.entries()).map(([label, count]) => ({ label, count })),
        };
      },
    );

    return propertySections.filter((section) => section.options.length > 0);
  });
}
