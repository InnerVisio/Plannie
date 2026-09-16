/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import ClientsPage from './pages/ClientsPage';
import MasterDashboard from './pages/MasterDashboard';
import CalendarHub from './pages/CalendarHub';
import AnalyticsHub from './pages/AnalyticsHub';
import ActivityPage from './pages/ActivityPage';
import CommentsInboxPage from './pages/CommentsInboxPage';
import ContentHub from './pages/ContentHub';
import SettingsPage from './pages/SettingsPage';
import ClientPortal from './pages/ClientPortal';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { ConfirmProvider } from './components/ui';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" />;
  return <>{children}</>;
};

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/client/:shareableLinkId" element={<ClientPortal />} />

                <Route
                  element={
                    <ProtectedRoute>
                      <AppShell />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/prehled" element={<MasterDashboard />} />
                  <Route path="/klienti" element={<ClientsPage />} />
                  <Route path="/kalendar" element={<CalendarHub />} />
                  <Route path="/kalendar/:clientId" element={<CalendarHub />} />
                  <Route path="/analytika" element={<AnalyticsHub />} />
                  <Route path="/obsah" element={<ContentHub />} />
                  <Route path="/komentare" element={<CommentsInboxPage />} />
                  <Route path="/aktivita" element={<ActivityPage />} />
                  <Route path="/nastaveni" element={<SettingsPage />} />
                </Route>

                <Route path="/master" element={<Navigate to="/prehled" replace />} />
                <Route path="/" element={<Navigate to="/prehled" replace />} />
                <Route path="*" element={<Navigate to="/prehled" replace />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
