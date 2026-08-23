// =============================================================
// SHIVBAEMPIRE — App Router (With Collector, Event & Language Providers)
// =============================================================
import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { LanguageProvider } from './context/LanguageContext';
import { EventProvider } from './context/EventContext';
import { CollectorProvider } from './context/CollectorContext';
import AppLayout from './layouts/AppLayout';
import SplashScreen from './components/SplashScreen';

// Pages
import DashboardPage from './pages/DashboardPage';
import DonorsPage from './pages/DonorsPage';
import DonorDetailPage from './pages/DonorDetailPage';
import CollectionsPage from './pages/CollectionsPage';
import ReceiptsPage from './pages/ReceiptsPage';
import ExpensesPage from './pages/ExpensesPage';
import CollectorsPage from './pages/CollectorsPage';
import ReportsPage from './pages/ReportsPage';
import EventsPage from './pages/EventsPage';
import ActivityLogsPage from './pages/ActivityLogsPage';
import SettingsPage from './pages/SettingsPage';
import VerifyReceiptPage from './pages/VerifyReceiptPage';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <BrowserRouter>
      <LanguageProvider>
        <EventProvider>
          <CollectorProvider>
            <AuthProvider>
              <ToastProvider>
                {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
                <Routes>
                  {/* Public receipt verification route */}
                  <Route path="/verify-receipt/:receiptNumber" element={<VerifyReceiptPage />} />

                  {/* Direct App routes (No login required) */}
                  <Route path="/" element={<AppLayout />}>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="donors" element={<DonorsPage />} />
                    <Route path="donors/:id" element={<DonorDetailPage />} />
                    <Route path="collections" element={<CollectionsPage />} />
                    <Route path="receipts" element={<ReceiptsPage />} />
                    <Route path="expenses" element={<ExpensesPage />} />
                    <Route path="collectors" element={<CollectorsPage />} />
                    <Route path="events" element={<EventsPage />} />
                    <Route path="reports" element={<ReportsPage />} />
                    <Route path="activity-logs" element={<ActivityLogsPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                  </Route>

                  {/* Fallback to dashboard */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </ToastProvider>
            </AuthProvider>
          </CollectorProvider>
        </EventProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
