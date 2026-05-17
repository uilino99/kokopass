import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import FarmProfile from './pages/FarmProfile.jsx';
import BatchNew from './pages/BatchNew.jsx';
import BatchView from './pages/BatchView.jsx';
import BatchEdit from './pages/BatchEdit.jsx';
import BatchPrint from './pages/BatchPrint.jsx';
import ExporterDashboard from './pages/ExporterDashboard.jsx';
import ExporterProfile from './pages/ExporterProfile.jsx';
import Exporters from './pages/Exporters.jsx';
import ExporterPublic from './pages/ExporterPublic.jsx';
import FarmerPublic from './pages/FarmerPublic.jsx';
import AdminSeed from './pages/AdminSeed.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminAudit from './pages/AdminAudit.jsx';
import AdminUsers from './pages/AdminUsers.jsx';
import AdminOrgs from './pages/AdminOrgs.jsx';
import AccountSettings from './pages/AccountSettings.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Inquiries from './pages/Inquiries.jsx';
import Impact from './pages/Impact.jsx';
import Orgs from './pages/Orgs.jsx';
import Organizations from './pages/Organizations.jsx';
import OrgNew from './pages/OrgNew.jsx';
import OrgDashboard from './pages/OrgDashboard.jsx';
import OrgMembers from './pages/OrgMembers.jsx';
import OrgSettings from './pages/OrgSettings.jsx';
import OrgAgent from './pages/OrgAgent.jsx';
import OrgAgentEnroll from './pages/OrgAgentEnroll.jsx';
import OrgAgentPrint from './pages/OrgAgentPrint.jsx';
import OrgTerritories from './pages/OrgTerritories.jsx';
import OrgPrograms from './pages/OrgPrograms.jsx';
import OrgCertifications from './pages/OrgCertifications.jsx';
import ShipmentNew from './pages/ShipmentNew.jsx';
import ShipmentView from './pages/ShipmentView.jsx';
import ShipmentEdit from './pages/ShipmentEdit.jsx';
import BuyerDashboard from './pages/BuyerDashboard.jsx';
import BuyerScan from './pages/BuyerScan.jsx';
import EnrollerDashboard from './pages/EnrollerDashboard.jsx';
import EnrollNew from './pages/EnrollNew.jsx';
import EnrollEdit from './pages/EnrollEdit.jsx';
import EnrollBulk from './pages/EnrollBulk.jsx';
import EnrollPrint from './pages/EnrollPrint.jsx';
import Verify from './pages/Verify.jsx';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/claim/:code" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify/:id" element={<Verify />} />
        <Route path="/exporters" element={<Exporters />} />
        <Route path="/exporters/:id" element={<ExporterPublic />} />
        <Route path="/organizations" element={<Organizations />} />
        <Route path="/impact" element={<Impact />} />
        <Route path="/farmers/:uid" element={<FarmerPublic />} />

        {/* Account */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <AccountSettings />
            </ProtectedRoute>
          }
        />

        {/* Organizations */}
        <Route
          path="/orgs"
          element={
            <ProtectedRoute>
              <Orgs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/org/new"
          element={
            <ProtectedRoute>
              <OrgNew />
            </ProtectedRoute>
          }
        />
        <Route
          path="/org/:orgId"
          element={
            <ProtectedRoute>
              <OrgDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/org/:orgId/members"
          element={
            <ProtectedRoute>
              <OrgMembers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/org/:orgId/settings"
          element={
            <ProtectedRoute>
              <OrgSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/org/:orgId/agent"
          element={
            <ProtectedRoute>
              <OrgAgent />
            </ProtectedRoute>
          }
        />
        <Route
          path="/org/:orgId/agent/enroll"
          element={
            <ProtectedRoute>
              <OrgAgentEnroll />
            </ProtectedRoute>
          }
        />
        <Route
          path="/org/:orgId/agent/print"
          element={
            <ProtectedRoute>
              <OrgAgentPrint />
            </ProtectedRoute>
          }
        />
        <Route
          path="/org/:orgId/territories"
          element={
            <ProtectedRoute>
              <OrgTerritories />
            </ProtectedRoute>
          }
        />
        <Route
          path="/org/:orgId/programs"
          element={
            <ProtectedRoute>
              <OrgPrograms />
            </ProtectedRoute>
          }
        />
        <Route
          path="/org/:orgId/certifications"
          element={
            <ProtectedRoute>
              <OrgCertifications />
            </ProtectedRoute>
          }
        />

        {/* Admin tooling */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit"
          element={
            <ProtectedRoute>
              <AdminAudit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <AdminUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/orgs"
          element={
            <ProtectedRoute>
              <AdminOrgs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/seed"
          element={
            <ProtectedRoute>
              <AdminSeed />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Farmer routes */}
        <Route
          path="/farm"
          element={
            <ProtectedRoute>
              <FarmProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/batches/new"
          element={
            <ProtectedRoute>
              <BatchNew />
            </ProtectedRoute>
          }
        />
        <Route
          path="/batches/print"
          element={
            <ProtectedRoute>
              <BatchPrint />
            </ProtectedRoute>
          }
        />
        <Route
          path="/batches/:id"
          element={
            <ProtectedRoute>
              <BatchView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/batches/:id/edit"
          element={
            <ProtectedRoute>
              <BatchEdit />
            </ProtectedRoute>
          }
        />

        {/* Exporter routes */}
        <Route
          path="/exporter"
          element={
            <ProtectedRoute role="exporter">
              <ExporterDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exporter/shipments/new"
          element={
            <ProtectedRoute role="exporter">
              <ShipmentNew />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exporter/shipments/:id"
          element={
            <ProtectedRoute role="exporter">
              <ShipmentView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exporter/shipments/:id/edit"
          element={
            <ProtectedRoute role="exporter">
              <ShipmentEdit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exporter/profile"
          element={
            <ProtectedRoute role="exporter">
              <ExporterProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exporter/inquiries"
          element={
            <ProtectedRoute role="exporter">
              <Inquiries />
            </ProtectedRoute>
          }
        />

        {/* Buyer routes */}
        <Route
          path="/buyer"
          element={
            <ProtectedRoute role="buyer">
              <BuyerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/buyer/scan"
          element={
            <ProtectedRoute role="buyer">
              <BuyerScan />
            </ProtectedRoute>
          }
        />

        {/* Enroller routes */}
        <Route
          path="/enroll"
          element={
            <ProtectedRoute role="enroller">
              <EnrollerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/enroll/new"
          element={
            <ProtectedRoute role="enroller">
              <EnrollNew />
            </ProtectedRoute>
          }
        />
        <Route
          path="/enroll/:id/edit"
          element={
            <ProtectedRoute role="enroller">
              <EnrollEdit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/enroll/bulk"
          element={
            <ProtectedRoute role="enroller">
              <EnrollBulk />
            </ProtectedRoute>
          }
        />
        <Route
          path="/enroll/print"
          element={
            <ProtectedRoute role="enroller">
              <EnrollPrint />
            </ProtectedRoute>
          }
        />

        <Route
          path="*"
          element={
            <div className="card text-center">
              <p className="eyebrow">404</p>
              <h1 className="mt-2 font-display text-3xl text-koko-ink">Page not found</h1>
              <p className="mt-2 text-sm text-koko-body">The page you're looking for doesn't exist.</p>
            </div>
          }
        />
      </Routes>
    </Layout>
  );
}
