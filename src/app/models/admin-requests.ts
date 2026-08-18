export interface PropertyDefinitionRequest {
  propertyName: string;
}

export interface ProductCategoryGroupRequest {
  groupName: string;
}

export interface ProductSubCategoryGroupRequest {
  groupName: string;
  parentGroupId: number;
}

export interface ProductCategoryRequest {
  categoryName: string;
  parentGroupId?: number;
  parentSubGroupId?: number;
  categoryPropertyIds: number[];
}

export interface ProductRequest {
  productName: string;
  productDescription: string;
  categoryId: number;
  extraPropertyIds: number[];
}

export interface PropertyValueInput {
  propertyDefinitionId: number;
  value: string;
}

export interface ProductVariantRequest {
  variantName: string;
  variantDescription: string;
  productId: number;
  price: number;
  starRating: number;
  variantProperties: PropertyValueInput[];
  tagIds: number[];
}

export interface TagRequest {
  tagName: string;
}

export interface PromotionGroupRequest {
  groupName: string;
  tagIds: number[];
}
