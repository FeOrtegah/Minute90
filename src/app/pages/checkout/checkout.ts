import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CarritoService } from '../../core/services/carrito.service';
import { AjustesService } from '../../core/services/ajustes.service';
import { ItemCarrito } from '../../core/models';
import { ClpPipe, formatoCLP } from '../../shared/clp.pipe';

type Entrega = 'envio' | 'encuentro';
type Pago = 'transferencia' | 'efectivo';

export const REGIONES = [
  'Arica y Parinacota',
  'Tarapacá',
  'Antofagasta',
  'Atacama',
  'Coquimbo',
  'Valparaíso',
  'Metropolitana',
  "O'Higgins",
  'Maule',
  'Ñuble',
  'Biobío',
  'La Araucanía',
  'Los Ríos',
  'Los Lagos',
  'Aysén',
  'Magallanes',
];

interface DatosCheckout {
  nombre: string;
  telefono: string;
  entrega: Entrega;
  rut: string;
  region: string;
  comuna: string;
  direccion: string;
  referencia: string;
  punto: string;
  horario: string;
  pago: Pago;
  notas: string;
}

// Valida RUT chileno con dígito verificador (acepta 12.345.678-9, 12345678-9 o 123456789)
function rutValido(rut: string): boolean {
  const limpio = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (limpio.length < 8) return false;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  let suma = 0;
  let multiplo = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }
  const resto = 11 - (suma % 11);
  const esperado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
  return dv === esperado;
}

// 123456789 -> 12.345.678-9
function formatearRut(rut: string): string {
  const limpio = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (limpio.length < 2) return limpio;
  const cuerpo = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cuerpo}-${limpio.slice(-1)}`;
}

@Component({
  selector: 'app-checkout',
  imports: [RouterLink, ClpPipe],
  templateUrl: './checkout.html',
})
export class Checkout {
  protected carrito = inject(CarritoService);
  protected ajustes = inject(AjustesService).ajustes;
  protected regiones = REGIONES;

  datos = signal<DatosCheckout>({
    nombre: '',
    telefono: '',
    entrega: 'envio',
    rut: '',
    region: '',
    comuna: '',
    direccion: '',
    referencia: '',
    punto: '',
    horario: '',
    pago: 'transferencia',
    notas: '',
  });

  intentoEnviar = signal(false);
  enviado = signal<{ url: string; items: ItemCarrito[]; total: number } | null>(null);

  // El envío es por pagar: no se suma al total
  total = computed(() => this.carrito.subtotal());

  errores = computed(() => {
    const d = this.datos();
    const e: Partial<Record<keyof DatosCheckout, string>> = {};
    if (d.nombre.trim().length < 2) e.nombre = 'Ingresa tu nombre';
    if (d.telefono.replace(/\D/g, '').length < 8) e.telefono = 'Ingresa un teléfono válido';
    if (d.entrega === 'envio') {
      if (!rutValido(d.rut)) e.rut = 'Ingresa un RUT válido (lo pide la empresa de envío)';
      if (!d.region) e.region = 'Elige tu región';
      if (d.comuna.trim().length < 3) e.comuna = 'Ingresa tu comuna';
      if (d.direccion.trim().length < 4) e.direccion = 'Ingresa tu dirección';
    } else if (this.ajustes().puntosEncuentro.length && !d.punto) {
      e.punto = 'Elige un punto de encuentro';
    }
    if (d.entrega === 'envio' && d.pago === 'efectivo') e.pago = 'Con envío solo se puede pagar por transferencia';
    return e;
  });

  valido = computed(() => Object.keys(this.errores()).length === 0);

  // Con envío por pagar no se puede pagar en efectivo (nadie de la tienda entrega en persona)
  efectivoDisponible = computed(() => this.datos().entrega === 'encuentro');

  set<K extends keyof DatosCheckout>(campo: K, valor: DatosCheckout[K]): void {
    this.datos.update((d) => {
      const nuevo = { ...d, [campo]: valor };
      if (nuevo.entrega === 'envio') nuevo.pago = 'transferencia';
      return nuevo;
    });
  }

  setRut(valor: string): void {
    this.set('rut', formatearRut(valor));
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
    const lineas: string[] = [];

    lineas.push('*NUEVO PEDIDO - MINUTE 90*', '');
    lineas.push('*Productos:*');
    for (const i of this.carrito.items()) {
      lineas.push(`• ${i.cantidad}x ${i.nombre} (Talla ${i.talla}) - ${formatoCLP(i.precio * i.cantidad)}`);
    }
    lineas.push('');
    lineas.push(`*Total productos: ${formatoCLP(this.total())}*`);
    if (d.entrega === 'envio') lineas.push('Envío: por pagar');
    lineas.push('');

    lineas.push('*Cliente:*');
    lineas.push(`Nombre: ${d.nombre.trim()}`);
    lineas.push(`Teléfono: ${d.telefono.trim()}`);
    if (d.entrega === 'envio') lineas.push(`RUT: ${d.rut}`);
    lineas.push('');

    if (d.entrega === 'envio') {
      lineas.push('*Entrega: Envío por pagar*');
      lineas.push(`Región: ${d.region}`);
      lineas.push(`Comuna: ${d.comuna.trim()}`);
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