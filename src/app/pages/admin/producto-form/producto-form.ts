import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { ProductosService } from '../../../core/services/productos.service';
import { Imagen, Producto, ProductoForm, TALLAS, TIPOS, TipoCamiseta } from '../../../core/models';
import { comprimirImagen } from '../../../shared/comprimir-imagen';
import { formatoCLP } from '../../../shared/clp.pipe';

const MAX_FOTOS = 8;
const CARPETA_BASE = 'minute90/productos';

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
  carpeta: '',
  destacado: false,
  activo: true,
};

const NOMBRE_TIPO: Record<TipoCamiseta, string> = {
  local: 'Local',
  visita: 'Visita',
  tercera: 'Tercera',
  retro: 'Retro',
  entrenamiento: 'Entrenamiento',
  otro: '',
};

// Atajos para marcar tallas de un clic
const PRESETS_TALLAS = [
  { nombre: 'Adulto S – XL', tallas: ['S', 'M', 'L', 'XL'] },
  { nombre: 'Adulto XS – XXL', tallas: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
  { nombre: 'Niño 6 – 14', tallas: ['6', '8', '10', '12', '14'] },
];

// "Colo-Colo Local 2025" -> "colo-colo-local-2025" (igual que en el backend)
function slug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

@Component({
  selector: 'app-producto-form',
  templateUrl: './producto-form.html',
})
export class ProductoFormPage implements OnInit {
  private productosService = inject(ProductosService);
  private router = inject(Router);

  id = input<string>(); // /admin/editar/:id
  desde = input<string>(); // /admin/nuevo?desde=ID  -> duplicar un producto

  tallasDisponibles = TALLAS;
  tipos = TIPOS;
  presets = PRESETS_TALLAS;
  maxFotos = MAX_FOTOS;
  filtros = toSignal(this.productosService.filtros(), { initialValue: { equipos: [], ligas: [], tallas: [] } });

  form = signal<ProductoForm>(structuredClone(VACIO));
  cargando = signal(false);
  guardando = signal(false);
  subiendo = signal(false);
  progreso = signal<string | null>(null);
  arrastrando = signal(false);
  error = signal<string | null>(null);
  aviso = signal<string | null>(null);

  // El nombre se arma solo (equipo + tipo + temporada) hasta que el admin lo escriba a mano
  private nombreManual = signal(false);
  // Nombre de la carpeta: sale del nombre del producto hasta que el admin lo cambie
  private carpetaManual = signal<string | null>(null);
  // Fotos subidas en esta sesión que todavía no están guardadas en el producto
  private subidasNuevas = new Set<string>();

  esEdicion = computed(() => !!this.id());

  /** Carpeta definitiva (ya reservada) o la que se va a crear al subir la primera foto */
  carpetaVista = computed(() => {
    const reservada = this.form().carpeta;
    if (reservada) return reservada;
    const nombre = this.carpetaManual() ?? this.form().nombre;
    const limpio = slug(nombre);
    return limpio ? `${CARPETA_BASE}/${limpio}` : '';
  });

  carpetaNombre = computed(() => this.carpetaVista().replace(`${CARPETA_BASE}/`, ''));
  carpetaBloqueada = computed(() => !!this.form().carpeta);
  puedeSubir = computed(() => !!this.carpetaVista() && this.form().imagenes.length < MAX_FOTOS && !this.subiendo());

  stockTotal = computed(() => this.form().tallas.reduce((acc, t) => acc + t.stock, 0));

  ngOnInit(): void {
    const id = this.id() ?? this.desde();
    if (!id) return;

    this.cargando.set(true);
    this.productosService.obtenerAdmin(id).subscribe({
      next: (p) => {
        this.form.set(this.esEdicion() ? this.aFormulario(p) : this.copiaSinFotos(p));
        this.nombreManual.set(true);
        this.cargando.set(false);
      },
      error: () => this.router.navigate(['/admin']),
    });
  }

  private aFormulario(p: Producto): ProductoForm {
    const { _id, createdAt, ...datos } = p;
    return { ...structuredClone(VACIO), ...structuredClone(datos) };
  }

  private copiaSinFotos(p: Producto): ProductoForm {
    return { ...this.aFormulario(p), nombre: `${p.nombre} (copia)`, imagenes: [], carpeta: '', destacado: false };
  }

  /* ---------------- campos ---------------- */

  set<K extends keyof ProductoForm>(campo: K, valor: ProductoForm[K]): void {
    this.form.update((f) => ({ ...f, [campo]: valor }));
    if (campo === 'equipo' || campo === 'tipo' || campo === 'temporada') this.autoNombre();
  }

  setNombre(valor: string): void {
    this.nombreManual.set(valor.trim().length > 0);
    this.set('nombre', valor);
    if (!valor.trim()) this.autoNombre();
  }

  setTipo(valor: string): void {
    this.set('tipo', valor as TipoCamiseta);
  }

  setCarpeta(valor: string): void {
    this.carpetaManual.set(valor.trim() ? valor : null);
  }

  private autoNombre(): void {
    if (this.nombreManual()) return;
    const f = this.form();
    const nombre = [f.equipo.trim(), NOMBRE_TIPO[f.tipo], f.temporada.trim()].filter(Boolean).join(' ');
    this.form.update((x) => ({ ...x, nombre }));
  }

  numero(valor: string): number {
    const n = Number(String(valor).replace(/\D/g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  /** 29990 -> "29.990" para mostrar en los inputs de precio */
  miles(valor: number | null): string {
    return valor ? valor.toLocaleString('es-CL') : '';
  }

  clp = formatoCLP;

  /* ---------------- tallas ---------------- */

  stockDe(talla: string): number | null {
    return this.form().tallas.find((t) => t.talla === talla)?.stock ?? null;
  }

  private ordenar<T extends { talla: string }>(lista: T[]): T[] {
    return lista.sort((a, b) => TALLAS.indexOf(a.talla as never) - TALLAS.indexOf(b.talla as never));
  }

  alternarTalla(talla: string): void {
    const existe = this.stockDe(talla) !== null;
    const tallas = existe
      ? this.form().tallas.filter((t) => t.talla !== talla)
      : [...this.form().tallas, { talla, stock: 1 }];
    this.form.update((f) => ({ ...f, tallas: this.ordenar(tallas) }));
  }

  aplicarPreset(tallas: string[]): void {
    const actuales = new Map(this.form().tallas.map((t) => [t.talla, t.stock]));
    const nuevas = tallas.map((talla) => ({ talla, stock: actuales.get(talla) ?? 1 }));
    this.form.update((f) => ({ ...f, tallas: this.ordenar(nuevas) }));
  }

  stockParaTodas(valor: string): void {
    const stock = this.numero(valor);
    this.form.update((f) => ({ ...f, tallas: f.tallas.map((t) => ({ ...t, stock })) }));
  }

  limpiarTallas(): void {
    this.form.update((f) => ({ ...f, tallas: [] }));
  }

  cambiarStock(talla: string, valor: string): void {
    this.form.update((f) => ({
      ...f,
      tallas: f.tallas.map((t) => (t.talla === talla ? { ...t, stock: this.numero(valor) } : t)),
    }));
  }

  /* ---------------- fotos ---------------- */

  elegirArchivos(input: HTMLInputElement): void {
    const archivos = Array.from(input.files ?? []);
    input.value = '';
    this.subir(archivos);
  }

  soltar(evento: DragEvent): void {
    evento.preventDefault();
    this.arrastrando.set(false);
    const archivos = Array.from(evento.dataTransfer?.files ?? []).filter((f) => f.type.startsWith('image/'));
    this.subir(archivos);
  }

  arrastrar(evento: DragEvent, encima: boolean): void {
    evento.preventDefault();
    this.arrastrando.set(encima);
  }

  async subir(archivos: File[]): Promise<void> {
    if (!archivos.length || this.subiendo()) return;
    if (!this.carpetaVista()) {
      this.error.set('Escribe primero el nombre del producto: con él se crea su carpeta de fotos');
      return;
    }
    const espacio = MAX_FOTOS - this.form().imagenes.length;
    if (espacio <= 0) {
      this.error.set(`Máximo ${MAX_FOTOS} fotos por producto`);
      return;
    }
    const seleccion = archivos.slice(0, espacio);
    if (archivos.length > espacio) this.aviso.set(`Solo se subirán ${espacio} fotos (máximo ${MAX_FOTOS} por producto)`);

    this.subiendo.set(true);
    this.error.set(null);

    try {
      // La carpeta se crea con la primera foto y queda fija para este producto
      if (!this.form().carpeta) {
        this.progreso.set('Creando carpeta...');
        const { carpeta } = await firstValueFrom(this.productosService.reservarCarpeta(this.carpetaNombre()));
        this.form.update((f) => ({ ...f, carpeta }));
      }

      // Se comprimen y suben de a una (Vercel no acepta peticiones de más de 4.5 MB)
      for (const [i, original] of seleccion.entries()) {
        this.progreso.set(`Subiendo ${i + 1} de ${seleccion.length}...`);
        try {
          const archivo = await comprimirImagen(original);
          if (archivo.size > 4 * 1024 * 1024) {
            this.error.set(`"${original.name}" es demasiado pesada (máx. 4 MB)`);
            continue;
          }
          const [nueva] = await firstValueFrom(this.productosService.subirImagenes([archivo], this.form().carpeta));
          this.subidasNuevas.add(nueva.publicId);
          this.form.update((f) => ({ ...f, imagenes: [...f.imagenes, nueva] }));
        } catch (err) {
          const mensaje = (err as HttpErrorResponse).error?.mensaje;
          this.error.set(mensaje ?? `Error subiendo "${original.name}"`);
        }
      }
    } catch (err) {
      this.error.set((err as HttpErrorResponse).error?.mensaje ?? 'No se pudo crear la carpeta');
    }

    this.progreso.set(null);
    this.subiendo.set(false);
  }

  quitarImagen(img: Imagen): void {
    this.form.update((f) => ({ ...f, imagenes: f.imagenes.filter((x) => x.publicId !== img.publicId) }));
    // Si la foto todavía no estaba guardada, se borra altiro de Cloudinary.
    // Si ya era parte del producto, se borra cuando se guarden los cambios.
    if (this.subidasNuevas.delete(img.publicId)) {
      this.productosService.eliminarImagenes([img.publicId]).subscribe();
    }
  }

  mover(i: number, delta: number): void {
    const imgs = [...this.form().imagenes];
    const j = i + delta;
    if (j < 0 || j >= imgs.length) return;
    [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
    this.form.update((f) => ({ ...f, imagenes: imgs }));
  }

  hacerPrincipal(i: number): void {
    const imgs = [...this.form().imagenes];
    const [img] = imgs.splice(i, 1);
    this.form.update((f) => ({ ...f, imagenes: [img, ...imgs] }));
  }

  /* ---------------- guardar / cancelar ---------------- */

  private validar(): string | null {
    const f = this.form();
    if (!f.equipo.trim()) return 'Falta el equipo o selección';
    if (!f.nombre.trim()) return 'Falta el nombre';
    if (!f.precio || f.precio <= 0) return 'Ingresa un precio válido';
    if (f.precioOferta && f.precioOferta >= f.precio) return 'El precio oferta debe ser menor al precio normal';
    if (!f.tallas.length) return 'Marca al menos una talla';
    if (!f.imagenes.length) return 'Sube al menos una foto';
    return null;
  }

  guardar(crearOtro = false): void {
    const problema = this.validar();
    if (problema) {
      this.error.set(problema);
      return;
    }
    if (this.subiendo()) return;

    const f = this.form();
    const datos: ProductoForm = {
      ...f,
      nombre: f.nombre.trim(),
      equipo: f.equipo.trim(),
      liga: f.liga.trim(),
      temporada: f.temporada.trim(),
      descripcion: f.descripcion.trim(),
      precioOferta: f.precioOferta || null,
    };

    this.guardando.set(true);
    this.error.set(null);
    const id = this.id();
    const peticion = id ? this.productosService.actualizar(id, datos) : this.productosService.crear(datos);

    peticion.subscribe({
      next: (guardado) => {
        this.subidasNuevas.clear();
        this.guardando.set(false);
        if (crearOtro) this.siguienteProducto(guardado);
        else this.router.navigate(['/admin']);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.detalle ?? err.error?.mensaje ?? 'No se pudo guardar');
        this.guardando.set(false);
      },
    });
  }

  /** Deja el formulario listo para otra camiseta del mismo equipo/liga/precio */
  private siguienteProducto(anterior: Producto): void {
    this.form.set({
      ...structuredClone(VACIO),
      equipo: anterior.equipo,
      liga: anterior.liga,
      temporada: anterior.temporada,
      precio: anterior.precio,
      tallas: anterior.tallas.map((t) => ({ ...t })),
    });
    this.nombreManual.set(false);
    this.carpetaManual.set(null);
    this.autoNombre();
    this.aviso.set(`"${anterior.nombre}" guardada. Sigue con la próxima.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelar(): void {
    const pendientes = [...this.subidasNuevas];
    if (pendientes.length) {
      if (!confirm('Hay fotos subidas sin guardar. ¿Salir y descartarlas?')) return;
      // En un producto nuevo también se borra su carpeta (queda vacía)
      const carpeta = this.esEdicion() ? undefined : this.form().carpeta;
      this.productosService.eliminarImagenes(pendientes, carpeta).subscribe();
    }
    this.subidasNuevas.clear();
    this.router.navigate(['/admin']);
  }
}