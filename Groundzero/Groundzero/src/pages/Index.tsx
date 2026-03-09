import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { RoleDashboardRouter } from '@/components/dashboards/RoleDashboardRouter';
import { FullPageLoader } from '@/components/ui/page-loader';

export default function Dashboard() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Show loading spinner while auth is loading
  if (isLoading) {
    return <FullPageLoader text="Loading dashboard..." />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <MainLayout>
      <RoleDashboardRouter />
    </MainLayout>
  );
}
