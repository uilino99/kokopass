import { useAuth } from '../hooks/useAuth.js';
import { FullPageSpinner } from '../components/Spinner.jsx';
import FarmerDashboard from './FarmerDashboard.jsx';
import ExporterDashboard from './ExporterDashboard.jsx';
import BuyerDashboard from './BuyerDashboard.jsx';

export default function Dashboard() {
  const { profile, loading } = useAuth();
  if (loading || !profile) return <FullPageSpinner label="Loading dashboard" />;
  if (profile.role === 'exporter') return <ExporterDashboard />;
  if (profile.role === 'buyer') return <BuyerDashboard />;
  return <FarmerDashboard />;
}
