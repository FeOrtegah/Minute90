import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Solo deja entrar al panel si hay sesión. La seguridad real está en el backend:
// sin token válido la API rechaza crear, editar o borrar.
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.logueado() ? true : inject(Router).createUrlTree(['/admin/login']);
};

// Si ya inició sesión, no tiene sentido mostrar el login
export const loginGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.logueado() ? inject(Router).createUrlTree(['/admin']) : true;
};
