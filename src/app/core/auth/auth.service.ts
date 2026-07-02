import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SpecialistSession } from '../models/specialist-session.model';

interface SpecialistLoginRequest {
  username: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly sessionKey = 'medicdrive_specialist_session';

  login(username: string, password: string): Observable<SpecialistSession> {
    const body: SpecialistLoginRequest = { username, password };

    return this.http
      .post<SpecialistSession>(environment.apiUrl + '/public/auth/specialist/login', body)
      .pipe(
        tap((session) => {
          localStorage.setItem(this.sessionKey, JSON.stringify(session));
        })
      );
  }

  getSession(): SpecialistSession | null {
    const raw = localStorage.getItem(this.sessionKey);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as SpecialistSession;
    } catch {
      localStorage.removeItem(this.sessionKey);
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

    return !!session?.sessionToken && role === 'ESPECIALISTA';
  }

  logout(): void {
    localStorage.removeItem(this.sessionKey);
    this.router.navigate(['/login']);
  }
}