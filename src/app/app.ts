import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { CarritoService } from './core/services/carrito.service';
import { AjustesService } from './core/services/ajustes.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected carrito = inject(CarritoService);
  protected ajustes = inject(AjustesService).ajustes;
  private router = inject(Router);

  protected menuAbierto = signal(false);
  protected anio = new Date().getFullYear();

  // En /admin se oculta el header y footer de la tienda
  protected enAdmin = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => (e as NavigationEnd).urlAfterRedirects.startsWith('/admin'))
    ),
    { initialValue: false }
  );

  constructor() {
    inject(AjustesService).cargar();
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => this.menuAbierto.set(false));
  }
}
