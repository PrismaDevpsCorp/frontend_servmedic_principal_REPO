import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, LoginAccessType } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  accessType: LoginAccessType = 'ESPECIALISTA';

  username = 'medico.demo@correo.com';
  password = 'EspecialistaServMedic2026';

  loading = signal(false);
  errorMessage = signal('');

  selectAccessType(type: LoginAccessType): void {
    this.accessType = type;
    this.errorMessage.set('');

    if (type === 'PACIENTE') {
      this.username = 'paciente.demo@correo.com';
      this.password = 'PacienteServMedic2026';
      return;
    }

    this.username = 'medico.demo@correo.com';
    this.password = 'EspecialistaServMedic2026';
  }

  login(): void {
    this.errorMessage.set('');

    if (!this.username || !this.password) {
      this.errorMessage.set('Ingrese usuario y contrasena.');
      return;
    }

    this.loading.set(true);

    this.authService.loginAs(this.accessType, this.username, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate([this.authService.homeRoute()]);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Credenciales invalidas o usuario no autorizado para el perfil seleccionado.');
      }
    });
  }

  accessTitle(): string {
    return this.accessType === 'PACIENTE'
      ? 'Acceso paciente'
      : 'Acceso especialista';
  }

  accessDescription(): string {
    return this.accessType === 'PACIENTE'
      ? 'Solicite servicios medicos y revise su historial de atenciones.'
      : 'Gestione solicitudes, fichas medicas e historial operativo.';
  }
}