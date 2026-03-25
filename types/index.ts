import { User } from './user';
import { Product } from './product';
import { Order } from './order';
import { ApiResponse, ApiError, PaginatedResponse } from './api';

// Export all types from submodules
export type { User, CreateUserInput, UpdateUserInput, UserRole } from './user';
export type {
  Product,
  CreateProductInput,
  UpdateProductInput,
  Category,
} from './product';
export type {
  Order,
  OrderStatus,
  PaymentStatus,
  OrderItem,
  ShippingAddress,
  CreateOrderInput,
} from './order';
export type { ApiResponse, ApiError, PaginatedResponse };

// Session types for NextAuth
export interface Session {
  user?: {
    id?: string;
    email?: string;
    name?: string;
    image?: string;
    role?: string;
  };
  expires: string;
}

// Store types for Zustand
export interface CartItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface CartState {
  items: CartItem[];
  total: number;
  itemCount: number;
}
