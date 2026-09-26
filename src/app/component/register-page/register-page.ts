import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../service/auth';

@Component({
  selector: 'app-register-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './register-page.html',
  styleUrl: './register-page.scss',
})
export class RegisterPage {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected fullName = '';
  protected email = '';
  protected password = '';

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected onSubmit(): void {
    this.errorMessage.set(null);

    // Angular's NgForm disables native HTML validation (adds novalidate), so
    // required/minlength attributes on the inputs are purely decorative — this is
    // the actual check that stops an invalid submission from reaching the backend.
    if (!this.fullName.trim() || !this.email.trim() || !this.password) {
      this.errorMessage.set('Completeaza toate campurile.');
      return;
    }
    if (this.password.length < 8) {
      this.errorMessage.set('Parola trebuie sa aiba cel putin 8 caractere.');
      return;
    }

    this.submitting.set(true);
    this.auth.register({ email: this.email, password: this.password, fullName: this.fullName }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigateByUrl('/');
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(
          err.status === 409 ? 'Exista deja un cont cu acest email.' : 'A aparut o eroare. Incearca din nou.',
        );
      },
    });
  }
}
