import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.asegurarInicializacion();
  if (!auth.autenticado()) {
    return router.createUrlTree(['/auth/login']);
  }

  return true;
};
