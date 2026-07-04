import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const patientAuthGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isPatientLoggedIn()) {
    return true;
  }

  if (authService.isSpecialistLoggedIn()) {
    return router.createUrlTree(['/dashboard']);
  }

  return router.createUrlTree(['/login']);
};