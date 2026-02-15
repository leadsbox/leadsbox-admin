import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import type { AuthUser } from '../types/subscribers';

type AdminLayoutProps = {
  user: AuthUser | null;
  onLogout: () => void;
};

const AdminLayout = ({ user, onLogout }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    user?.username ||
    user?.email ||
    'Admin';

  return (
    <div className='admin-shell'>
      <aside className='admin-sidebar'>
        <Link to='/subscribers' className='brand'>
          <span className='brand-badge'>LB</span>
          <span>
            <strong>LeadsBox Admin</strong>
            <small>Internal control plane</small>
          </span>
        </Link>

        <nav className='sidebar-nav'>
          <NavLink to='/overview' className='nav-item'>
            Overview
          </NavLink>
          <NavLink to='/users' className='nav-item'>
            Users
          </NavLink>
          <NavLink to='/organizations' className='nav-item'>
            Organizations
          </NavLink>
          <NavLink to='/subscribers' className='nav-item'>
            Subscribers
          </NavLink>
          <button type='button' className='nav-item nav-item-muted' onClick={() => navigate('/overview')}>
            AI Ops (soon)
          </button>
        </nav>

        <div className='sidebar-footer'>
          <p>{displayName}</p>
          <button type='button' onClick={onLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className='admin-main'>
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
