import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { FullPageSpinner } from './Spinner.jsx';

export default function ProtectedRoute({ children, role }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <FullPageSpinner label="Loading your account" />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && profile?.role !== role) return <Navigate to="/dashboard" replace />;
  return children;
}
