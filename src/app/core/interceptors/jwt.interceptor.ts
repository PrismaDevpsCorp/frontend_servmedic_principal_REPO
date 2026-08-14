import {
  HttpErrorResponse,
  HttpInterceptorFn
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  EMPTY,
  catchError,
  throwError
} from 'rxjs';

interface MedicDriveSession {
  sessionToken?: string;
}

const sessionKeys = [
  'medicdrive_services_session',
  'medicdrive_specialist_session'
];

const sessionExpiredNoticeKey =
  'medicdrive_session_expired_notice';

const sessionExpiryRedirectKey =
  'medicdrive_session_expiry_redirecting';

export const jwtInterceptor: HttpInterceptorFn = (
  request,
  next
) => {
  const token = getSessionToken();

  /*
   * El login publico nunca debe recibir un Bearer antiguo.
   * Esto tambien evita interpretar credenciales incorrectas
   * como una sesion expirada.
   */
  if (
    !token
    || isPublicLoginRequest(request.url)
  ) {
    return next(request);
  }

  const router = inject(Router);

  const authenticatedRequest =
    request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse
        && error.status === 401
      ) {
        handleExpiredSession(router);

        /*
         * No propagar el 401 a la pantalla actual.
         * La UX pasa inmediatamente al login y evita mostrar
         * "Http failure response..." al usuario final.
         */
        return EMPTY;
      }

      return throwError(() => error);
    })
  );
};

function getSessionToken(): string | null {
  for (const key of sessionKeys) {
    const raw = localStorage.getItem(key);

    if (!raw) {
      continue;
    }

    try {
      const session =
        JSON.parse(raw) as MedicDriveSession;

      const token =
        session.sessionToken?.trim();

      if (token) {
        return token;
      }
    } catch {
      localStorage.removeItem(key);
    }
  }

  return null;
}

function isPublicLoginRequest(
  url: string
): boolean {
  return (
    url.includes('/public/auth/')
    && url.includes('/login')
  );
}

function handleExpiredSession(
  router: Router
): void {
  for (const key of sessionKeys) {
    localStorage.removeItem(key);
  }

  const alreadyAtLogin =
    router.url === '/login'
    || router.url.startsWith('/login?');

  if (alreadyAtLogin) {
    localStorage.removeItem(
      sessionExpiryRedirectKey
    );

    return;
  }

  localStorage.setItem(
    sessionExpiredNoticeKey,
    '1'
  );

  const redirectInProgress =
    localStorage.getItem(
      sessionExpiryRedirectKey
    ) === '1';

  if (redirectInProgress) {
    return;
  }

  localStorage.setItem(
    sessionExpiryRedirectKey,
    '1'
  );

  void router.navigate(['/login']);
}