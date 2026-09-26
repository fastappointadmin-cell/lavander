import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../service/auth';

@Component({
  selector: 'app-account-page',
  imports: [RouterLink, FormsModule],
  templateUrl: './account-page.html',
  styleUrl: './account-page.scss',
})
export class AccountPage {
  protected readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected fullName = '';
  protected readonly profileSubmitting = signal(false);
  protected readonly profileMessage = signal<string | null>(null);
  protected readonly profileError = signal<string | null>(null);

  protected currentPassword = '';
  protected newPassword = '';
  protected readonly passwordSubmitting = signal(false);
  protected readonly passwordMessage = signal<string | null>(null);
  protected readonly passwordError = signal<string | null>(null);

  constructor() {
    effect(() => {
      const user = this.auth.user();
      if (user) {
        this.fullName = user.fullName;
      }
    });
  }

  protected onLogout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/');
  }

  protected onSaveProfile(): void {
    this.profileError.set(null);
    this.profileMessage.set(null);
    if (!this.fullName.trim()) {
      this.profileError.set('Numele nu poate fi gol.');
      return;
    }

    this.profileSubmitting.set(true);
    this.auth.updateProfile({ fullName: this.fullName }).subscribe({
      next: () => {
        this.profileSubmitting.set(false);
        this.profileMessage.set('Numele a fost actualizat.');
      },
      error: () => {
        this.profileSubmitting.set(false);
        this.profileError.set('A aparut o eroare. Incearca din nou.');
      },
    });
  }

  protected onChangePassword(): void {
    this.passwordError.set(null);
    this.passwordMessage.set(null);
    if (!this.currentPassword) {
      this.passwordError.set('Introdu parola curenta.');
      return;
    }
    if (this.newPassword.length < 8) {
      this.passwordError.set('Parola noua trebuie sa aiba cel putin 8 caractere.');
      return;
    }

    this.passwordSubmitting.set(true);
    this.auth.changePassword({ currentPassword: this.currentPassword, newPassword: this.newPassword }).subscribe({
      next: () => {
        this.passwordSubmitting.set(false);
        this.passwordMessage.set('Parola a fost schimbata.');
        this.currentPassword = '';
        this.newPassword = '';
      },
      error: (err) => {
        this.passwordSubmitting.set(false);
        this.passwordError.set(
          err.status === 401 ? 'Parola curenta este incorecta.' : 'A aparut o eroare. Incearca din nou.',
        );
      },
    });
  }
}
