import { Injectable, computed, effect, signal } from '@angular/core';
import { ItemCarrito, Producto, precioFinal } from '../models';

const CARRITO_KEY = 'm90_carrito';

@Injectable({ providedIn: 'root' })
export class CarritoService {
  private readonly _items = signal<ItemCarrito[]>(this.leer());
  readonly items = this._items.asReadonly();

  readonly cantidadTotal = computed(() => this._items().reduce((acc, i) => acc + i.cantidad, 0));
  readonly subtotal = computed(() => this._items().reduce((acc, i) => acc + i.precio * i.cantidad, 0));

  // Aviso corto cuando se agrega algo (lo muestra el header)
  readonly aviso = signal<string | null>(null);
  private timerAviso?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(CARRITO_KEY, JSON.stringify(this._items()));
      } catch {
        /* almacenamiento no disponible */
      }
    });
  }

  /** Devuelve false si no hay stock suficiente */
  agregar(producto: Producto, talla: string, cantidad = 1): boolean {
    const stock = producto.tallas.find((t) => t.talla === talla)?.stock ?? 0;
    const existente = this._items().find((i) => i.productoId === producto._id && i.talla === talla);
    const nuevaCantidad = (existente?.cantidad ?? 0) + cantidad;
    if (nuevaCantidad > stock) return false;

    if (existente) {
      this._items.update((items) =>
        items.map((i) => (i === existente ? { ...i, cantidad: nuevaCantidad, stock } : i))
      );
    } else {
      this._items.update((items) => [
        ...items,
        {
          productoId: producto._id,
          nombre: producto.nombre,
          equipo: producto.equipo,
          imagen: producto.imagenes[0]?.url ?? '',
          talla,
          precio: precioFinal(producto),
          cantidad,
          stock,
        },
      ]);
    }
    this.mostrarAviso(`${producto.nombre} (${talla}) agregada al carrito`);
    return true;
  }

  cambiarCantidad(item: ItemCarrito, cantidad: number): void {
    if (cantidad < 1) return this.quitar(item);
    const valor = Math.min(cantidad, item.stock);
    this._items.update((items) => items.map((i) => (i === item ? { ...i, cantidad: valor } : i)));
  }

  quitar(item: ItemCarrito): void {
    this._items.update((items) => items.filter((i) => i !== item));
  }

  vaciar(): void {
    this._items.set([]);
  }

  private mostrarAviso(texto: string): void {
    this.aviso.set(texto);
    clearTimeout(this.timerAviso);
    this.timerAviso = setTimeout(() => this.aviso.set(null), 2500);
  }

  private leer(): ItemCarrito[] {
    try {
      const data = JSON.parse(localStorage.getItem(CARRITO_KEY) || '[]');
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }
}
