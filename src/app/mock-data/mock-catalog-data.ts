import { Product, ProductCategory, ProductCategoryGroup, ProductVariant, PropertyDefinition } from '../models/models';

const RAM_PROPERTY: PropertyDefinition = { id: 1, propertyName: 'RAM' };
const SCREEN_SIZE_PROPERTY: PropertyDefinition = { id: 2, propertyName: 'Screen Size' };
const CHIP_PROPERTY: PropertyDefinition = { id: 3, propertyName: 'Chip' };

const DETERGENT_TIP_PROPERTY: PropertyDefinition = { id: 4, propertyName: 'Tip' };
const DETERGENT_CANTITATE_PROPERTY: PropertyDefinition = { id: 5, propertyName: 'Cantitate' };

const BALSAM_PARFUM_PROPERTY: PropertyDefinition = { id: 6, propertyName: 'Parfum' };
const BALSAM_CANTITATE_PROPERTY: PropertyDefinition = { id: 7, propertyName: 'Cantitate' };

const ODORIZANT_TIP_PROPERTY: PropertyDefinition = { id: 8, propertyName: 'Tip' };
const ODORIZANT_PARFUM_PROPERTY: PropertyDefinition = { id: 9, propertyName: 'Parfum' };

const IGIENA_ORALA_TIP_PROPERTY: PropertyDefinition = { id: 10, propertyName: 'Tip Produs' };
const IGIENA_ORALA_CANTITATE_PROPERTY: PropertyDefinition = { id: 11, propertyName: 'Cantitate' };

const HARTIE_ROLE_PROPERTY: PropertyDefinition = { id: 12, propertyName: 'Numar Role' };
const HARTIE_STRATURI_PROPERTY: PropertyDefinition = { id: 13, propertyName: 'Numar Straturi' };

const COSMETICE_TIP_PROPERTY: PropertyDefinition = { id: 14, propertyName: 'Tip Produs' };
const COSMETICE_CANTITATE_PROPERTY: PropertyDefinition = { id: 15, propertyName: 'Cantitate' };

const ELECTRONICS_GROUP: ProductCategoryGroup = {
  id: 1,
  groupName: 'Electronics',
  parentGroup: undefined,
  listOfSubGroups: [],
  listOfCategories: [],
};

const COMPUTERS_GROUP: ProductCategoryGroup = {
  id: 2,
  groupName: 'Computers',
  parentGroup: ELECTRONICS_GROUP,
  listOfSubGroups: [],
  listOfCategories: [],
};
ELECTRONICS_GROUP.listOfSubGroups.push(COMPUTERS_GROUP);

const LAPTOPS_CATEGORY: ProductCategory = {
  id: 1,
  categoryName: 'Laptops',
  parentGroup: COMPUTERS_GROUP,
  listOfCategoryProperties: [RAM_PROPERTY, SCREEN_SIZE_PROPERTY],
};
COMPUTERS_GROUP.listOfCategories.push(LAPTOPS_CATEGORY);

const CLEANING_GROUP: ProductCategoryGroup = {
  id: 4,
  groupName: 'Curatenie',
  parentGroup: undefined,
  listOfSubGroups: [],
  listOfCategories: [],
};

const HYGIENE_GROUP: ProductCategoryGroup = {
  id: 5,
  groupName: 'Igiena si Cosmetice',
  parentGroup: undefined,
  listOfSubGroups: [],
  listOfCategories: [],
};

// Categories below are extracted from https://lavandermag.ro/'s collection list.
const DETERGENTI_CATEGORY: ProductCategory = {
  id: 2,
  categoryName: 'Detergenti',
  parentGroup: CLEANING_GROUP,
  listOfCategoryProperties: [DETERGENT_TIP_PROPERTY, DETERGENT_CANTITATE_PROPERTY],
};

const BALSAM_RUFE_CATEGORY: ProductCategory = {
  id: 3,
  categoryName: 'Balsam Rufe',
  parentGroup: CLEANING_GROUP,
  listOfCategoryProperties: [BALSAM_PARFUM_PROPERTY, BALSAM_CANTITATE_PROPERTY],
};

const ODORIZANT_WC_CATEGORY: ProductCategory = {
  id: 4,
  categoryName: 'Odorizant WC',
  parentGroup: CLEANING_GROUP,
  listOfCategoryProperties: [ODORIZANT_TIP_PROPERTY, ODORIZANT_PARFUM_PROPERTY],
};

