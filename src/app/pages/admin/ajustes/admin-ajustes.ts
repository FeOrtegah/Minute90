import { Component, effect, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AjustesService } from '../../../core/services/ajustes.service';
import { AuthService } from '../../../core/services/auth.service';
import { Ajustes } from '../../../core/models';

@Component({
  selector: 'app-admin-ajustes',
  templateUrl: './admin-ajustes.html',
})
export class AdminAjustes {
  private ajustesService = inject(AjustesService);
  private auth = inject(AuthService);

  form = signal<Ajustes>(structuredClone(this.ajustesService.ajustes()));
  guardando = signal(false);
  mensaje = signal<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  mensajeClave = signal<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  constructor() {
    this.ajustesService.cargar();
    // Cuando llegan los ajustes del servidor, se copian al formulario
    effect(() => {
      if (this.ajustesService.cargado()) this.form.set(structuredClone(this.ajustesService.ajustes()));
    });
  }

  set<K extends keyof Ajustes>(campo: K, valor: Ajustes[K]): void {
    this.form.update((f) => ({ ...f, [campo]: valor }));
  }

  /* puntos de encuentro */
  agregarPunto(input: HTMLInputElement): void {
    const valor = input.value.trim();
    if (!valor) return;
    this.set('puntosEncuentro', [...this.form().puntosEncuentro, valor]);
    input.value = '';
  }

  quitarPunto(i: number): void {
    this.set('puntosEncuentro', this.form().puntosEncuentro.filter((_, idx) => idx !== i));
  }

  /* zonas de envío */
  agregarZona(nombre: HTMLInputElement, costo: HTMLInputElement): void {
    if (!nombre.value.trim()) return;
    const valor = Number(costo.value.replace(/\D/g, '')) || 0;
    this.set('zonasEnvio', [...this.form().zonasEnvio, { nombre: nombre.value.trim(), costo: valor }]);
    nombre.value = '';
    costo.value = '';
  }

  quitarZona(i: number): void {
    this.set('zonasEnvio', this.form().zonasEnvio.filter((_, idx) => idx !== i));
  }

  guardar(): void {
    const numero = this.form().whatsapp.replace(/\D/g, '');
    if (numero && numero.length < 11) {
      this.mensaje.set({ tipo: 'error', texto: 'El WhatsApp debe incluir el código de país. Ej: 56912345678' });
      return;
    }
    this.guardando.set(true);
    this.mensaje.set(null);
    this.ajustesService.guardar({ ...this.form(), whatsapp: numero }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.mensaje.set({ tipo: 'ok', texto: 'Ajustes guardados' });
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.mensaje.set({ tipo: 'error', texto: err.error?.mensaje ?? 'No se pudo guardar' });
      },
    });
  }

  cambiarClave(actual: HTMLInputElement, nueva: HTMLInputElement, repetir: HTMLInputElement): void {
    if (nueva.value.length < 8) {
      this.mensajeClave.set({ tipo: 'error', texto: 'La nueva contraseña debe tener al menos 8 caracteres' });
      return;
    }
    if (nueva.value !== repetir.value) {
      this.mensajeClave.set({ tipo: 'error', texto: 'Las contraseñas nuevas no coinciden' });
      return;
    }
    this.auth.cambiarPassword(actual.value, nueva.value).subscribe({
      next: () => {
        this.mensajeClave.set({ tipo: 'ok', texto: 'Contraseña actualizada' });
        actual.value = nueva.value = repetir.value = '';
      },
      error: (err: HttpErrorResponse) =>
        this.mensajeClave.set({ tipo: 'error', texto: err.error?.mensaje ?? 'No se pudo cambiar la contraseña' }),
    });
  }
}
