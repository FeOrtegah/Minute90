import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'm90_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly _token = signal<string | null>(this.leerToken());
  readonly token = this._token.asReadonly();
  readonly logueado = computed(() => !!this._token());

  login(email: string, password: string): Observable<{ token: string; email: string }> {
    return this.http
      .post<{ token: string; email: string }>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(tap((r) => this.guardarToken(r.token)));
  }

  cambiarPassword(actual: string, nueva: string) {
    return this.http.put<{ mensaje: string }>(`${environment.apiUrl}/auth/password`, { actual, nueva });
  }

  logout(redirigir = true): void {
    this.guardarToken(null);
    if (redirigir) this.router.navigate(['/admin/login']);
  }

  private guardarToken(token: string | null): void {
    this._token.set(token);
    try {
      if (token) sessionStorage.setItem(TOKEN_KEY, token);
      else sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* almacenamiento no disponible */
    }
  }

  private leerToken(): string | null {
    try {
      const token = sessionStorage.getItem(TOKEN_KEY);
      if (!token) return null;
      // Si el token ya expiró, se descarta
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        sessionStorage.removeItem(TOKEN_KEY);
        return null;
      }
      return token;
    } catch {
      return null;
    }
  }
}
