import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import FinanceDashboard from './pages/FinanceDashboard.jsx';
import HRDashboard from './pages/HRDashboard.jsx';

// Frontend Dev 1 owns Login.jsx + Dashboard.jsx
// Frontend Dev 2 owns AdminDashboard.jsx
// Routes are wired here so neither of you has to touch this file day-to-day.
export default function App() {
  return (
    <BrowserRouter>
      <nav className="p-4 bg-slate-800 text-white flex gap-4">
        <Link to="/">Login</Link>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/admin">Admin</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/finance" element={<FinanceDashboard />} />
        <Route path="/dashboard/hr" element={<HRDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