CLEANING_GROUP.listOfCategories.push(DETERGENTI_CATEGORY, BALSAM_RUFE_CATEGORY, ODORIZANT_WC_CATEGORY);

const IGIENA_ORALA_CATEGORY: ProductCategory = {
  id: 5,
  categoryName: 'Igiena Orala',
  parentGroup: HYGIENE_GROUP,
  listOfCategoryProperties: [IGIENA_ORALA_TIP_PROPERTY, IGIENA_ORALA_CANTITATE_PROPERTY],
};

const HARTIE_IGIENICA_CATEGORY: ProductCategory = {
  id: 6,
  categoryName: 'Hartie Igienica',
  parentGroup: HYGIENE_GROUP,
  listOfCategoryProperties: [HARTIE_ROLE_PROPERTY, HARTIE_STRATURI_PROPERTY],
};

const COSMETICE_CATEGORY: ProductCategory = {
  id: 7,
  categoryName: 'Cosmetice',
  parentGroup: HYGIENE_GROUP,
  listOfCategoryProperties: [COSMETICE_TIP_PROPERTY, COSMETICE_CANTITATE_PROPERTY],
};

HYGIENE_GROUP.listOfCategories.push(IGIENA_ORALA_CATEGORY, HARTIE_IGIENICA_CATEGORY, COSMETICE_CATEGORY);

export const MOCK_CATEGORY_GROUPS: ProductCategoryGroup[] = [ELECTRONICS_GROUP, CLEANING_GROUP, HYGIENE_GROUP];

const DELL_PRODUCT: Product = {
  id: 1,
  productName: 'Dell',
  productDescription: 'Dell laptops',
  productCategory: LAPTOPS_CATEGORY,
  listOfProductExtraProperties: [],
};

const APPLE_PRODUCT: Product = {
  id: 2,
  productName: 'Apple',
  productDescription: 'Apple laptops',
  productCategory: LAPTOPS_CATEGORY,
  listOfProductExtraProperties: [CHIP_PROPERTY],
};

const LENOVO_PRODUCT: Product = {
  id: 3,
  productName: 'Lenovo',
  productDescription: 'Lenovo laptops',
  productCategory: LAPTOPS_CATEGORY,
  listOfProductExtraProperties: [],
};

const ARIEL_PRODUCT: Product = {
  id: 4,
  productName: 'Ariel',
  productDescription: 'Ariel detergenti',
  productCategory: DETERGENTI_CATEGORY,
  listOfProductExtraProperties: [],
};

const LENOR_PRODUCT: Product = {
  id: 5,
  productName: 'Lenor',
  productDescription: 'Lenor balsam de rufe',
  productCategory: BALSAM_RUFE_CATEGORY,
  listOfProductExtraProperties: [],
};

const DOMESTOS_PRODUCT: Product = {
  id: 6,
  productName: 'Domestos',
  productDescription: 'Domestos odorizante WC',
  productCategory: ODORIZANT_WC_CATEGORY,
  listOfProductExtraProperties: [],
};

const BLEND_A_MED_PRODUCT: Product = {
  id: 7,
  productName: 'Blend-a-med',
  productDescription: 'Blend-a-med produse de igiena orala',
  productCategory: IGIENA_ORALA_CATEGORY,
  listOfProductExtraProperties: [],
};

const ALINT_PRODUCT: Product = {
  id: 8,
  productName: 'Alint',
  productDescription: 'Alint hartie igienica',
  productCategory: HARTIE_IGIENICA_CATEGORY,
  listOfProductExtraProperties: [],
};

const PANTENE_PRODUCT: Product = {
  id: 9,
  productName: 'Pantene',
  productDescription: 'Pantene produse cosmetice',
  productCategory: COSMETICE_CATEGORY,
  listOfProductExtraProperties: [],
};

export const MOCK_PRODUCTS: Product[] = [
  DELL_PRODUCT,
  APPLE_PRODUCT,
  LENOVO_PRODUCT,
  ARIEL_PRODUCT,
  LENOR_PRODUCT,
  DOMESTOS_PRODUCT,
  BLEND_A_MED_PRODUCT,
  ALINT_PRODUCT,
  PANTENE_PRODUCT,
];

