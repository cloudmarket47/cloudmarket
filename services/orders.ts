/**
 * Order service for API calls
 */
import { apiClient } from '@/lib/api-client';
import { Order, CreateOrderInput, PaginatedResponse } from '@/types';

export const orderService = {
  async getAll(page = 1, pageSize = 20) {
    return apiClient.get<PaginatedResponse<Order>>(
      `/orders?page=${page}&pageSize=${pageSize}`
    );
  },

  async getById(id: string) {
    return apiClient.get<Order>(`/orders/${id}`);
  },

  async create(data: CreateOrderInput) {
    return apiClient.post<Order>('/orders', data);
  },

  async update(id: string, data: Partial<Order>) {
    return apiClient.put<Order>(`/orders/${id}`, data);
  },

  async delete(id: string) {
    return apiClient.delete(`/orders/${id}`);
  },

  async getUserOrders(userId: string, page = 1, pageSize = 20) {
    return apiClient.get<PaginatedResponse<Order>>(
      `/orders/user/${userId}?page=${page}&pageSize=${pageSize}`
    );
  },

  async updateStatus(id: string, status: string) {
    return apiClient.patch<Order>(`/orders/${id}/status`, { status });
  },
};
