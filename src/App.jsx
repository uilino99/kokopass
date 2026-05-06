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
import Verify from './pages/Verify.jsx';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify/:id" element={<Verify />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
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
          path="/batches/:id"
          element={
            <ProtectedRoute>
              <BatchView />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<p className="text-koko-mist/70">404 — page not found.</p>} />
      </Routes>
    </Layout>
  );
}
