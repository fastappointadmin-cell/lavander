import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../../service/auth';

@Component({
  selector: 'app-account-page',
  imports: [],
  templateUrl: './account-page.html',
  styleUrl: './account-page.scss',
})
export class AccountPage {
  protected readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected onLogout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/');
  }
}
