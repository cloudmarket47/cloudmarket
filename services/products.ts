/**
 * Product service for API calls
 */
import { apiClient } from '@/lib/api-client';
import { Product, CreateProductInput, UpdateProductInput, PaginatedResponse } from '@/types';

export const productService = {
  async getAll(page = 1, pageSize = 20) {
    return apiClient.get<PaginatedResponse<Product>>(
      `/products?page=${page}&pageSize=${pageSize}`
    );
  },

  async getById(id: string) {
    return apiClient.get<Product>(`/products/${id}`);
  },

  async getBySlug(slug: string) {
    return apiClient.get<Product>(`/products/slug/${slug}`);
  },

  async create(data: CreateProductInput) {
    return apiClient.post<Product>('/products', data);
  },

  async update(id: string, data: UpdateProductInput) {
    return apiClient.put<Product>(`/products/${id}`, data);
  },

  async delete(id: string) {
    return apiClient.delete(`/products/${id}`);
  },

  async search(query: string) {
    return apiClient.get<Product[]>(`/products/search?q=${query}`);
  },

  async getByCategory(categoryId: string, page = 1, pageSize = 20) {
    return apiClient.get<PaginatedResponse<Product>>(
      `/products/category/${categoryId}?page=${page}&pageSize=${pageSize}`
    );
  },
};
