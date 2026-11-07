import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductosService } from '../../../core/services/productos.service';
import { Producto, precioFinal, stockTotal } from '../../../core/models';
import { ClpPipe } from '../../../shared/clp.pipe';

@Component({
  selector: 'app-admin-productos',
  imports: [RouterLink, ClpPipe],
  templateUrl: './admin-productos.html',
})
export class AdminProductos {
  private productosService = inject(ProductosService);

  productos = signal<Producto[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);
  busqueda = signal('');

  filtrados = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    if (!q) return this.productos();
    return this.productos().filter((p) => `${p.nombre} ${p.equipo} ${p.liga}`.toLowerCase().includes(q));
  });

  stockTotal = stockTotal;
  precioFinal = precioFinal;

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.productosService.listarAdmin().subscribe({
      next: (lista) => {
        this.productos.set(lista);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los productos');
        this.cargando.set(false);
      },
    });
  }

  alternar(p: Producto, campo: 'activo' | 'destacado'): void {
    const valor = !p[campo];
    this.productosService.actualizar(p._id, { [campo]: valor }).subscribe({
      next: (actualizado) => this.productos.update((l) => l.map((x) => (x._id === p._id ? actualizado : x))),
      error: () => this.error.set('No se pudo actualizar el producto'),
    });
  }

  eliminar(p: Producto): void {
    if (!confirm(`¿Eliminar "${p.nombre}"? Esto también borra sus fotos y no se puede deshacer.`)) return;
    this.productosService.eliminar(p._id).subscribe({
      next: () => this.productos.update((l) => l.filter((x) => x._id !== p._id)),
      error: () => this.error.set('No se pudo eliminar el producto'),
    });
  }
}
