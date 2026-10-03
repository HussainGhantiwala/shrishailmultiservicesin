import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import PortalLayout from './layouts/PortalLayout';

// Public Pages & Auth Feature
import Home from './pages/Home';
import LoginPage from './features/authentication/pages/LoginPage';
import SignupPage from './features/authentication/pages/SignupPage';

// Feature Modules
import DashboardPage from './features/dashboard/pages/DashboardPage';
import CustomersPage from './features/customers/pages/CustomersPage';
import LedgerPage from './features/ledger/pages/LedgerPage';
import TransactionsPage from './features/transactions/pages/TransactionsPage';
import ReportsPage from './features/reports/pages/ReportsPage';
import AnalyticsPage from './features/analytics/pages/AnalyticsPage';
import SettingsPage from './features/settings/pages/SettingsPage';
import ProfilePage from './features/profile/pages/ProfilePage';
import AuditLogsPage from './pages/portal/AuditLogsPage';
import NotificationsPage from './features/notifications/pages/NotificationsPage';
import UnauthorizedPage from './pages/portal/UnauthorizedPage';

// Error Pages
import NotFoundPage from './pages/error/NotFoundPage';
import ServerErrorPage from './pages/error/ServerErrorPage';
import ForbiddenPage from './pages/error/ForbiddenPage';
import OfflinePage from './pages/error/OfflinePage';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <NotificationProvider>
          <BrowserRouter>
          <Routes>
            {/* Public Website & Auth Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
            </Route>

            {/* Business Management Portal Protected Routes */}
            <Route
              path="/portal"
              element={
                <ProtectedRoute>
                  <PortalLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/portal/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="ledger" element={<LedgerPage />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="unauthorized" element={<UnauthorizedPage />} />

              {/* Admin Only Protected Routes */}
              <Route
                path="settings"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="audit-logs"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AuditLogsPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Explicit Error Routes */}
            <Route path="/500" element={<ServerErrorPage />} />
            <Route path="/403" element={<ForbiddenPage />} />
            <Route path="/offline" element={<OfflinePage />} />
            <Route path="/404" element={<NotFoundPage />} />

            {/* Fallback Catch-All Route */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
        </NotificationProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
