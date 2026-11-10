import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ProductosService } from '../../../core/services/productos.service';
import { Producto, precioFinal, stockTotal } from '../../../core/models';
import { ClpPipe } from '../../../shared/clp.pipe';

interface AvisoStock {
  texto: string;
  deshacer?: () => void;
}

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
  soloSinStock = signal(false);

  aviso = signal<AvisoStock | null>(null);
  private timerAviso?: ReturnType<typeof setTimeout>;
  // Evita doble clic mientras se guarda: "idProducto-talla"
  ocupado = signal<string | null>(null);

  filtrados = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    let lista = this.productos();
    if (q) lista = lista.filter((p) => `${p.nombre} ${p.equipo} ${p.liga}`.toLowerCase().includes(q));
    if (this.soloSinStock()) lista = lista.filter((p) => p.tallas.some((t) => t.stock === 0));
    return lista;
  });

  totalUnidades = computed(() => this.productos().reduce((acc, p) => acc + stockTotal(p), 0));

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

  private reemplazar(actualizado: Producto): void {
    this.productos.update((l) => l.map((x) => (x._id === actualizado._id ? actualizado : x)));
  }

  /** delta -1 = vendí 1, +1 = llegó 1 más */
  ajustarStock(p: Producto, talla: string, delta: number, conDeshacer = true): void {
    const clave = `${p._id}-${talla}`;
    if (this.ocupado() === clave) return;
    this.ocupado.set(clave);

    this.productosService.ajustarStock(p._id, talla, delta).subscribe({
      next: (actualizado) => {
        this.reemplazar(actualizado);
        this.ocupado.set(null);
        const quedan = actualizado.tallas.find((t) => t.talla === talla)?.stock ?? 0;
        const accion = delta < 0 ? `Vendida 1 talla ${talla}` : `+1 talla ${talla}`;
        this.mostrarAviso({
          texto: `${accion} · ${p.nombre} (quedan ${quedan})`,
          deshacer: conDeshacer ? () => this.ajustarStock(actualizado, talla, -delta, false) : undefined,
        });
      },
      error: (err: HttpErrorResponse) => {
        this.ocupado.set(null);
        this.mostrarAviso({ texto: err.error?.mensaje ?? 'No se pudo actualizar el stock' });
      },
    });
  }

  private mostrarAviso(aviso: AvisoStock): void {
    this.aviso.set(aviso);
    clearTimeout(this.timerAviso);
    this.timerAviso = setTimeout(() => this.aviso.set(null), 6000);
  }

  deshacer(): void {
    const accion = this.aviso()?.deshacer;
    this.aviso.set(null);
    accion?.();
  }

  alternar(p: Producto, campo: 'activo' | 'destacado'): void {
    const valor = !p[campo];
    this.productosService.actualizar(p._id, { [campo]: valor }).subscribe({
      next: (actualizado) => this.reemplazar(actualizado),
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