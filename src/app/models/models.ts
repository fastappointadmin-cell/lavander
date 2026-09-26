export interface PropertyDefinition {
  id: number;
  propertyName: string;
}

export interface ProductCategoryGroup {
  id: number;
  groupName: string;
  subGroups: ProductSubCategoryGroup[];
  categories: ProductCategory[];
}

export interface ProductSubCategoryGroup {
  id: number;
  groupName: string;
  categories: ProductCategory[];
}

export interface ProductCategory {
  id: number;
  categoryName: string;
  categoryProperties: PropertyDefinition[];
}

export interface ProductCategoryRef {
  id: number;
  categoryName: string;
}

export interface Product {
  id: number;
  productName: string;
  productDescription: string;
  category: ProductCategoryRef;
  extraProperties: PropertyDefinition[];
}

export interface ProductRef {
  id: number;
  productName: string;
  categoryId: number;
}

export interface PropertyValue {
  id: number;
  propertyDefinition: PropertyDefinition;
  propertyValue: string;
}

export interface Tag {
  id: number;
  tagName: string;
}

export interface PromotionGroup {
  id: number;
  groupName: string;
  tags: Tag[];
}

export interface ProductVariant {
  id: number;
  variantName: string;
  variantDescription: string;
  product: ProductRef;
  variantProperties: PropertyValue[];
  tags: Tag[];
  price: number;
  starRating: number;
  reviewCount: number;
}

export interface Cart {
  id: number;
  ownerToken: string;
  items: CartItem[];
}

export interface CartItem {
  id: number;
  variant: ProductVariant;
  quantity: number;
}

export type Role = 'USER' | 'ADMIN';

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: Role;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Only COURIER exists for now; SAMEDAY_LOCKER (or similar) will be added once the
// Sameday integration is wired up.
export type DeliveryMethod = 'COURIER';

export type PaymentMethod = 'CARD' | 'CASH_ON_DELIVERY';

export type OrderStatus = 'PLACED';

export interface OrderItem {
  id: number;
  variantId: number;
  variantName: string;
  unitPrice: number;
  quantity: number;
}

export interface Order {
  id: number;
  customerFullName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryMethod: DeliveryMethod;
  shippingStreet: string;
  shippingCity: string;
  shippingCounty: string;
  shippingPostalCode: string;
  paymentMethod: PaymentMethod;
  promoCode: string | null;
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  items: OrderItem[];
}
