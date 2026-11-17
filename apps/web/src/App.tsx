import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.js';
import RequireAuth from './components/RequireAuth.js';
import RequireRole from './components/RequireRole.js';
import { useAuth } from './context/AuthContext.js';

const LoginPage        = lazy(() => import('./pages/LoginPage.js'));
const Dashboard        = lazy(() => import('./pages/Dashboard.js'));
const AlertsPage       = lazy(() => import('./pages/AlertsPage.js'));
const StockRecordsPage = lazy(() => import('./pages/StockRecordsPage.js'));
const ExpiryTrackerPage= lazy(() => import('./pages/ExpiryTrackerPage.js'));
const FacilityMapPage  = lazy(() => import('./pages/FacilityMapPage.js'));
const RequestsPage     = lazy(() => import('./pages/RequestsPage.js'));
const UsersPage        = lazy(() => import('./pages/UsersPage.js'));

function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const fallback = (
  <div style={{ minHeight: '100vh', background: 'var(--surface-0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div className="skeleton" style={{ width: 160, height: 16 }} />
  </div>
);

export default function App() {
  return (
    <Suspense fallback={fallback}>
      <Routes>
        {/* Public */}
        <Route
          path="/login"
          element={
            <RedirectIfAuthed>
              <LoginPage />
            </RedirectIfAuthed>
          }
        />

        {/* Protected */}
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="alerts"        element={<AlertsPage />} />
          <Route
            path="stock-records"
            element={
              <RequireRole roles={['facility', 'national', 'admin']}>
                <StockRecordsPage />
              </RequireRole>
            }
          />
          <Route path="expiry" element={<ExpiryTrackerPage />} />
          <Route
            path="map"
            element={
              <RequireRole roles={['district', 'national', 'admin']}>
                <FacilityMapPage />
              </RequireRole>
            }
          />
          <Route path="requests" element={<RequestsPage />} />
          <Route
            path="users"
            element={
              <RequireRole roles={['admin']}>
                <UsersPage />
              </RequireRole>
            }
          />
        </Route>
      </Routes>
    </Suspense>
  );
}
