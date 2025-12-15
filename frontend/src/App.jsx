import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { SearchProvider } from './hooks/useSearch';
import { ImportProvider } from './hooks/useImport';
import Home from './pages/Home';
import Login from './pages/Login';
import ComingSoon from './pages/ComingSoon';
import Dashboard from './pages/Dashboard';
import Search from './pages/Search';
import Import from './pages/Import';
import Settings from './pages/Settings';
import AdminLayout from './components/Layout/AdminLayout';

function ProtectedRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <SearchProvider>
        <ImportProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/coming-soon" element={<ComingSoon />} />

              {/* Protected Admin Routes */}
              <Route path="/admin" element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="search" element={<Search />} />
                <Route path="import" element={<Import />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ImportProvider>
      </SearchProvider>
    </AuthProvider>
  );
}

export default App;


