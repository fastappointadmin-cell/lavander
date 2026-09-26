import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // These routes are gated by canActivate guards that check the logged-in user's role.
  // That check reads a JWT from localStorage, which doesn't exist during SSR — a guard
  // evaluated server-side would always see "logged out" and redirect away, even for a
  // genuinely logged-in visitor. Rendering them client-only sidesteps that entirely.
  {
    path: 'account',
    renderMode: RenderMode.Client,
  },
  {
    path: 'orders',
    renderMode: RenderMode.Client,
  },
  {
    path: 'admin',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Server
  }
];
