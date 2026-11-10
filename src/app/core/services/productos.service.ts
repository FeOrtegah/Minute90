import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Filtros, Imagen, Producto, ProductoForm } from '../models';
import { environment } from '../../../environments/environment';

export interface FiltroCatalogo {
  buscar?: string;
  equipo?: string;
  liga?: string;
  tipo?: string;
  talla?: string;
  destacado?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProductosService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/productos`;

  listar(filtro: FiltroCatalogo = {}) {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtro)) {
      if (valor !== undefined && valor !== '' && valor !== false) params = params.set(clave, String(valor));
    }
    return this.http.get<Producto[]>(this.url, { params });
  }

  filtros() {
    return this.http.get<Filtros>(`${this.url}/filtros`);
  }

  obtener(id: string) {
    return this.http.get<Producto>(`${this.url}/${id}`);
  }

  /* ---------- admin ---------- */

  listarAdmin() {
    return this.http.get<Producto[]>(`${this.url}/admin/todos`);
  }

  obtenerAdmin(id: string) {
    return this.http.get<Producto>(`${this.url}/admin/${id}`);
  }

  crear(datos: ProductoForm) {
    return this.http.post<Producto>(this.url, datos);
  }

  actualizar(id: string, datos: Partial<ProductoForm>) {
    return this.http.put<Producto>(`${this.url}/${id}`, datos);
  }

  eliminar(id: string) {
    return this.http.delete<{ mensaje: string }>(`${this.url}/${id}`);
  }

  /** Pide al backend un nombre de carpeta libre para un producto nuevo */
  reservarCarpeta(nombre: string) {
    return this.http.post<{ carpeta: string }>(`${environment.apiUrl}/upload/carpeta`, { nombre });
  }

  subirImagenes(archivos: File[], carpeta: string) {
    const fd = new FormData();
    fd.append('carpeta', carpeta); // va antes de las fotos para que el backend lo lea primero
    archivos.forEach((a) => fd.append('imagenes', a));
    return this.http.post<Imagen[]>(`${environment.apiUrl}/upload`, fd);
  }

  /** Borra fotos subidas que nunca se guardaron (y la carpeta si quedó vacía) */
  eliminarImagenes(publicIds: string[], carpeta?: string) {
    return this.http.post<{ mensaje: string }>(`${environment.apiUrl}/upload/eliminar`, { publicIds, carpeta });
  }
}