/**
 * Utilidades para ordenamiento de categorías deportivas de la liga.
 * Orden ascendente: U8, U10, U12, U14, U16 Femenino, U16 Masculino, U18, U20, etc.
 */

export function compararCategorias(a: string, b: string): number {
  if (a === b) return 0;
  if (a === 'Todas') return -1;
  if (b === 'Todas') return 1;

  // Extraer el número de la categoría (ej: "U8" -> 8, "U10" -> 10, "U16 Femenino" -> 16)
  const numA = parseInt(a.replace(/\D/g, ''), 10);
  const numB = parseInt(b.replace(/\D/g, ''), 10);

  const hasNumA = !isNaN(numA);
  const hasNumB = !isNaN(numB);

  if (hasNumA && hasNumB) {
    if (numA !== numB) {
      return numA - numB;
    }
    // Si tienen el mismo número (ej: U16 Femenino vs U16 Masculino)
    return a.localeCompare(b);
  }

  // Las que tienen número van antes que las que no tienen (ej: "Libre")
  if (hasNumA && !hasNumB) return -1;
  if (!hasNumA && hasNumB) return 1;

  return a.localeCompare(b);
}

export function ordenarCategorias(categorias: string[]): string[] {
  if (!Array.isArray(categorias)) return [];
  return [...categorias].sort(compararCategorias);
}
