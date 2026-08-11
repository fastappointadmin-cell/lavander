export interface PropertyDefinition {
  id: number;
  propertyName: string;
}

export interface ProductCategoryGroup {
  id: number;
  groupName: string;
  parentGroup?: ProductCategoryGroup;      
  listOfSubGroups: ProductCategoryGroup[]; 
  listOfCategories: ProductCategory[];     
}

export interface ProductCategory {
  id: number;
  categoryName: string;
  parentGroup: ProductCategoryGroup;
  listOfCategoryProperties: PropertyDefinition[]; 
}

export interface Product {
  id: number;
  productName: string;
  productDescription: string;
  productCategory: ProductCategory;
  listOfProductExtraProperties: PropertyDefinition[];
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
  product: Product;
  listOfVariantProperties: PropertyValue[];
  price: number;
  starRating: number;
}
