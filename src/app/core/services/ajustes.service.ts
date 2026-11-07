import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { Ajustes } from '../models';
import { environment } from '../../../environments/environment';

const VACIO: Ajustes = {
  whatsapp: '',
  instagram: '',
  puntosEncuentro: [],
  zonasEnvio: [],
  datosTransferencia: '',
};

@Injectable({ providedIn: 'root' })
export class AjustesService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/ajustes`;

  private readonly _ajustes = signal<Ajustes>(VACIO);
  readonly ajustes = this._ajustes.asReadonly();
  readonly cargado = signal(false);

  cargar(): void {
    this.http.get<Ajustes>(this.url).subscribe({
      next: (a) => {
        this._ajustes.set({ ...VACIO, ...a });
        this.cargado.set(true);
      },
      error: () => this.cargado.set(true),
    });
  }

  guardar(datos: Ajustes) {
    return this.http.put<Ajustes>(this.url, datos).pipe(tap((a) => this._ajustes.set({ ...VACIO, ...a })));
  }
}
