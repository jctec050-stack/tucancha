/**
 * Utilidades para generar slugs URL-safe para complejos deportivos.
 * 
 * Estrategia: nombre-slugificado + 6 primeros chars del UUID
 * Ejemplo: "Sport Center Asunción" + "a1b2c3" → "sport-center-asuncion-a1b2c3"
 */

/**
 * Convierte un string a formato slug URL-safe.
 * Removes accents, special chars, converts spaces to hyphens.
 * O(n) donde n = longitud del string.
 */
export const slugify = (text: string): string => {
    return text
        .toLowerCase()
        .normalize('NFD')                          // Descompone caracteres acentuados
        .replace(/[\u0300-\u036f]/g, '')           // Elimina diacríticos (á→a, é→e, etc.)
        .replace(/[^a-z0-9\s-]/g, '')             // Solo letras, números, espacios, guiones
        .trim()
        .replace(/\s+/g, '-')                      // Espacios → guiones
        .replace(/-+/g, '-');                      // Múltiples guiones → uno solo
};

/**
 * Genera un slug único para un venue.
 * Combina el nombre slugificado con los primeros 6 chars del UUID para unicidad.
 * 
 * @param name - Nombre del complejo
 * @param id - UUID del venue (para garantizar unicidad)
 * @returns slug único, ej: "sport-center-asuncion-a1b2c3"
 */
export const generateVenueSlug = (name: string, id: string): string => {
    const nameSlug = slugify(name);
    const idSuffix = id.replace(/-/g, '').substring(0, 6);
    return `${nameSlug}-${idSuffix}`;
};

/**
 * Valida si un slug tiene el formato correcto.
 * Solo letras minúsculas, números y guiones. Sin guiones al inicio o final.
 */
export const isValidSlug = (slug: string): boolean => {
    return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) && slug.length >= 3 && slug.length <= 100;
};

/**
 * Sanitiza un slug ingresado manualmente por el usuario.
 * Para el flujo de edición de slug en el dashboard del OWNER.
 */
export const sanitizeSlug = (input: string): string => {
    return slugify(input).substring(0, 100);
};
