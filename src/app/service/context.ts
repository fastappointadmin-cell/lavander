import { Injectable, computed, inject, signal, Signal, WritableSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Product, ProductCategory, ProductVariant } from '../models/models';
import { ProductCatalog } from './product-catalog';

@Injectable({
  providedIn: 'root'
})
export class Context {

    private readonly productCatalog = inject(ProductCatalog);

    private readonly products = toSignal(this.productCatalog.getProducts(), { initialValue: [] });
    private readonly variants = toSignal(this.productCatalog.getVariants(), { initialValue: [] });

    private readonly selectedCategory: WritableSignal<ProductCategory | null> = signal<ProductCategory | null>(null);
    readonly selectedCategorySignal: Signal<ProductCategory | null> = this.selectedCategory.asReadonly();

    readonly selectedCategoryProducts: Signal<Product[]> = computed(() => {
        const category = this.selectedCategory();
        if (!category) {
            return [];
        }
        return this.products().filter((product) => product.productCategory.id === category.id);
    });

    readonly selectedCategoryVariants: Signal<ProductVariant[]> = computed(() => {
        const productIds = new Set(this.selectedCategoryProducts().map((product) => product.id));
        return this.variants().filter((variant) => productIds.has(variant.product.id));
    });

    public setSelectedCategory(category: ProductCategory | null): void {
        this.selectedCategory.set(category);
    }

}
