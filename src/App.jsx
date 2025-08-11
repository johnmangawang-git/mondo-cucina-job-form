import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import FormPage from './pages/FormPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import DebugPage from './pages/DebugPage';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import './styles/base.css';
import './styles/components.css';
import './styles/utilities.css';

export default function App() {
    return (
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <div className="app">
                <PWAInstallPrompt />
                <Routes>
                    <Route path="/" element={<Navigate to="/form" replace />} />
                    <Route path="/form" element={<FormPage />} />
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/debug" element={<DebugPage />} />
                </Routes>
            </div>
        </Router>
    );
}