/**
 * User service for API calls
 */
import { apiClient } from '@/lib/api-client';
import { User, CreateUserInput, UpdateUserInput } from '@/types';

export const userService = {
  async getById(id: string) {
    return apiClient.get<User>(`/users/${id}`);
  },

  async create(data: CreateUserInput) {
    return apiClient.post<User>('/users', data);
  },

  async update(id: string, data: UpdateUserInput) {
    return apiClient.put<User>(`/users/${id}`, data);
  },

  async delete(id: string) {
    return apiClient.delete(`/users/${id}`);
  },

  async getProfile() {
    return apiClient.get<User>('/users/profile');
  },

  async updateProfile(data: UpdateUserInput) {
    return apiClient.put<User>('/users/profile', data);
  },
};
