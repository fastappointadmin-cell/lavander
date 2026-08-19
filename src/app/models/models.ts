export interface PropertyDefinition {
  id: number;
  propertyName: string;
}

export interface ProductCategoryGroup {
  id: number;
  groupName: string;
  subGroups: ProductSubCategoryGroup[];
  categories: ProductCategory[];
}

export interface ProductSubCategoryGroup {
  id: number;
  groupName: string;
  categories: ProductCategory[];
}

export interface ProductCategory {
  id: number;
  categoryName: string;
  categoryProperties: PropertyDefinition[];
}

export interface ProductCategoryRef {
  id: number;
  categoryName: string;
}

export interface Product {
  id: number;
  productName: string;
  productDescription: string;
  category: ProductCategoryRef;
  extraProperties: PropertyDefinition[];
}

export interface ProductRef {
  id: number;
  productName: string;
  categoryId: number;
}

export interface PropertyValue {
  id: number;
  propertyDefinition: PropertyDefinition;
  propertyValue: string;
}

export interface Tag {
  id: number;
  tagName: string;
}

export interface PromotionGroup {
  id: number;
  groupName: string;
  tags: Tag[];
}

export interface ProductVariant {
  id: number;
  variantName: string;
  variantDescription: string;
  product: ProductRef;
  variantProperties: PropertyValue[];
  tags: Tag[];
  price: number;
  starRating: number;
  reviewCount: number;
}
