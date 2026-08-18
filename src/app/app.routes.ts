import { Routes } from '@angular/router';
import { Layout } from './component/layout/layout';
import { AdminPage } from './component/admin/admin-page/admin-page';

export const routes: Routes = [
    // A single route for any /products/... depth (group/category or group/subGroup/category)
    // so Angular never treats a depth change as a different route config and tears down
    // Layout (and everything inside it, including the navbar) between them.
    {
        path: 'products/**',
        component: Layout,
        title: 'Lavander',
    },
    {
        path: 'admin',
        component: AdminPage,
        title: 'Lavander Admin',
    },
    {
        path: '',
        component: Layout,
        title: 'Lavander',
    }
];
