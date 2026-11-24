import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RolUsuario } from '../models/usuario.model';
import { AuthService } from '../services/auth.service';

export function roleGuard(rolesPermitidos: RolUsuario[]): CanActivateFn {
  return async () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    await auth.asegurarInicializacion();
    const usuario = auth.usuario();

    if (!usuario) {
      return router.createUrlTree(['/auth/login']);
    }

    if (usuario.debe_cambiar_password) {
      return router.createUrlTree(['/auth/cambiar-password']);
    }

    if (!rolesPermitidos.includes(usuario.rol)) {
      return router.createUrlTree([auth.rutaInicioPorRol(usuario.rol)]);
    }

    return true;
  };
}
