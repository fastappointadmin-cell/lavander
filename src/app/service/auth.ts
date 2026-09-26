import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthResponse, User } from '../models/models';
import { LoginRequest, RegisterRequest } from '../models/auth-requests';
import { environment } from '../../env/env';

const AUTH_TOKEN_STORAGE_KEY = 'auth_token';

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.backendUrl;
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly currentUser = signal<User | null>(null);
  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly isAdmin = computed(() => this.currentUser()?.role === 'ADMIN');

  // Restoring the session from a stored token is asynchronous (a /me round trip), but
  // route guards need to check isAuthenticated/isAdmin synchronously on navigation —
  // without this, a guard evaluated before the response arrives sees a logged-out user
  // and redirects away even though the token is valid. Guards wait for this to flip.
  private readonly _ready = signal(false);
  readonly ready = this._ready.asReadonly();

  constructor() {
    // The auth interceptor attaches the stored token to this request automatically.
    if (this.isBrowser && localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)) {
      this.http.get<User>(`${this.baseUrl}/api/auth/me`).subscribe({
        next: (user) => {
          this.currentUser.set(user);
          this._ready.set(true);
        },
        error: () => {
          this.clearSession();
          this._ready.set(true);
        },
      });
    } else {
      this._ready.set(true);
    }
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/api/auth/register`, request)
      .pipe(tap((response) => this.storeSession(response)));
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/api/auth/login`, request)
      .pipe(tap((response) => this.storeSession(response)));
  }

  logout(): void {
    this.clearSession();
  }

  private storeSession(response: AuthResponse): void {
    this.currentUser.set(response.user);
    if (this.isBrowser) {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, response.token);
    }
  }

  private clearSession(): void {
    this.currentUser.set(null);
    if (this.isBrowser) {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    }
  }
}
