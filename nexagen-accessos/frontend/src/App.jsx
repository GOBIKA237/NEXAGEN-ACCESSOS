import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

// Frontend Dev 1 owns Login.jsx + Dashboard.jsx
// Frontend Dev 2 owns AdminDashboard.jsx
// Routes are wired here so neither of you has to touch this file day-to-day.
//
// NOTE: the old debug nav bar (Login / Dashboard / Admin links) is gone on
// purpose — it let anyone click straight into /admin with no session at
// all. /dashboard and /admin are now wrapped in ProtectedRoute, which
// checks sessionStorage for a valid login and, for /admin, the 'admin'
// role. Login.jsx already navigates to the right page after a successful
// login, so no in-app nav is needed for the demo flow.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
