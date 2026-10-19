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

/**
 * Retorna el número de equipos que clasifican a Playoffs según la categoría:
 * - U10: 8 clasificados (Cuartos de final)
 * - U12: 8 clasificados (Cuartos de final)
 * - U14: 8 clasificados (Cuartos de final)
 * - U16 (Femenino y Masculino): 4 clasificados (Semifinales)
 * - U18 / U20: 4 clasificados
 * - U8: 0 (Formativa / Recreativa)
 */
export function obtenerLimiteClasificados(categoria: string): number {
  if (!categoria) return 0;
  const cat = categoria.trim();
  if (cat === 'U10' || cat === 'U12' || cat === 'U14') return 8;
  if (cat.includes('U16')) return 4;
  if (cat === 'U18' || cat === 'U20') return 4;
  return 0;
}

/**
 * Retorna el nombre de la fase a la que avanzan los clasificados
 */
export function obtenerNombreFaseClasificacion(categoria: string): string {
  const limite = obtenerLimiteClasificados(categoria);
  if (limite === 8) return 'Cuartos de Final';
  if (limite === 4) return 'Semifinales';
  return 'Playoffs';
}

