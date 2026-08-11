import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Product, ProductCategoryGroup, ProductVariant } from '../models/models';
import { MOCK_CATEGORY_GROUPS, MOCK_PRODUCTS, MOCK_VARIANTS } from '../mock-data/mock-catalog-data';

@Injectable({
  providedIn: 'root'
})
export class ProductCatalog {

getCategoryGroups(): Observable<ProductCategoryGroup[]> {
    return of(MOCK_CATEGORY_GROUPS);
  }

  getProducts(): Observable<Product[]> {
    return of(MOCK_PRODUCTS);
  }

  getVariants(): Observable<ProductVariant[]> {
    return of(MOCK_VARIANTS);
  }

}
