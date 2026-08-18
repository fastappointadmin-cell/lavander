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

/**
 * The first variant (in array order) that has the given value for the given
 * property, regardless of any other currently selected property. Clicking a
 * tag always leads somewhere; the other rows then re-derive their "current"
 * value from whichever variant this lands on.
 */
export function findFirstVariantWithValue(
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
