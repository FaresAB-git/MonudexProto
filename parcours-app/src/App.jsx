import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ParcoursDetail from './pages/ParcoursDetail';
import MyParcours from './pages/MyParcours';
import CreateParcours from './pages/CreateParcours';
import Rewards from './pages/Rewards';
import Profile from './pages/Profile';
import NavigationMap from './pages/NavigationMap';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/parcours/:id" element={<ParcoursDetail />} />
        <Route path="/parcours/:id/map" element={<ProtectedRoute><NavigationMap /></ProtectedRoute>} />
        <Route path="/parcours" element={<ProtectedRoute><MyParcours /></ProtectedRoute>} />
        <Route path="/create" element={<ProtectedRoute><CreateParcours /></ProtectedRoute>} />
        <Route path="/rewards" element={<ProtectedRoute><Rewards /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
