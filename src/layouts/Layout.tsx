import { Link, Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="layout">
      <header className="navbar">
        <Link to="/" className="brand">
          Drone-FE
        </Link>
        <nav>
          <Link to="/">Users</Link>
          <Link to="/users/new">New User</Link>
        </nav>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
