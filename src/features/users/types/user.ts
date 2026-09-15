export interface User {
  id: number;
  full_name: string;
  email: string;
  created_at: string;
}

export interface UserListResult {
  total: number;
  items: User[];
}

export interface CreateUserPayload {
  full_name: string;
  email: string;
}
