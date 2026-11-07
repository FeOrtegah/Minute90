import { Routes } from '@angular/router';
import { adminGuard, loginGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'Minute 90 | Camisetas de fútbol',
    loadComponent: () => import('./pages/inicio/inicio').then((m) => m.Inicio),
  },
  {
    path: 'catalogo',
    title: 'Catálogo | Minute 90',
    loadComponent: () => import('./pages/catalogo/catalogo').then((m) => m.Catalogo),
  },
  {
    path: 'producto/:id',
    title: 'Camiseta | Minute 90',
    loadComponent: () => import('./pages/producto/producto').then((m) => m.ProductoDetalle),
  },
  {
    path: 'carrito',
    title: 'Carrito | Minute 90',
    loadComponent: () => import('./pages/carrito/carrito').then((m) => m.Carrito),
  },
  {
    path: 'checkout',
    title: 'Finalizar compra | Minute 90',
    loadComponent: () => import('./pages/checkout/checkout').then((m) => m.Checkout),
  },
  {
    path: 'admin/login',
    title: 'Ingresar | Minute 90',
    canActivate: [loginGuard],
    loadComponent: () => import('./pages/admin/login/login').then((m) => m.Login),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/admin/layout/admin-layout').then((m) => m.AdminLayout),
    children: [
      {
        path: '',
        title: 'Productos | Admin',
        loadComponent: () => import('./pages/admin/productos/admin-productos').then((m) => m.AdminProductos),
      },
      {
        path: 'nuevo',
        title: 'Nuevo producto | Admin',
        loadComponent: () => import('./pages/admin/producto-form/producto-form').then((m) => m.ProductoFormPage),
      },
      {
        path: 'editar/:id',
        title: 'Editar producto | Admin',
        loadComponent: () => import('./pages/admin/producto-form/producto-form').then((m) => m.ProductoFormPage),
      },
      {
        path: 'ajustes',
        title: 'Ajustes | Admin',
        loadComponent: () => import('./pages/admin/ajustes/admin-ajustes').then((m) => m.AdminAjustes),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
