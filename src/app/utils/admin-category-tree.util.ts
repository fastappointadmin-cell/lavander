import { ProductCategory, ProductCategoryGroup, ProductSubCategoryGroup } from '../models/models';

export interface FlattenedSubGroup {
  subGroup: ProductSubCategoryGroup;
  parentGroupId: number;
}

export interface FlattenedCategory {
  category: ProductCategory;
  parentGroupId?: number;
  parentSubGroupId?: number;
}

export function flattenSubGroups(groups: ProductCategoryGroup[]): FlattenedSubGroup[] {
  const result: FlattenedSubGroup[] = [];
  for (const group of groups) {
    for (const subGroup of group.subGroups) {
      result.push({ subGroup, parentGroupId: group.id });
    }
  }
  return result;
}

export function flattenCategories(groups: ProductCategoryGroup[]): FlattenedCategory[] {
  const result: FlattenedCategory[] = [];
  for (const group of groups) {
    for (const category of group.categories) {
      result.push({ category, parentGroupId: group.id });
    }
    for (const subGroup of group.subGroups) {
      for (const category of subGroup.categories) {
        result.push({ category, parentSubGroupId: subGroup.id });
      }
    }
  }
  return result;
}
