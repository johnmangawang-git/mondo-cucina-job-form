import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import FormPage from './pages/FormPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import DebugPage from './pages/DebugPage';
import DashboardLayout from './components/ui/DashboardLayout';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import './styles/base.css';
import './styles/components.css';
import './styles/utilities.css';
import './styles/sidebar.css';

export default function App() {
    return (
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <div className="app">
                <PWAInstallPrompt />
                <Routes>
                    {/* Login page without dashboard layout */}
                    <Route path="/login" element={<LoginPage />} />
                    
                    {/* All other routes use dashboard layout */}
                    <Route path="/" element={<Navigate to="/admin" replace />} />
                    <Route path="/admin" element={
                        <DashboardLayout>
                            <AdminPage />
                        </DashboardLayout>
                    } />
                    <Route path="/form" element={
                        <DashboardLayout>
                            <FormPage />
                        </DashboardLayout>
                    } />
                    <Route path="/debug" element={
                        <DashboardLayout>
                            <DebugPage />
                        </DashboardLayout>
                    } />
                </Routes>
            </div>
        </Router>
    );
}