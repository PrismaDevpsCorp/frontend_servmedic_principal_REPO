import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  username = 'medico.demo@correo.com';
  password = 'EspecialistaServMedic2026';

  loading = signal(false);
  errorMessage = signal('');

  login(): void {
    this.errorMessage.set('');

    if (!this.username || !this.password) {
      this.errorMessage.set('Ingrese usuario y contrasena.');
      return;
    }

    this.loading.set(true);

    this.authService.login(this.username, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Credenciales invalidas o especialista no autorizado.');
      }
    });
  }
}