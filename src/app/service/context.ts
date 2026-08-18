import { Injectable, Signal, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, forkJoin, map, of, startWith, switchMap } from 'rxjs';
import { Product, ProductCategory, ProductVariant } from '../models/models';
import { ProductCatalog } from './product-catalog';
import { CategoryPath, findCategoryPathBySlugs } from '../utils/category-path.util';

@Injectable({
  providedIn: 'root'
})
export class Context {

    private readonly router = inject(Router);
    private readonly productCatalog = inject(ProductCatalog);

    private readonly categoryGroups = toSignal(this.productCatalog.getCategoryGroups(), { initialValue: [] });

    // Reads the current URL's segments fresh on every completed navigation, rather than
    // named route params, since products/** is a single route (any depth), so there are no
    // named route params to read off it.
    private readonly routeSegments: Signal<string[]> = toSignal(
        this.router.events.pipe(
            filter((event): event is NavigationEnd => event instanceof NavigationEnd),
            map(() => this.currentPathSegments()),
            startWith(this.currentPathSegments()),
        ),
        { initialValue: this.currentPathSegments() },
    );

    private readonly categorySlugs: Signal<string[]> = computed(() => {
        const segments = this.routeSegments();
        const productMarkerIndex = segments.indexOf('product');
        return productMarkerIndex === -1 ? segments : segments.slice(0, productMarkerIndex);
    });

    readonly selectedProductId: Signal<number | null> = computed(() => {
        return this.idAfterMarker('product');
    });

    readonly selectedVariantId: Signal<number | null> = computed(() => {
        return this.idAfterMarker('variant');
    });

    // Pure derivation: category path comes straight from the route + the (already loaded) category tree.
    readonly selectedCategoryPath: Signal<CategoryPath | null> = computed(() => {
        const slugs = this.categorySlugs();
        const groups = this.categoryGroups();
        if (slugs.length === 0) {
            return null;
        }

        return findCategoryPathBySlugs(groups, slugs);
    });

    readonly selectedCategorySignal: Signal<ProductCategory | null> = computed(() => {
        return this.selectedCategoryPath()?.category ?? null;
    });

    readonly selectedCategoryProducts: Signal<Product[]> = toSignal(
        toObservable(this.selectedCategorySignal).pipe(
            switchMap((category) => {
                if (!category) {
                    return of([]);
                }
                return this.productCatalog.getProductsByCategory(category.id);
            }),
        ),
        { initialValue: [] },
    );

    readonly selectedCategoryVariants: Signal<ProductVariant[]> = toSignal(
        toObservable(this.selectedCategoryProducts).pipe(
            switchMap((products) => {
                if (products.length === 0) {
                    return of([]);
                }
                return forkJoin(
                    products.map((product) => this.productCatalog.getVariantsByProductId(product.id)),
                ).pipe(map((variantsArrays) => variantsArrays.flat()));
            }),
        ),
        { initialValue: [] },
    );

    readonly selectedProductVariants: Signal<ProductVariant[]> = toSignal(
        toObservable(this.selectedProductId).pipe(
            switchMap((productId) => {
                if (productId === null) {
                    return of([]);
                }
                return this.productCatalog.getVariantsByProductId(productId);
            }),
        ),
        { initialValue: [] },
    );

    readonly selectedVariant: Signal<ProductVariant | null> = computed(() => {
        const variants = this.selectedProductVariants();
        if (variants.length === 0) {
            return null;
        }
        const variantId = this.selectedVariantId();
        return variants.find((variant) => variant.id === variantId) ?? variants[0];
    });

    private currentPathSegments(): string[] {
        const path = this.router.url.split('?')[0].split('#')[0];
        const segments = path.split('/').filter((segment) => segment.length > 0);
        if (segments[0] !== 'products') {
            return [];
        }
        return segments.slice(1);
    }

    private idAfterMarker(marker: string): number | null {
        const segments = this.routeSegments();
        const markerIndex = segments.indexOf(marker);
        if (markerIndex === -1) {
            return null;
        }
        const id = Number(segments[markerIndex + 1]);
        return Number.isFinite(id) ? id : null;
    }

}
