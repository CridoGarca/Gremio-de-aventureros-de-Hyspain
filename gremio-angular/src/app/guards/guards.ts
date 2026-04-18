import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.usuario()) return true;
  return router.createUrlTree(['/login']);
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.esAdmin()) return true;
  return router.createUrlTree(['/app/inicio']);
};

// Solo rol ADMIN (no MOD): para la Consola de administración
export const adminPuroGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.esAdminPuro()) return true;
  return router.createUrlTree(['/app/inicio']);
};
