import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import PageLoader from './PageLoader.jsx';

/**
 * Route guard for owner pages.
 *
 * This only protects the UI. The server independently checks the auth cookie
 * on every owner API request.
 */
export default function RequireOwner() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoader label="Checking your session…" />;
  }

  if (!user) {
    // Remember where the user wanted to go so login can send them back.
    return <Navigate to="/owner/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
