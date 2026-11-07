# Minute 90 — Frontend

Tienda de camisetas de fútbol en Angular. El pedido se envía por WhatsApp y el dueño administra productos desde `/admin`.

Backend: https://github.com/FeOrtegah/Minute90Backend

## Desarrollo

```bash
npm install
npm start          # http://localhost:4200
```

El backend debe estar corriendo en `http://localhost:4000` (ver `src/environments/environment.development.ts`).

## Producción

1. Cambia `apiUrl` en `src/environments/environment.ts` por la URL del backend publicado.
2. Sube a Vercel (framework: Angular, output: `dist/minute90/browser`).
3. Agrega la URL de Vercel en `FRONTEND_URL` del backend.

## Rutas

| Ruta | Página |
|---|---|
| `/` | Inicio |
| `/catalogo` | Catálogo con filtros (liga, equipo, tipo, talla) |
| `/producto/:id` | Detalle |
| `/carrito` | Carrito |
| `/checkout` | Datos de envío/encuentro y pago → WhatsApp |
| `/admin/login` | Ingreso del dueño |
| `/admin` | Productos (crear, editar, ocultar, destacar, eliminar) |
| `/admin/ajustes` | WhatsApp, zonas de envío, puntos de encuentro, datos de transferencia, contraseña |
