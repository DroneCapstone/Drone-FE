import { Route, Routes } from 'react-router-dom';
import { CreateUserPage } from '../features/users/pages/CreateUserPage';
import { UserDetailPage } from '../features/users/pages/UserDetailPage';
import { UserListPage } from '../features/users/pages/UserListPage';
import { Layout } from '../layouts/Layout';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<UserListPage />} />
        <Route path="/users/new" element={<CreateUserPage />} />
        <Route path="/users/:id" element={<UserDetailPage />} />
      </Route>
    </Routes>
  );
}
