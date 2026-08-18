import {
  Component,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  AuthService,
  LoginAccessType
} from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  private readonly authService =
    inject(AuthService);

  private readonly router =
    inject(Router);

  private readonly sessionExpiredNoticeKey =
    'medicdrive_session_expired_notice';

  private readonly sessionExpiryRedirectKey =
    'medicdrive_session_expiry_redirecting';

  accessType: LoginAccessType =
    'ESPECIALISTA';

  username = '';
  password = '';

  loading = signal(false);
  errorMessage = signal('');

  constructor() {
    const sessionExpired =
      localStorage.getItem(
        this.sessionExpiredNoticeKey
      ) === '1';

    localStorage.removeItem(
      this.sessionExpiredNoticeKey
    );

    localStorage.removeItem(
      this.sessionExpiryRedirectKey
    );

    if (sessionExpired) {
      this.errorMessage.set(
        'Tu sesión ha expirado. Inicia sesión nuevamente.'
      );
    }
  }

  selectAccessType(
    type: LoginAccessType
  ): void {
    this.accessType = type;
    this.errorMessage.set('');
    this.username = '';
    this.password = '';
  }

  login(): void {
    this.errorMessage.set('');

    if (
      !this.username
      || !this.password
    ) {
      this.errorMessage.set(
        'Ingrese usuario y contraseña.'
      );

      return;
    }

    this.loading.set(true);

    this.authService
      .loginAs(
        this.accessType,
        this.username,
        this.password
      )
      .subscribe({
        next: () => {
          this.loading.set(false);

          this.router.navigate([
            this.authService.homeRoute()
          ]);
        },
        error: (error) => {
          this.loading.set(false);

          if (
            error?.status === 403
            && this.accessType === 'ESPECIALISTA'
          ) {
            this.errorMessage.set(
              'Su perfil profesional aún no está habilitado para operar. Revise el estado de validación con MedicDrive.'
            );

            return;
          }

          this.errorMessage.set(
            'Credenciales inválidas o usuario no autorizado para el perfil seleccionado.'
          );
        }
      });
  }

  goToRegister(): void {
    this.router.navigate(
      ['/register'],
      {
        queryParams: {
          type: this.accessType
        }
      }
    );
  }

  accessTitle(): string {
    return this.accessType === 'PACIENTE'
      ? 'Acceso paciente'
      : 'Acceso especialista';
  }

  accessDescription(): string {
    return this.accessType === 'PACIENTE'
      ? 'Solicite servicios médicos y revise su historial de atenciones.'
      : 'Gestione solicitudes, fichas médicas e historial operativo.';
  }
}