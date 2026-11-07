import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

// Agrega el token a las peticiones al backend y cierra sesión si expira
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();

  const esApi = req.url.startsWith(environment.apiUrl);
  const peticion = token && esApi ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(peticion).pipe(
    catchError((err: HttpErrorResponse) => {
      const esLogin = req.url.endsWith('/auth/login') || req.url.endsWith('/auth/password');
      if (err.status === 401 && token && !esLogin) auth.logout();
      return throwError(() => err);
    })
  );
};
