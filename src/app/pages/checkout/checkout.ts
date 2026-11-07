import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CarritoService } from '../../core/services/carrito.service';
import { AjustesService } from '../../core/services/ajustes.service';
import { ItemCarrito } from '../../core/models';
import { ClpPipe, formatoCLP } from '../../shared/clp.pipe';

type Entrega = 'envio' | 'encuentro';
type Pago = 'transferencia' | 'efectivo';

interface DatosCheckout {
  nombre: string;
  telefono: string;
  entrega: Entrega;
  zona: string;
  direccion: string;
  referencia: string;
  punto: string;
  horario: string;
  pago: Pago;
  notas: string;
}

@Component({
  selector: 'app-checkout',
  imports: [RouterLink, ClpPipe],
  templateUrl: './checkout.html',
})
export class Checkout {
  protected carrito = inject(CarritoService);
  protected ajustes = inject(AjustesService).ajustes;

  datos = signal<DatosCheckout>({
    nombre: '',
    telefono: '',
    entrega: 'envio',
    zona: '',
    direccion: '',
    referencia: '',
    punto: '',
    horario: '',
    pago: 'transferencia',
    notas: '',
  });

  intentoEnviar = signal(false);
  enviado = signal<{ url: string; items: ItemCarrito[]; total: number } | null>(null);

  costoEnvio = computed<number | null>(() => {
    const d = this.datos();
    if (d.entrega === 'encuentro') return 0;
    const zona = this.ajustes().zonasEnvio.find((z) => z.nombre === d.zona);
    return zona ? zona.costo : null; // null = se coordina por WhatsApp
  });

  total = computed(() => this.carrito.subtotal() + (this.costoEnvio() ?? 0));

  errores = computed(() => {
    const d = this.datos();
    const e: Partial<Record<keyof DatosCheckout, string>> = {};
    if (d.nombre.trim().length < 2) e.nombre = 'Ingresa tu nombre';
    if (d.telefono.replace(/\D/g, '').length < 8) e.telefono = 'Ingresa un teléfono válido';
    if (d.entrega === 'envio') {
      if (!d.zona.trim()) e.zona = 'Indica tu comuna';
      if (d.direccion.trim().length < 4) e.direccion = 'Ingresa tu dirección';
    } else if (this.ajustes().puntosEncuentro.length && !d.punto) {
      e.punto = 'Elige un punto de encuentro';
    }
    return e;
  });

  valido = computed(() => Object.keys(this.errores()).length === 0);

  set<K extends keyof DatosCheckout>(campo: K, valor: DatosCheckout[K]): void {
    this.datos.update((d) => ({ ...d, [campo]: valor }));
  }

  error(campo: keyof DatosCheckout): string | null {
    return this.intentoEnviar() ? (this.errores()[campo] ?? null) : null;
  }

  enviar(): void {
    this.intentoEnviar.set(true);
    if (!this.valido() || this.carrito.items().length === 0) return;

    const numero = this.ajustes().whatsapp;
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(this.armarMensaje())}`;

    this.enviado.set({ url, items: this.carrito.items(), total: this.total() });
    this.carrito.vaciar();
    window.open(url, '_blank', 'noopener');
  }

  private armarMensaje(): string {
    const d = this.datos();
    const envio = this.costoEnvio();
    const lineas: string[] = [];

    lineas.push('*NUEVO PEDIDO - MINUTE 90*', '');
    lineas.push('*Productos:*');
    for (const i of this.carrito.items()) {
      lineas.push(`• ${i.cantidad}x ${i.nombre} (Talla ${i.talla}) - ${formatoCLP(i.precio * i.cantidad)}`);
    }
    lineas.push('');
    lineas.push(`Subtotal: ${formatoCLP(this.carrito.subtotal())}`);
    if (d.entrega === 'envio') {
      lineas.push(`Envío: ${envio === null ? 'a coordinar' : formatoCLP(envio)}`);
    }
    lineas.push(`*Total: ${formatoCLP(this.total())}*${envio === null ? ' + envío' : ''}`);
    lineas.push('');

    lineas.push('*Cliente:*');
    lineas.push(`Nombre: ${d.nombre.trim()}`);
    lineas.push(`Teléfono: ${d.telefono.trim()}`);
    lineas.push('');

    if (d.entrega === 'envio') {
      lineas.push('*Entrega: Envío a domicilio*');
      lineas.push(`Comuna: ${d.zona.trim()}`);
      lineas.push(`Dirección: ${d.direccion.trim()}`);
      if (d.referencia.trim()) lineas.push(`Referencia: ${d.referencia.trim()}`);
    } else {
      lineas.push('*Entrega: Punto de encuentro*');
      lineas.push(`Lugar: ${d.punto || 'a coordinar'}`);
      if (d.horario.trim()) lineas.push(`Horario preferido: ${d.horario.trim()}`);
    }
    lineas.push('');

    lineas.push(`*Pago:* ${d.pago === 'transferencia' ? 'Transferencia' : 'Efectivo'}`);
    if (d.notas.trim()) lineas.push('', `*Notas:* ${d.notas.trim()}`);

    return lineas.join('\n');
  }
}
