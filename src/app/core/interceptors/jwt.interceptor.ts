import { HttpInterceptorFn } from '@angular/common/http';

interface MedicDriveSession {
  sessionToken?: string;
}

export const jwtInterceptor: HttpInterceptorFn = (request, next) => {
  const token = getSessionToken();

  if (!token) {
    return next(request);
  }

  const authenticatedRequest = request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(authenticatedRequest);
};

function getSessionToken(): string | null {
  const sessionKeys = [
    'medicdrive_services_session',
    'medicdrive_specialist_session'
  ];

  for (const key of sessionKeys) {
    const raw = localStorage.getItem(key);

    if (!raw) {
      continue;
    }

    try {
      const session = JSON.parse(raw) as MedicDriveSession;
      const token = session.sessionToken?.trim();

      if (token) {
        return token;
      }
    } catch {
      localStorage.removeItem(key);
    }
  }

  return null;
}