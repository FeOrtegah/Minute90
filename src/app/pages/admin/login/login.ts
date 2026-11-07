import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  template: `
    <div class="login">
      <form class="login__caja" (submit)="$event.preventDefault(); ingresar(usuario.value, clave.value)">
        <img src="logo.png" alt="Minute 90" width="110" height="110" />
        <h1>Panel de administración</h1>

        <label class="campo">
          <span>Usuario o correo</span>
          <input #usuario type="text" autocomplete="username" required />
        </label>
        <label class="campo">
          <span>Contraseña</span>
          <input #clave type="password" autocomplete="current-password" required />
        </label>

        @if (error()) {
          <p class="error">{{ error() }}</p>
        }
        <button type="submit" class="btn btn--dorado btn--ancho" [disabled]="cargando()">
          {{ cargando() ? 'Ingresando...' : 'Ingresar' }}
        </button>
        <a routerLink="/" class="link-dorado">← Volver a la tienda</a>
      </form>
    </div>
  `,
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);

  cargando = signal(false);
  error = signal<string | null>(null);

  ingresar(usuario: string, clave: string): void {
    if (!usuario.trim() || !clave) {
      this.error.set('Completa usuario y contraseña');
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    this.auth.login(usuario.trim(), clave).subscribe({
      next: () => this.router.navigate(['/admin']),
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(err.status === 0 ? 'No se pudo conectar con el servidor' : (err.error?.mensaje ?? 'Error al ingresar'));
      },
    });
  }
}
