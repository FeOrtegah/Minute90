
export async function comprimirImagen(archivo: File, ladoMaximo = 1600, calidad = 0.85): Promise<File> {
  try {
    const bitmap = await createImageBitmap(archivo);
    const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height));
    const ancho = Math.round(bitmap.width * escala);
    const alto = Math.round(bitmap.height * escala);

    const canvas = document.createElement('canvas');
    canvas.width = ancho;
    canvas.height = alto;
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, ancho, alto);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', calidad));
    if (!blob || blob.size >= archivo.size) return archivo; // si no mejora, se usa la original

    const nombre = archivo.name.replace(/\.[^.]+$/, '') + '.webp';
    return new File([blob], nombre, { type: 'image/webp' });
  } catch {
    return archivo;
  }
}