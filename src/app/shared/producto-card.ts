import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Producto, precioFinal, stockTotal } from '../core/models';
import { ClpPipe } from './clp.pipe';

@Component({
  selector: 'app-producto-card',
  imports: [RouterLink, ClpPipe],
  template: `
    <a class="card" [routerLink]="['/producto', producto()._id]">
      <div class="card__img">
        @if (producto().imagenes[0]; as img) {
          <img [src]="img.url" [alt]="producto().nombre" loading="lazy" />
        } @else {
          <div class="card__sin-img">90</div>
        }
        @if (enOferta()) {
          <span class="etiqueta etiqueta--oferta">Oferta</span>
        } @else if (producto().tipo === 'retro') {
          <span class="etiqueta">Retro</span>
        }
        @if (agotado()) {
          <span class="card__agotado">Agotado</span>
        }
      </div>
      <div class="card__info">
        <span class="card__equipo">{{ producto().equipo }}</span>
        <h3 class="card__nombre">{{ producto().nombre }}</h3>
        <div class="card__precio">
          <strong>{{ precio() | clp }}</strong>
          @if (enOferta()) {
            <s>{{ producto().precio | clp }}</s>
          }
        </div>
      </div>
    </a>
  `,
})
export class ProductoCard {
  producto = input.required<Producto>();

  precio = computed(() => precioFinal(this.producto()));
  enOferta = computed(() => this.precio() < this.producto().precio);
  agotado = computed(() => stockTotal(this.producto()) === 0);
}
