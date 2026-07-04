import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MedicDriveSession } from '../models/specialist-session.model';

export type LoginAccessType = 'PACIENTE' | 'ESPECIALISTA';

interface LoginRequest {
  username: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly sessionKey = 'medicdrive_services_session';
  private readonly legacySpecialistSessionKey = 'medicdrive_specialist_session';

  loginAs(accessType: LoginAccessType, username: string, password: string): Observable<MedicDriveSession> {
    const body: LoginRequest = { username, password };
    const loginPath = accessType === 'PACIENTE' ? 'patient' : 'specialist';

    return this.http
      .post<MedicDriveSession>(environment.apiUrl + '/public/auth/' + loginPath + '/login', body)
      .pipe(
        tap((session) => {
          localStorage.setItem(this.sessionKey, JSON.stringify(session));
          localStorage.removeItem(this.legacySpecialistSessionKey);
        })
      );
  }

  login(username: string, password: string): Observable<MedicDriveSession> {
    return this.loginAs('ESPECIALISTA', username, password);
  }

  getSession(): MedicDriveSession | null {
    const raw = localStorage.getItem(this.sessionKey)
      ?? localStorage.getItem(this.legacySpecialistSessionKey);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as MedicDriveSession;
    } catch {
      localStorage.removeItem(this.sessionKey);
      localStorage.removeItem(this.legacySpecialistSessionKey);
      return null;
    }
  }

  getToken(): string | null {
    return this.getSession()?.sessionToken ?? null;
  }

  getRole(): string | null {
    const session = this.getSession();
    return session?.roleCode ?? session?.role ?? null;
  }

  isLoggedIn(): boolean {
    const session = this.getSession();
    const role = this.getRole();

    return !!session?.sessionToken && (role === 'ESPECIALISTA' || role === 'PACIENTE');
  }

  isSpecialistLoggedIn(): boolean {
    const session = this.getSession();
    return !!session?.sessionToken && this.getRole() === 'ESPECIALISTA';
  }

  isPatientLoggedIn(): boolean {
    const session = this.getSession();
    return !!session?.sessionToken && this.getRole() === 'PACIENTE';
  }

  homeRoute(): string {
    const role = this.getRole();

    if (role === 'PACIENTE') {
      return '/patient-dashboard';
    }

    return '/dashboard';
  }

  logout(): void {
    localStorage.removeItem(this.sessionKey);
    localStorage.removeItem(this.legacySpecialistSessionKey);
    this.router.navigate(['/login']);
  }
}