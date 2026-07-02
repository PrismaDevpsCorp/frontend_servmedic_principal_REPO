import { HttpInterceptorFn } from '@angular/common/http';

export const jwtInterceptor: HttpInterceptorFn = (request, next) => {
  const rawSession = localStorage.getItem('medicdrive_specialist_session');

  if (!rawSession) {
    return next(request);
  }

  try {
    const session = JSON.parse(rawSession);
    const token = session?.sessionToken;

    if (!token) {
      return next(request);
    }

    const authRequest = request.clone({
      setHeaders: {
        Authorization: 'Bearer ' + token
      }
    });

    return next(authRequest);
  } catch {
    return next(request);
  }
};