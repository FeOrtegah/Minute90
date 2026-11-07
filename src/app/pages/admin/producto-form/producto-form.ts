import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProductosService } from '../../../core/services/productos.service';
import { ProductoForm, TALLAS, TIPOS, TipoCamiseta } from '../../../core/models';

const VACIO: ProductoForm = {
  nombre: '',
  equipo: '',
  liga: '',
  temporada: '',
  tipo: 'local',
  descripcion: '',
  precio: 0,
  precioOferta: null,
  tallas: [],
  imagenes: [],
  destacado: false,
  activo: true,
};

@Component({
  selector: 'app-producto-form',
  imports: [RouterLink],
  templateUrl: './producto-form.html',
})
export class ProductoFormPage implements OnInit {
  private productosService = inject(ProductosService);
  private router = inject(Router);

  id = input<string>(); // viene de /admin/editar/:id

  tallasDisponibles = TALLAS;
  tipos = TIPOS;
  filtros = toSignal(this.productosService.filtros(), { initialValue: { equipos: [], ligas: [], tallas: [] } });

  form = signal<ProductoForm>(structuredClone(VACIO));
  cargando = signal(false);
  guardando = signal(false);
  subiendo = signal(false);
  error = signal<string | null>(null);

  esEdicion = computed(() => !!this.id());

  ngOnInit(): void {
    const id = this.id();
    if (!id) return;
    this.cargando.set(true);
    this.productosService.listarAdmin().subscribe({
      next: (lista) => {
        const p = lista.find((x) => x._id === id);
        if (!p) {
          this.router.navigate(['/admin']);
          return;
        }
        const { _id, createdAt, ...datos } = p;
        this.form.set({ ...structuredClone(VACIO), ...structuredClone(datos) });
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el producto');
        this.cargando.set(false);
      },
    });
  }

  set<K extends keyof ProductoForm>(campo: K, valor: ProductoForm[K]): void {
    this.form.update((f) => ({ ...f, [campo]: valor }));
  }

  setTipo(valor: string): void {
    this.set('tipo', valor as TipoCamiseta);
  }

  numero(valor: string): number {
    const n = Number(String(valor).replace(/\D/g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  /* ---------- tallas ---------- */

  stockDe(talla: string): number | null {
    return this.form().tallas.find((t) => t.talla === talla)?.stock ?? null;
  }

  alternarTalla(talla: string): void {
    const existe = this.stockDe(talla) !== null;
    const tallas = existe
      ? this.form().tallas.filter((t) => t.talla !== talla)
      : [...this.form().tallas, { talla, stock: 1 }];
    // Mantiene el orden XS, S, M...
    tallas.sort((a, b) => TALLAS.indexOf(a.talla as never) - TALLAS.indexOf(b.talla as never));
    this.set('tallas', tallas);
  }

  cambiarStock(talla: string, valor: string): void {
    this.set(
      'tallas',
      this.form().tallas.map((t) => (t.talla === talla ? { ...t, stock: this.numero(valor) } : t))
    );
  }

  /* ---------- imágenes ---------- */

  subir(input: HTMLInputElement): void {
    const archivos = Array.from(input.files ?? []);
    input.value = '';
    if (!archivos.length) return;

    const espacio = 8 - this.form().imagenes.length;
    if (espacio <= 0) {
      this.error.set('Máximo 8 fotos por producto');
      return;
    }
    const seleccion = archivos.slice(0, Math.min(espacio, 6));
    const pesadas = seleccion.filter((a) => a.size > 5 * 1024 * 1024);
    if (pesadas.length) {
      this.error.set('Cada foto debe pesar menos de 5 MB');
      return;
    }

    this.subiendo.set(true);
    this.error.set(null);
    this.productosService.subirImagenes(seleccion).subscribe({
      next: (nuevas) => {
        this.set('imagenes', [...this.form().imagenes, ...nuevas]);
        this.subiendo.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.mensaje ?? 'Error subiendo las fotos');
        this.subiendo.set(false);
      },
    });
  }

  quitarImagen(i: number): void {
    this.set('imagenes', this.form().imagenes.filter((_, idx) => idx !== i));
  }

  hacerPrincipal(i: number): void {
    const imgs = [...this.form().imagenes];
    const [img] = imgs.splice(i, 1);
    this.set('imagenes', [img, ...imgs]);
  }

  /* ---------- guardar ---------- */

  guardar(): void {
    const f = this.form();
    if (!f.nombre.trim() || !f.equipo.trim()) return this.error.set('Nombre y equipo son obligatorios');
    if (!f.precio || f.precio <= 0) return this.error.set('Ingresa un precio válido');
    if (f.precioOferta && f.precioOferta >= f.precio) {
      return this.error.set('El precio oferta debe ser menor al precio normal');
    }
    if (!f.tallas.length) return this.error.set('Agrega al menos una talla');

    const datos: ProductoForm = {
      ...f,
      nombre: f.nombre.trim(),
      equipo: f.equipo.trim(),
      liga: f.liga.trim(),
      temporada: f.temporada.trim(),
      precioOferta: f.precioOferta || null,
    };

    this.guardando.set(true);
    this.error.set(null);
    const id = this.id();
    const peticion = id ? this.productosService.actualizar(id, datos) : this.productosService.crear(datos);
    peticion.subscribe({
      next: () => this.router.navigate(['/admin']),
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.detalle ?? err.error?.mensaje ?? 'No se pudo guardar');
        this.guardando.set(false);
      },
    });
  }
}
