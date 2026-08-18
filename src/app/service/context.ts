import { Injectable, Signal, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, forkJoin, map, of, startWith, switchMap } from 'rxjs';
import { Product, ProductCategory, ProductVariant, PromotionGroup } from '../models/models';
import { ProductCatalog } from './product-catalog';
import { CategoryPath, findCategoryPathBySlugs, slugify } from '../utils/category-path.util';

@Injectable({
  providedIn: 'root'
})
export class Context {

    private readonly router = inject(Router);
    private readonly productCatalog = inject(ProductCatalog);

    readonly categoryGroups = toSignal(this.productCatalog.getCategoryGroups(), { initialValue: [] });

    private readonly promotionGroups = toSignal(this.productCatalog.getPromotionGroups(), { initialValue: [] });

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

    private readonly currentUrl: Signal<string> = toSignal(
        this.router.events.pipe(
            filter((event): event is NavigationEnd => event instanceof NavigationEnd),
            map(() => this.router.url),
            startWith(this.router.url),
        ),
        { initialValue: this.router.url },
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

    // Sidebar filter selections live in the `filter` query param (repeated,
    // one `propertyId:value` pair per entry) rather than in-memory state, so a
    // filtered URL can be copy-pasted or refreshed without losing the selection.
    // Navigating to a different category (a plain path change with no
    // queryParamsHandling) naturally drops it, which is also the desired reset.
    readonly filterSelections: Signal<Map<number, Set<string>>> = computed(() => {
        const urlTree = this.router.parseUrl(this.currentUrl());
        const map = new Map<number, Set<string>>();
        for (const raw of urlTree.queryParamMap.getAll('filter')) {
            const separatorIndex = raw.indexOf(':');
            if (separatorIndex === -1) {
                continue;
            }
            const propertyId = Number(raw.slice(0, separatorIndex));
            const value = raw.slice(separatorIndex + 1);
            if (!Number.isFinite(propertyId) || value.length === 0) {
                continue;
            }
            const values = map.get(propertyId) ?? new Set<string>();
            values.add(value);
            map.set(propertyId, values);
        }
        return map;
    });

    // A variant must match every property that has at least one selected value
    // (AND across properties); within one property, any selected value matches (OR).
    readonly filteredCategoryVariants: Signal<ProductVariant[]> = computed(() => {
        const variants = this.selectedCategoryVariants();
        const filters = this.filterSelections();
        if (filters.size === 0) {
            return variants;
        }
        return variants.filter((variant) =>
            Array.from(filters.entries()).every(([propertyId, values]) =>
                variant.variantProperties.some(
                    (propertyValue) => propertyValue.propertyDefinition.id === propertyId && values.has(propertyValue.propertyValue),
                ),
            ),
        );
    });

    toggleFilterValue(propertyId: number, value: string): void {
        const next = new Map(this.filterSelections());
        const values = new Set(next.get(propertyId) ?? []);
        if (values.has(value)) {
            values.delete(value);
        } else {
            values.add(value);
        }
        if (values.size === 0) {
            next.delete(propertyId);
        } else {
            next.set(propertyId, values);
        }

        const pairs: string[] = [];
        for (const [id, vals] of next) {
            for (const v of vals) {
                pairs.push(`${id}:${v}`);
            }
        }

        const urlTree = this.router.parseUrl(this.router.url);
        const { filter: _existingFilter, ...restParams } = urlTree.queryParams;
        urlTree.queryParams = pairs.length > 0 ? { ...restParams, filter: pairs } : restParams;
        this.router.navigateByUrl(urlTree, { replaceUrl: true });
    }

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

    readonly selectedPromotionSlug: Signal<string | null> = computed(() => {
        const path = this.currentUrl().split('?')[0].split('#')[0];
        const segments = path.split('/').filter((segment) => segment.length > 0);
        return segments[0] === 'promotions' ? (segments[1] ?? null) : null;
    });

    readonly selectedPromotionGroup: Signal<PromotionGroup | null> = computed(() => {
        const slug = this.selectedPromotionSlug();
        if (!slug) {
            return null;
        }
        return this.promotionGroups().find((group) => slugify(group.groupName) === slug) ?? null;
    });

    readonly selectedPromotionVariants: Signal<ProductVariant[]> = toSignal(
        toObservable(this.selectedPromotionGroup).pipe(
            switchMap((group) => {
                if (!group) {
                    return of([]);
                }
                return this.productCatalog.getPromotionGroupVariants(group.id);
            }),
        ),
        { initialValue: [] },
    );

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