export const MOCK_VARIANTS: ProductVariant[] = [
  {
    id: 1,
    variantName: 'Dell XPS 13',
    variantDescription: '13-inch Dell XPS laptop',
    product: DELL_PRODUCT,
    listOfVariantProperties: [
      { id: 1, propertyDefinition: RAM_PROPERTY, propertyValue: '16GB' },
      { id: 2, propertyDefinition: SCREEN_SIZE_PROPERTY, propertyValue: '13 inch' },
    ],
    price: 4999,
    starRating: 4,
  },
  {
    id: 2,
    variantName: 'MacBook Pro 14',
    variantDescription: '14-inch MacBook Pro',
    product: APPLE_PRODUCT,
    listOfVariantProperties: [
      { id: 3, propertyDefinition: RAM_PROPERTY, propertyValue: '18GB' },
      { id: 4, propertyDefinition: SCREEN_SIZE_PROPERTY, propertyValue: '14 inch' },
      { id: 5, propertyDefinition: CHIP_PROPERTY, propertyValue: 'M3 Pro' },
    ],
    price: 9999,
    starRating: 5,
  },
  {
    id: 3,
    variantName: 'Lenovo ThinkPad X1',
    variantDescription: '14-inch Lenovo ThinkPad X1 Carbon',
    product: LENOVO_PRODUCT,
    listOfVariantProperties: [
      { id: 6, propertyDefinition: RAM_PROPERTY, propertyValue: '16GB' },
      { id: 7, propertyDefinition: SCREEN_SIZE_PROPERTY, propertyValue: '14 inch' },
    ],
    price: 6499,
    starRating: 4,
  },
  {
    id: 4,
    variantName: 'Ariel Detergent Lichid Alpine',
    variantDescription: 'Detergent lichid pentru rufe Ariel',
    product: ARIEL_PRODUCT,
    listOfVariantProperties: [
      { id: 8, propertyDefinition: DETERGENT_TIP_PROPERTY, propertyValue: 'Lichid' },
      { id: 9, propertyDefinition: DETERGENT_CANTITATE_PROPERTY, propertyValue: '3.6L' },
    ],
    price: 65,
    starRating: 4,
  },
  {
    id: 5,
    variantName: 'Lenor Perle Parfumate Spring Awakening',
    variantDescription: 'Balsam de rufe Lenor',
    product: LENOR_PRODUCT,
    listOfVariantProperties: [
      { id: 10, propertyDefinition: BALSAM_PARFUM_PROPERTY, propertyValue: 'Spring Awakening' },
      { id: 11, propertyDefinition: BALSAM_CANTITATE_PROPERTY, propertyValue: '140 g' },
    ],
    price: 25,
    starRating: 5,
  },
  {
    id: 6,
    variantName: 'Domestos Pine Fresh',
    variantDescription: 'Dezinfectant si odorizant WC Domestos',
    product: DOMESTOS_PRODUCT,
    listOfVariantProperties: [
      { id: 12, propertyDefinition: ODORIZANT_TIP_PROPERTY, propertyValue: 'Gel' },
      { id: 13, propertyDefinition: ODORIZANT_PARFUM_PROPERTY, propertyValue: 'Pine Fresh' },
    ],
    price: 15,
    starRating: 4,
  },
  {
    id: 7,
    variantName: 'Blend-a-med 3D White Clinical Miracle Glow',
    variantDescription: 'Pasta de dinti Blend-a-med',
    product: BLEND_A_MED_PRODUCT,
    listOfVariantProperties: [
      { id: 14, propertyDefinition: IGIENA_ORALA_TIP_PROPERTY, propertyValue: 'Pasta de Dinti' },
      { id: 15, propertyDefinition: IGIENA_ORALA_CANTITATE_PROPERTY, propertyValue: '75ml' },
    ],
    price: 12,
    starRating: 5,
  },
  {
    id: 8,
    variantName: 'Alint Hartie Igienica Piersica',
    variantDescription: 'Hartie igienica Alint',
    product: ALINT_PRODUCT,
    listOfVariantProperties: [
      { id: 16, propertyDefinition: HARTIE_ROLE_PROPERTY, propertyValue: '8 Role' },
      { id: 17, propertyDefinition: HARTIE_STRATURI_PROPERTY, propertyValue: '3 Straturi' },
    ],
    price: 10,
    starRating: 3,
  },
  {
    id: 9,
    variantName: 'Pantene Pro-V Miracles Lift & Volume',
    variantDescription: 'Sampon Pantene',
    product: PANTENE_PRODUCT,
    listOfVariantProperties: [
      { id: 18, propertyDefinition: COSMETICE_TIP_PROPERTY, propertyValue: 'Sampon' },
      { id: 19, propertyDefinition: COSMETICE_CANTITATE_PROPERTY, propertyValue: '300 ml' },
    ],
    price: 22,
    starRating: 4,
  },
];
