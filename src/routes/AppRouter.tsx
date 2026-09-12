import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { CreateUserPage } from '../pages/CreateUserPage';
import { UserDetailPage } from '../pages/UserDetailPage';
import { UserListPage } from '../pages/UserListPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<UserListPage />} />
          <Route path="/users/new" element={<CreateUserPage />} />
          <Route path="/users/:id" element={<UserDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
