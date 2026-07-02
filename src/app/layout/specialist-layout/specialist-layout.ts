import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-specialist-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './specialist-layout.html',
  styleUrl: './specialist-layout.scss'
})
export class SpecialistLayout {
  private readonly authService = inject(AuthService);

  session = this.authService.getSession();

  logout(): void {
    this.authService.logout();
  }
}