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
