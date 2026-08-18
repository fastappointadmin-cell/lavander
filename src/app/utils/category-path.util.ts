import { ProductCategory, ProductCategoryGroup, ProductSubCategoryGroup } from '../models/models';

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Builds the URL slug segments for a category, e.g. ['electronics', 'computers', 'laptops']
 * or ['curatenie', 'detergenti'] when the category sits directly under a group.
 *
 * Takes the group (and, if applicable, subGroup) explicitly rather than reading
 * a parentGroup back-reference off the category, since ProductCategory doesn't carry
 * one (it isn't part of the backend's DTO shape).
 */
export function getCategoryPathSlugs(
  group: ProductCategoryGroup,
  category: ProductCategory,
  subGroup?: ProductSubCategoryGroup,
): string[] {
  if (subGroup) {
    return [slugify(group.groupName), slugify(subGroup.groupName), slugify(category.categoryName)];
  }
  return [slugify(group.groupName), slugify(category.categoryName)];
}

export interface CategoryPath {
  group: ProductCategoryGroup;
  subGroup?: ProductSubCategoryGroup;
  category: ProductCategory;
}

/**
 * Resolves a category (with its group/subGroup) from its URL slug segments
 * (2 segments = group/category, 3 segments = group/subGroup/category).
 * Returns null if no match is found.
 */
export function findCategoryPathBySlugs(
  groups: ProductCategoryGroup[],
  slugs: string[],
): CategoryPath | null {
  const group = groups.find((candidate) => slugify(candidate.groupName) === slugs[0]);
  if (!group) {
    return null;
  }

  if (slugs.length === 2) {
    const [, categorySlug] = slugs;
    const category = group.categories.find((candidate) => slugify(candidate.categoryName) === categorySlug);
    return category ? { group, category } : null;
  }

  if (slugs.length === 3) {
    const [, subGroupSlug, categorySlug] = slugs;
    const subGroup = group.subGroups.find((candidate) => slugify(candidate.groupName) === subGroupSlug);
    if (!subGroup) {
      return null;
    }
    const category = subGroup.categories.find((candidate) => slugify(candidate.categoryName) === categorySlug);
    return category ? { group, subGroup, category } : null;
  }

  return null;
}

/**
 * Resolves a category's group/subGroup from its id alone, for callers that only
 * have a category id (e.g. a variant reached via a promotion listing, which pools
 * variants from categories other than the one currently being browsed).
 */
export function findCategoryPathByCategoryId(
  groups: ProductCategoryGroup[],
  categoryId: number,
): CategoryPath | null {
  for (const group of groups) {
    const direct = group.categories.find((candidate) => candidate.id === categoryId);
    if (direct) {
      return { group, category: direct };
    }
    for (const subGroup of group.subGroups) {
      const nested = subGroup.categories.find((candidate) => candidate.id === categoryId);
      if (nested) {
        return { group, subGroup, category: nested };
      }
    }
  }
  return null;
}
