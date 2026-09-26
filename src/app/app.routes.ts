import { Routes } from '@angular/router';
import { Layout } from './component/layout/layout';
import { AdminPage } from './component/admin/admin-page/admin-page';
import { adminGuard, authGuard } from './guard/auth.guard';

export const routes: Routes = [
    // A single route for any /products/... depth (group/category or group/subGroup/category)
    // so Angular never treats a depth change as a different route config and tears down
    // Layout (and everything inside it, including the navbar) between them.
    {
        path: 'products/**',
        component: Layout,
        title: 'Lavander',
    },
    // A promotion page is a flat listing (no nested product/variant sub-routes) — but still
    // routed through Layout/** for the same reason as products/** above.
    {
        path: 'promotions/**',
        component: Layout,
        title: 'Lavander',
    },
    {
        path: 'cart',
        component: Layout,
        title: 'Lavander - Cos',
    },
    {
        path: 'checkout',
        component: Layout,
        title: 'Lavander - Checkout',
    },
    {
        path: 'admin',
        component: AdminPage,
        title: 'Lavander Admin',
        canActivate: [adminGuard],
    },
    {
        path: 'login',
        component: Layout,
        title: 'Lavander - Autentificare',
    },
    {
        path: 'register',
        component: Layout,
        title: 'Lavander - Creeaza cont',
    },
    {
        path: 'account',
        component: Layout,
        title: 'Lavander - Contul meu',
        canActivate: [authGuard],
    },
    {
        path: 'orders',
        component: Layout,
        title: 'Lavander - Comenzile mele',
        canActivate: [authGuard],
    },
    {
        path: 'favorites',
        component: Layout,
        title: 'Lavander - Produse favorite',
        canActivate: [authGuard],
    },
    {
        path: '',
        component: Layout,
        title: 'Lavander',
    }
];
