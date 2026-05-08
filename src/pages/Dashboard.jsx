import { useAuth } from '../hooks/useAuth.js';
import { FullPageSpinner } from '../components/Spinner.jsx';
import FarmerDashboard from './FarmerDashboard.jsx';
import ExporterDashboard from './ExporterDashboard.jsx';

export default function Dashboard() {
  const { profile, loading } = useAuth();
  if (loading || !profile) return <FullPageSpinner label="Loading dashboard" />;
  if (profile.role === 'exporter') return <ExporterDashboard />;
  return <FarmerDashboard />;
}
