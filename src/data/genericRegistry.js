/**
 * PESTICIDE GENERIC REGISTRY — the Price Exposer's static database.
 * Brand → active ingredient → generic equivalent + true wholesale price.
 * Patterned on CIB&RC registered formulations (demo pricing).
 */

export const GENERIC_REGISTRY = [
  { brands: ['saaf', 'sixer', 'companion'], activeIngredient: 'Carbendazim 12% + Mancozeb 63% WP', use: 'Broad-spectrum fungicide', brandedPrice: 620, unit: '500g', genericName: 'Carbendazim+Mancozeb 75% WP (generic)', genericPrice: 340, dose: '2 g / litre' },
  { brands: ['confidor', 'tatamida', 'imida'], activeIngredient: 'Imidacloprid 17.8% SL', use: 'Sucking pests (whitefly, aphids)', brandedPrice: 980, unit: '250ml', genericName: 'Imidacloprid 17.8 SL (generic)', genericPrice: 410, dose: '0.5 ml / litre' },
  { brands: ['coragen'], activeIngredient: 'Chlorantraniliprole 18.5% SC', use: 'Borers & caterpillars', brandedPrice: 2350, unit: '150ml', genericName: 'Chlorantraniliprole 18.5 SC (generic)', genericPrice: 1480, dose: '0.3 ml / litre' },
  { brands: ['roundup', 'glycel', 'weedoff'], activeIngredient: 'Glyphosate 41% SL', use: 'Non-selective weedkiller', brandedPrice: 780, unit: '1L', genericName: 'Glyphosate 41 SL (generic)', genericPrice: 420, dose: '80-100 ml / 15L tank' },
  { brands: ['karate', 'reeva'], activeIngredient: 'Lambda-cyhalothrin 5% EC', use: 'Bollworm, leaf folder', brandedPrice: 720, unit: '500ml', genericName: 'Lambda-cyhalothrin 5 EC (generic)', genericPrice: 335, dose: '1 ml / litre' },
  { brands: ['ridomil', 'master'], activeIngredient: 'Metalaxyl 8% + Mancozeb 64% WP', use: 'Downy mildew, late blight', brandedPrice: 1450, unit: '500g', genericName: 'Metalaxyl-M+Mancozeb (generic)', genericPrice: 760, dose: '2.5 g / litre' },
  { brands: ['actara', 'anant'], activeIngredient: 'Thiamethoxam 25% WG', use: 'Hoppers, thrips, aphids', brandedPrice: 640, unit: '100g', genericName: 'Thiamethoxam 25 WG (generic)', genericPrice: 290, dose: '0.3 g / litre' },
  { brands: ['tilt', 'result'], activeIngredient: 'Propiconazole 25% EC', use: 'Rusts & leaf spots', brandedPrice: 850, unit: '500ml', genericName: 'Propiconazole 25 EC (generic)', genericPrice: 445, dose: '1 ml / litre' },
];

export const SAMPLE_SHOPS = [
  { name: 'Kisan Krishi Kendra', dist: '1.2 km', phone: '9876500011' },
  { name: 'Bharat Agro Agencies', dist: '2.8 km', phone: '9876500022' },
  { name: 'Sahakari Society Depot', dist: '4.1 km', phone: '9876500033' },
];

/** Find a registry entry from a spoken/typed brand name (fuzzy contains). */
export function lookupBrand(query) {
  const q = String(query || '').toLowerCase().trim();
  if (!q) return null;
  return GENERIC_REGISTRY.find((e) => e.brands.some((b) => q.includes(b) || b.includes(q))) || null;
}

/** Deterministic pick for photo-based lookup (demo OCR of the label). */
export function lookupFromPhoto(fileName = '') {
  const idx = Math.abs([...fileName].reduce((a, c) => a + c.charCodeAt(0), 0)) % GENERIC_REGISTRY.length;
  return GENERIC_REGISTRY[idx];
}
