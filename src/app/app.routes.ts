import type { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { passwordChangeGuard } from './core/guards/password-change.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login.page').then((m) => m.LoginPage),
      },
      {
        path: 'recuperar-password',
        loadComponent: () =>
          import('./features/auth/recuperar-password/recuperar-password.page').then(
            (m) => m.RecuperarPasswordPage
          ),
      },
      {
        path: 'cambiar-password',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/auth/cambiar-password/cambiar-password.page').then(
            (m) => m.CambiarPasswordPage
          ),
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'provincial',
    canActivate: [authGuard, passwordChangeGuard, roleGuard(['provincial'])],
    loadComponent: () =>
      import('./features/provincial/provincial.page').then((m) => m.ProvincialPage),
  },
  {
    path: 'recinto',
    canActivate: [authGuard, passwordChangeGuard, roleGuard(['recinto'])],
    loadComponent: () =>
      import('./features/recinto/recinto.page').then((m) => m.RecintoPage),
  },
  {
    path: 'veedor',
    canActivate: [authGuard, passwordChangeGuard, roleGuard(['veedor'])],
    loadComponent: () =>
      import('./features/veedor/veedor.page').then((m) => m.VeedorPage),
  },
  {
    path: 'acta/:jrvId/:dignidad',
    canActivate: [authGuard, passwordChangeGuard, roleGuard(['veedor', 'recinto'])],
    loadComponent: () =>
      import('./features/veedor/registrar-acta/registrar-acta.page').then(
        (m) => m.RegistrarActaPage
      ),
  },
  {
    path: '',
    redirectTo: 'auth/login',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'auth/login',
  },
];
