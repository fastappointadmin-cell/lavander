import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { Auth } from '../service/auth';

// Waits for Auth's initial session restore (a /me round trip on app boot) before
// deciding — otherwise a guard evaluated before that response arrives would see a
// logged-out user and redirect away even with a valid stored token.
function waitUntilReady<T>(auth: Auth, decide: () => T) {
  return toObservable(auth.ready).pipe(
    filter((ready) => ready),
    take(1),
    map(decide),
  );
}

export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  return waitUntilReady(auth, () => (auth.isAuthenticated() ? true : router.parseUrl('/login')));
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  return waitUntilReady(auth, () => (auth.isAdmin() ? true : router.parseUrl('/login')));
};
