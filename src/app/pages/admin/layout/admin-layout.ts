import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="admin">
      <header class="admin__header">
        <a routerLink="/admin" class="header__logo">
          <img src="logo.png" alt="Minute 90" width="44" height="44" />
          <span class="header__marca">ADMIN</span>
        </a>
        <nav class="admin__nav">
          <a routerLink="/admin" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: true }">Productos</a>
          <a routerLink="/admin/nuevo" routerLinkActive="activo">+ Nuevo</a>
          <a routerLink="/admin/ajustes" routerLinkActive="activo">Ajustes</a>
          <a routerLink="/" target="_blank">Ver tienda ↗</a>
          <button type="button" (click)="auth.logout()">Salir</button>
        </nav>
      </header>
      <div class="admin__contenido">
        <router-outlet />
      </div>
    </div>
  `,
})
export class AdminLayout {
  protected auth = inject(AuthService);
}
