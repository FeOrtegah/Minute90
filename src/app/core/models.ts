export const TALLAS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '4', '6', '8', '10', '12', '14', '16'] as const;

export const TIPOS = ['local', 'visita', 'tercera', 'retro', 'entrenamiento', 'otro'] as const;
export type TipoCamiseta = (typeof TIPOS)[number];

export interface TallaStock {
  talla: string;
  stock: number;
}

export interface Imagen {
  url: string;
  publicId: string;
}

export interface Producto {
  _id: string;
  nombre: string;
  equipo: string;
  liga: string;
  temporada: string;
  tipo: TipoCamiseta;
  descripcion: string;
  precio: number;
  precioOferta: number | null;
  tallas: TallaStock[];
  imagenes: Imagen[];
  carpeta: string;
  destacado: boolean;
  activo: boolean;
  createdAt?: string;
}

export type ProductoForm = Omit<Producto, '_id' | 'createdAt'>;

export interface ZonaEnvio {
  nombre: string;
  costo: number;
}

export interface Ajustes {
  whatsapp: string;
  instagram: string;
  puntosEncuentro: string[];
  zonasEnvio: ZonaEnvio[];
  datosTransferencia: string;
}

export interface Filtros {
  equipos: string[];
  ligas: string[];
  tallas: string[];
}

export interface ItemCarrito {
  productoId: string;
  nombre: string;
  equipo: string;
  imagen: string;
  talla: string;
  precio: number;
  cantidad: number;
  stock: number;
}

export function precioFinal(p: Pick<Producto, 'precio' | 'precioOferta'>): number {
  return p.precioOferta != null && p.precioOferta > 0 && p.precioOferta < p.precio ? p.precioOferta : p.precio;
}

export function stockTotal(p: Producto): number {
  return p.tallas.reduce((acc, t) => acc + t.stock, 0);
}