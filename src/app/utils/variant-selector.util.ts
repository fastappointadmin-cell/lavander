import { ProductVariant } from '../models/models';

export interface VariantTagRow {
  propertyDefinitionId: number;
  propertyName: string;
  values: string[];
}

export type VariantSelection = Record<number, string>;

/**
 * One row per property that has more than one distinct value across the
 * given variants (a property with a single observed value isn't a
 * switchable row).
 */
export function buildVariantTagRows(variants: ProductVariant[]): VariantTagRow[] {
  const rowsById = new Map<number, VariantTagRow>();

  for (const variant of variants) {
    for (const propertyValue of variant.variantProperties) {
      const propertyId = propertyValue.propertyDefinition.id;
      let row = rowsById.get(propertyId);
      if (!row) {
        row = {
          propertyDefinitionId: propertyId,
          propertyName: propertyValue.propertyDefinition.propertyName,
          values: [],
        };
        rowsById.set(propertyId, row);
      }
      if (!row.values.includes(propertyValue.propertyValue)) {
        row.values.push(propertyValue.propertyValue);
      }
    }
  }

  return Array.from(rowsById.values()).filter((row) => row.values.length > 1);
}

/** The selection implied by a variant's own property values. */
export function selectionFromVariant(variant: ProductVariant): VariantSelection {
  const selection: VariantSelection = {};
  for (const propertyValue of variant.variantProperties) {
    selection[propertyValue.propertyDefinition.id] = propertyValue.propertyValue;
  }
  return selection;
}

function matchScore(variant: ProductVariant, selection: VariantSelection): number {
  let score = 0;
  for (const propertyValue of variant.variantProperties) {
    if (selection[propertyValue.propertyDefinition.id] === propertyValue.propertyValue) {
      score++;
    }
  }
  return score;
}

/**
 * Finds the variant matching every value in the target selection exactly;
 * if none matches exactly (incomplete matrix), falls back to the variant
 * sharing the most matching values with the target selection.
 */
export function findBestMatchingVariant(
  variants: ProductVariant[],
  targetSelection: VariantSelection,
): ProductVariant | null {
  if (variants.length === 0) {
    return null;
  }

  const requiredCount = Object.keys(targetSelection).length;
  const exactMatch = variants.find((variant) => matchScore(variant, targetSelection) === requiredCount);
  if (exactMatch) {
    return exactMatch;
  }

  return variants.reduce((best, candidate) =>
    matchScore(candidate, targetSelection) > matchScore(best, targetSelection) ? candidate : best,
  );
}
