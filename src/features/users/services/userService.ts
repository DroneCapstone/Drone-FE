// Every API call related to "users" lives in this one file. A page or
// component never calls axios/apiClient directly — it always goes through
// a function here.
import { apiClient } from '../../../services/api';
import type { ApiResponse } from '../../../services/apiResponse';
import type { CreateUserPayload, User, UserListResult } from '../types/user';

export async function getUsers(page: number, pageSize: number): Promise<UserListResult> {
  const response = await apiClient.get<ApiResponse<UserListResult>>('/users', {
    params: { page, page_size: pageSize },
  });
  return response.data.data;
}

export async function getUserById(id: number): Promise<User> {
  const response = await apiClient.get<ApiResponse<User>>(`/users/${id}`);
  return response.data.data;
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
  const response = await apiClient.post<ApiResponse<User>>('/users', payload);
  return response.data.data;
}
