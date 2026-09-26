import { DeliveryMethod, PaymentMethod } from './models';

export interface OrderRequest {
  customerFullName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryMethod: DeliveryMethod;
  shippingStreet: string;
  shippingCity: string;
  shippingCounty: string;
  shippingPostalCode: string;
  paymentMethod: PaymentMethod;
  promoCode?: string;
}
