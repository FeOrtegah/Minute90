import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CarritoService } from '../../core/services/carrito.service';
import { ClpPipe } from '../../shared/clp.pipe';

@Component({
  selector: 'app-carrito',
  imports: [RouterLink, ClpPipe],
  templateUrl: './carrito.html',
})
export class Carrito {
  protected carrito = inject(CarritoService);
}
