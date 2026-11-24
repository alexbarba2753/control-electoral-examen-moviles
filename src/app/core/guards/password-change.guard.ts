import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const passwordChangeGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.asegurarInicializacion();
  const usuario = auth.usuario();

  if (!usuario) {
    return router.createUrlTree(['/auth/login']);
  }

  if (usuario.debe_cambiar_password || auth.recuperandoPassword()) {
    return router.createUrlTree(['/auth/cambiar-password']);
  }

  return true;
};
