import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductosService } from '../../core/services/productos.service';
import { Producto } from '../../core/models';
import { ProductoCard } from '../../shared/producto-card';

@Component({
  selector: 'app-inicio',
  imports: [RouterLink, ProductoCard],
  templateUrl: './inicio.html',
})
export class Inicio {
  private productosService = inject(ProductosService);

  destacados = signal<Producto[]>([]);
  nuevos = signal<Producto[]>([]);
  ligas = signal<string[]>([]);
  cargando = signal(true);
  error = signal(false);

  constructor() {
    this.productosService.listar().subscribe({
      next: (lista) => {
        const destacados = lista.filter((p) => p.destacado);
        this.destacados.set((destacados.length ? destacados : lista).slice(0, 8));
        this.nuevos.set(lista.filter((p) => !p.destacado).slice(0, 4));
        this.cargando.set(false);
      },
      error: () => {
        this.error.set(true);
        this.cargando.set(false);
      },
    });
    this.productosService.filtros().subscribe({ next: (f) => this.ligas.set(f.ligas.slice(0, 6)) });
  }
}
