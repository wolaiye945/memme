import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import Layout from './components/layout/Layout';

// Placeholder pages
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));
const HomePage = React.lazy(() => import('./pages/HomePage'));
const NewMemoryPage = React.lazy(() => import('./pages/NewMemoryPage'));
const EditMemoryPage = React.lazy(() => import('./pages/EditMemoryPage'));
const ReviewPage = React.lazy(() => import('./pages/ReviewPage'));
const AdminPage = React.lazy(() => import('./pages/AdminPage'));
const SharePage = React.lazy(() => import('./pages/SharePage'));

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <Layout>{children}</Layout> : <Navigate to="/login" />;
}

function App() {
  return (
    <BrowserRouter>
      <React.Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/share/:code" element={<SharePage />} />
          
          <Route path="/" element={
            <PrivateRoute>
              <HomePage />
            </PrivateRoute>
          } />
          <Route path="/new" element={
            <PrivateRoute>
              <NewMemoryPage />
            </PrivateRoute>
          } />
          <Route path="/edit/:id" element={
            <PrivateRoute>
              <EditMemoryPage />
            </PrivateRoute>
          } />
          <Route path="/review" element={
            <PrivateRoute>
              <ReviewPage />
            </PrivateRoute>
          } />
          <Route path="/admin" element={
            <PrivateRoute>
              <AdminPage />
            </PrivateRoute>
          } />
        </Routes>
      </React.Suspense>
    </BrowserRouter>
  );
}

export default App;
