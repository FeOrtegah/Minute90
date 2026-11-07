import { Pipe, PipeTransform } from '@angular/core';

// 25000 -> "$25.000"
export function formatoCLP(valor: number | null | undefined): string {
  return '$' + Math.round(valor ?? 0).toLocaleString('es-CL');
}

@Pipe({ name: 'clp' })
export class ClpPipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    return formatoCLP(valor);
  }
}
