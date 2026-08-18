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

/** The variant matching every value in the selection exactly, or null if none does. */
function findExactMatch(variants: ProductVariant[], selection: VariantSelection): ProductVariant | null {
  const requiredCount = Object.keys(selection).length;
  return variants.find((variant) => matchScore(variant, selection) === requiredCount) ?? null;
}

/**
 * The first variant (in array order) that has the given value for the given
 * property, regardless of any other property.
 */
function findFirstVariantWithValue(
  variants: ProductVariant[],
  propertyDefinitionId: number,
  value: string,
): ProductVariant | null {
  return (
    variants.find((variant) =>
      variant.variantProperties.some(
        (propertyValue) =>
          propertyValue.propertyDefinition.id === propertyDefinitionId && propertyValue.propertyValue === value,
      ),
    ) ?? null
  );
}

/**
 * The variant to land on after clicking `value` for `propertyDefinitionId`,
 * given what's currently selected for every other row. Prefers the variant
 * matching every currently-selected value plus the new one exactly (so every
 * variant stays reachable by tag-clicking whenever a matching one exists);
 * only falls back to the first variant with the clicked value alone when the
 * matrix is genuinely sparse (no variant has that exact combination), so a
 * click is never a dead end.
 */
export function findVariantForTagClick(
  variants: ProductVariant[],
  currentSelection: VariantSelection,
  propertyDefinitionId: number,
  value: string,
): ProductVariant | null {
  const targetSelection: VariantSelection = { ...currentSelection, [propertyDefinitionId]: value };
  return findExactMatch(variants, targetSelection) ?? findFirstVariantWithValue(variants, propertyDefinitionId, value);
}
