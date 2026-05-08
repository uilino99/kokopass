import { useAuth } from '../hooks/useAuth.js';
import { FullPageSpinner } from '../components/Spinner.jsx';
import FarmerDashboard from './FarmerDashboard.jsx';
import ExporterDashboard from './ExporterDashboard.jsx';
import BuyerDashboard from './BuyerDashboard.jsx';
import EnrollerDashboard from './EnrollerDashboard.jsx';

export default function Dashboard() {
  const { profile, loading } = useAuth();
  if (loading || !profile) return <FullPageSpinner label="Loading dashboard" />;
  if (profile.role === 'exporter') return <ExporterDashboard />;
  if (profile.role === 'buyer') return <BuyerDashboard />;
  if (profile.role === 'enroller') return <EnrollerDashboard />;
  return <FarmerDashboard />;
}
