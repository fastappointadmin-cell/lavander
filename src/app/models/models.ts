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
}

export interface PropertyValue {
  id: number;
  propertyDefinition: PropertyDefinition;
  propertyValue: string;
}

export interface ProductVariant {
  id: number;
  variantName: string;
  variantDescription: string;
  product: ProductRef;
  variantProperties: PropertyValue[];
  price: number;
  starRating: number;
}
