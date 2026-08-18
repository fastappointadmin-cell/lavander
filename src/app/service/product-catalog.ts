import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import {
  Product,
  ProductCategory,
  ProductCategoryGroup,
  ProductSubCategoryGroup,
  ProductVariant,
  PromotionGroup,
  PropertyDefinition,
  Tag,
} from '../models/models';
import {
  ProductCategoryGroupRequest,
  ProductCategoryRequest,
  ProductRequest,
  ProductSubCategoryGroupRequest,
  ProductVariantRequest,
  PromotionGroupRequest,
  PropertyDefinitionRequest,
  TagRequest,
} from '../models/admin-requests';
import { environment } from '../../env/env';

@Injectable({
  providedIn: 'root'
})
export class ProductCatalog {

    constructor(private http: HttpClient){}

    private readonly baseUrl = environment.backendUrl;

    // --- Read ---

    getCategoryGroups(): Observable<ProductCategoryGroup[]> {
      return this.http.get<ProductCategoryGroup[]>(`${this.baseUrl}/api/product-categories/groups`);
    }

    getProductsByCategory(categoryId: number): Observable<Product[]> {
        return this.http.get<Product[]>(`${this.baseUrl}/api/products/category/${categoryId}`);
    }

    getVariantsByProductId(productId: number): Observable<ProductVariant[]> {
        return this.http.get<ProductVariant[]>(`${this.baseUrl}/api/products/${productId}/variants`);
    }

    // --- Property definitions ---

    getPropertyDefinitions(): Observable<PropertyDefinition[]> {
        return this.http.get<PropertyDefinition[]>(`${this.baseUrl}/api/property-definitions`);
    }

    createPropertyDefinition(request: PropertyDefinitionRequest): Observable<PropertyDefinition> {
        return this.http.post<PropertyDefinition>(`${this.baseUrl}/api/property-definitions`, request);
    }

    updatePropertyDefinition(id: number, request: PropertyDefinitionRequest): Observable<PropertyDefinition> {
        return this.http.put<PropertyDefinition>(`${this.baseUrl}/api/property-definitions/${id}`, request);
    }

    deletePropertyDefinition(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/api/property-definitions/${id}`);
    }

    // --- Groups ---

    createGroup(request: ProductCategoryGroupRequest): Observable<ProductCategoryGroup> {
        return this.http.post<ProductCategoryGroup>(`${this.baseUrl}/api/product-categories/groups`, request);
    }

    updateGroup(id: number, request: ProductCategoryGroupRequest): Observable<ProductCategoryGroup> {
        return this.http.put<ProductCategoryGroup>(`${this.baseUrl}/api/product-categories/groups/${id}`, request);
    }

    deleteGroup(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/api/product-categories/groups/${id}`);
    }

    // --- Subgroups ---

    createSubGroup(request: ProductSubCategoryGroupRequest): Observable<ProductSubCategoryGroup> {
        return this.http.post<ProductSubCategoryGroup>(`${this.baseUrl}/api/product-categories/subgroups`, request);
    }

    updateSubGroup(id: number, request: ProductSubCategoryGroupRequest): Observable<ProductSubCategoryGroup> {
        return this.http.put<ProductSubCategoryGroup>(`${this.baseUrl}/api/product-categories/subgroups/${id}`, request);
    }

    deleteSubGroup(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/api/product-categories/subgroups/${id}`);
    }

    // --- Categories ---

    createCategory(request: ProductCategoryRequest): Observable<ProductCategory> {
        return this.http.post<ProductCategory>(`${this.baseUrl}/api/product-categories`, request);
    }

    updateCategory(id: number, request: ProductCategoryRequest): Observable<ProductCategory> {
        return this.http.put<ProductCategory>(`${this.baseUrl}/api/product-categories/${id}`, request);
    }

    deleteCategory(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/api/product-categories/${id}`);
    }

    // --- Products ---

    getAllProducts(): Observable<Product[]> {
        return this.http.get<Product[]>(`${this.baseUrl}/api/products`);
    }

    createProduct(request: ProductRequest): Observable<Product> {
        return this.http.post<Product>(`${this.baseUrl}/api/products`, request);
    }

    updateProduct(id: number, request: ProductRequest): Observable<Product> {
        return this.http.put<Product>(`${this.baseUrl}/api/products/${id}`, request);
    }

    deleteProduct(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/api/products/${id}`);
    }

    // --- Variants ---

    getAllVariants(): Observable<ProductVariant[]> {
        return this.http.get<ProductVariant[]>(`${this.baseUrl}/api/products/variants`);
    }

    createVariant(request: ProductVariantRequest): Observable<ProductVariant> {
        return this.http.post<ProductVariant>(`${this.baseUrl}/api/products/variants`, request);
    }

    updateVariant(id: number, request: ProductVariantRequest): Observable<ProductVariant> {
        return this.http.put<ProductVariant>(`${this.baseUrl}/api/products/variants/${id}`, request);
    }

    deleteVariant(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/api/products/variants/${id}`);
    }

    // --- Tags ---

    getTags(): Observable<Tag[]> {
        return this.http.get<Tag[]>(`${this.baseUrl}/api/tags`);
    }

    createTag(request: TagRequest): Observable<Tag> {
        return this.http.post<Tag>(`${this.baseUrl}/api/tags`, request);
    }

    updateTag(id: number, request: TagRequest): Observable<Tag> {
        return this.http.put<Tag>(`${this.baseUrl}/api/tags/${id}`, request);
    }

    deleteTag(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/api/tags/${id}`);
    }

    // --- Promotion groups ---

    getPromotionGroups(): Observable<PromotionGroup[]> {
        return this.http.get<PromotionGroup[]>(`${this.baseUrl}/api/promotion-groups`);
    }

    createPromotionGroup(request: PromotionGroupRequest): Observable<PromotionGroup> {
        return this.http.post<PromotionGroup>(`${this.baseUrl}/api/promotion-groups`, request);
    }

    updatePromotionGroup(id: number, request: PromotionGroupRequest): Observable<PromotionGroup> {
        return this.http.put<PromotionGroup>(`${this.baseUrl}/api/promotion-groups/${id}`, request);
    }

    deletePromotionGroup(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/api/promotion-groups/${id}`);
    }

    getPromotionGroupVariants(id: number): Observable<ProductVariant[]> {
        return this.http.get<ProductVariant[]>(`${this.baseUrl}/api/promotion-groups/${id}/variants`);
    }
}
