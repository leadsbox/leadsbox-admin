import { Navigate } from 'react-router-dom';

type ProtectedRouteProps = {
  ready: boolean;
  isAuthenticated: boolean;
  children: React.ReactNode;
};

const ProtectedRoute = ({ ready, isAuthenticated, children }: ProtectedRouteProps) => {
  if (!ready) {
    return (
      <div className='center-screen'>
        <div className='loader' />
        <p>Checking session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to='/login' replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
