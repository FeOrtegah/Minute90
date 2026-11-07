import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap, tap } from 'rxjs';
import { ProductosService } from '../../core/services/productos.service';
import { CarritoService } from '../../core/services/carrito.service';
import { Producto, precioFinal } from '../../core/models';
import { ClpPipe } from '../../shared/clp.pipe';

type Estado = { estado: 'cargando' | 'ok' | 'error'; producto: Producto | null };

@Component({
  selector: 'app-producto',
  imports: [RouterLink, ClpPipe],
  templateUrl: './producto.html',
})
export class ProductoDetalle {
  private productosService = inject(ProductosService);
  private carrito = inject(CarritoService);
  private title = inject(Title);

  id = input.required<string>();

  private resultado = toSignal(
    toObservable(this.id).pipe(
      tap(() => {
        this.tallaElegida.set(null);
        this.imagenActual.set(0);
        this.cantidad.set(1);
      }),
      switchMap((id) =>
        this.productosService.obtener(id).pipe(
          tap((p) => this.title.setTitle(`${p.nombre} | Minute 90`)),
          map((producto): Estado => ({ estado: 'ok', producto })),
          catchError(() => of<Estado>({ estado: 'error', producto: null })),
          startWith<Estado>({ estado: 'cargando', producto: null })
        )
      )
    ),
    { initialValue: { estado: 'cargando', producto: null } as Estado }
  );

  estado = computed(() => this.resultado().estado);
  producto = computed(() => this.resultado().producto);

  imagenActual = signal(0);
  tallaElegida = signal<string | null>(null);
  cantidad = signal(1);
  mensaje = signal<string | null>(null);

  precio = computed(() => (this.producto() ? precioFinal(this.producto()!) : 0));
  enOferta = computed(() => !!this.producto() && this.precio() < this.producto()!.precio);

  stockTalla = computed(() => {
    const t = this.tallaElegida();
    return this.producto()?.tallas.find((x) => x.talla === t)?.stock ?? 0;
  });

  elegirTalla(talla: string, stock: number): void {
    if (stock === 0) return;
    this.tallaElegida.set(talla);
    this.cantidad.set(1);
    this.mensaje.set(null);
  }

  cambiarCantidad(delta: number): void {
    const nueva = this.cantidad() + delta;
    if (nueva >= 1 && nueva <= this.stockTalla()) this.cantidad.set(nueva);
  }

  agregar(): void {
    const p = this.producto();
    const talla = this.tallaElegida();
    if (!p) return;
    if (!talla) {
      this.mensaje.set('Elige una talla');
      return;
    }
    const ok = this.carrito.agregar(p, talla, this.cantidad());
    this.mensaje.set(ok ? null : 'No hay más stock de esa talla (revisa tu carrito)');
  }
}
