import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useMe } from '../../api/hooks/useAuth';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { data: user, isLoading, isError } = useMe();

  if (isLoading) return null;
  if (isError || !user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
