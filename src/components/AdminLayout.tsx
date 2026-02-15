import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import type { AuthUser } from '../types/subscribers';
import {
  LayoutDashboard,
  Users,
  Building2,
  CreditCard,
  Sparkles,
  LogOut,
} from 'lucide-react';
import LeadsBoxBrand from './LeadsBoxBrand';

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
          <LeadsBoxBrand />
        </Link>

        <nav className='sidebar-nav'>
          <NavLink to='/overview' className='nav-item'>
            <LayoutDashboard className='nav-item-icon' />
            Overview
          </NavLink>
          <NavLink to='/users' className='nav-item'>
            <Users className='nav-item-icon' />
            Users
          </NavLink>
          <NavLink to='/organizations' className='nav-item'>
            <Building2 className='nav-item-icon' />
            Organizations
          </NavLink>
          <NavLink to='/subscribers' className='nav-item'>
            <CreditCard className='nav-item-icon' />
            Subscribers
          </NavLink>
          <button type='button' className='nav-item nav-item-muted' onClick={() => navigate('/overview')}>
            <Sparkles className='nav-item-icon' />
            AI Ops (soon)
          </button>
        </nav>

        <div className='sidebar-footer'>
          <p>{displayName}</p>
          <button type='button' onClick={onLogout}>
            <LogOut className='nav-item-icon' />
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
