import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-patient-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './patient-layout.html',
  styleUrl: './patient-layout.scss'
})
export class PatientLayout {
  private readonly authService = inject(AuthService);

  session = this.authService.getSession();

  logout(): void {
    this.authService.logout();
  }
}