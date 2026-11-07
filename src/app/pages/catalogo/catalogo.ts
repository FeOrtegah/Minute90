import { Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { ProductosService } from '../../core/services/productos.service';
import { Producto, TIPOS, precioFinal } from '../../core/models';
import { ProductoCard } from '../../shared/producto-card';

type Orden = 'recientes' | 'menor' | 'mayor';

@Component({
  selector: 'app-catalogo',
  imports: [ProductoCard],
  templateUrl: './catalogo.html',
})
export class Catalogo {
  private productosService = inject(ProductosService);
  private router = inject(Router);

  // Vienen de la URL: /catalogo?liga=Chile&talla=M ...
  buscar = input<string>();
  equipo = input<string>();
  liga = input<string>();
  tipo = input<string>();
  talla = input<string>();

  tipos = TIPOS;
  orden = signal<Orden>('recientes');
  filtrosAbiertos = signal(false);

  filtrosDisponibles = toSignal(this.productosService.filtros(), {
    initialValue: { equipos: [], ligas: [], tallas: [] },
  });

  private filtroActual = computed(() => ({
    buscar: this.buscar(),
    equipo: this.equipo(),
    liga: this.liga(),
    tipo: this.tipo(),
    talla: this.talla(),
  }));

  private resultado = toSignal(
    toObservable(this.filtroActual).pipe(
      switchMap((f) =>
        this.productosService.listar(f).pipe(
          map((productos) => ({ estado: 'ok' as const, productos })),
          catchError(() => of({ estado: 'error' as const, productos: [] as Producto[] })),
          startWith({ estado: 'cargando' as const, productos: [] as Producto[] })
        )
      )
    ),
    { initialValue: { estado: 'cargando' as const, productos: [] as Producto[] } }
  );

  estado = computed(() => this.resultado().estado);

  productos = computed(() => {
    const lista = [...this.resultado().productos];
    if (this.orden() === 'menor') lista.sort((a, b) => precioFinal(a) - precioFinal(b));
    if (this.orden() === 'mayor') lista.sort((a, b) => precioFinal(b) - precioFinal(a));
    return lista;
  });

  hayFiltros = computed(() => Object.values(this.filtroActual()).some(Boolean));

  private timerBusqueda?: ReturnType<typeof setTimeout>;

  aplicar(cambios: Record<string, string | null>): void {
    const queryParams: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(cambios)) queryParams[k] = v ? v : null;
    this.router.navigate(['/catalogo'], { queryParams, queryParamsHandling: 'merge', replaceUrl: true });
  }

  buscarTexto(texto: string): void {
    clearTimeout(this.timerBusqueda);
    this.timerBusqueda = setTimeout(() => this.aplicar({ buscar: texto.trim() }), 350);
  }

  limpiar(): void {
    this.router.navigate(['/catalogo']);
  }

  cambiarOrden(valor: string): void {
    this.orden.set(valor as Orden);
  }
}
