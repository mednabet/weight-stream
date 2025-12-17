// Weight conversion utility
// Base unit is grams (g)

// Conversion factors to grams
const TO_GRAMS: Record<string, number> = {
  'g': 1,
  'kg': 1000,
  'lb': 453.592,
  'oz': 28.3495,
  'mg': 0.001,
};

// Conversion factors from grams
const FROM_GRAMS: Record<string, number> = {
  'g': 1,
  'kg': 0.001,
  'lb': 0.00220462,
  'oz': 0.035274,
  'mg': 1000,
};

/**
 * Convert weight from one unit to another
 * @param value - The weight value to convert
 * @param fromUnit - The source unit symbol (e.g., 'g', 'kg', 'lb')
 * @param toUnit - The target unit symbol
 * @returns The converted weight value
 */
export function convertWeight(value: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return value;
  
  const fromFactor = TO_GRAMS[fromUnit.toLowerCase()];
  const toFactor = FROM_GRAMS[toUnit.toLowerCase()];
  
  if (fromFactor === undefined || toFactor === undefined) {
    console.warn(`Unknown weight unit: ${fromUnit} or ${toUnit}, returning original value`);
    return value;
  }
  
  // Convert to grams first, then to target unit
  const inGrams = value * fromFactor;
  return inGrams * toFactor;
}

/**
 * Get the default precision for displaying a weight unit
 * @param unit - The unit symbol
 * @returns Number of decimal places
 */
export function getUnitPrecision(unit: string): number {
  switch (unit.toLowerCase()) {
    case 'kg':
    case 'lb':
      return 3;
    case 'g':
    case 'oz':
      return 1;
    case 'mg':
      return 0;
    default:
      return 2;
  }
}

/**
 * Format weight value with specified precision
 * @param value - The weight value
 * @param unit - The unit symbol (for fallback precision)
 * @param precision - Explicit decimal precision (overrides default)
 * @returns Formatted string
 */
export function formatWeight(value: number, unit: string, precision?: number): string {
  const finalPrecision = precision ?? getUnitPrecision(unit);
  return value.toFixed(finalPrecision);
}
